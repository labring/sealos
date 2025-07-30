package collector

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/labring/sealos/service/hubble/datastore"
	"github.com/labring/sealos/service/hubble/pkg/constants"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "github.com/cilium/cilium/api/v1/flow"
	observer "github.com/cilium/cilium/api/v1/observer"
)

// Collector handles the collection of network flow data from Hubble
type Collector struct {
	hubbleAddr string
	dataStore  *datastore.DataStore
	ctx        context.Context
	cancel     context.CancelFunc
}

func NewCollector(hubbleAddr string, dataStore *datastore.DataStore) *Collector {
	ctx, cancel := context.WithCancel(context.Background())
	return &Collector{
		hubbleAddr: hubbleAddr,
		dataStore:  dataStore,
		ctx:        ctx,
		cancel:     cancel,
	}
}

type FlowEndpoints struct {
	SourceNamespace string
	SourceName      string
	DestNamespace   string
	DestName        string
}

// Start begins collecting flow data from Hubble
func (c *Collector) Start() {
	log.Printf("Loaded hubble address: %s", c.hubbleAddr)
	conn, err := grpc.NewClient(
		c.hubbleAddr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		log.Fatalf("Failed to connect to Hubble: %v", err)
	}
	defer conn.Close()

	client := observer.NewObserverClient(conn)

	req := &observer.GetFlowsRequest{
		Follow: true,
	}

	stream, err := client.GetFlows(c.ctx, req)
	if err != nil {
		log.Fatalf("Failed to get flow data: %v", err)
	}

	for {
		select {
		case <-c.ctx.Done():
			return
		default:
			resp, err := stream.Recv()
			if err != nil {
				log.Printf("Stream closed or error occurred: %v", err)
				return
			}

			flow := resp.GetFlow()
			if flow == nil {
				continue
			}

			flowEndpoint, ok := extractFlowEndpoints(flow)
			if !ok {
				continue
			}

			if err := c.updateFlowRelationships(flowEndpoint); err != nil {
				log.Printf("Error updating flow relationships: %v", err)
			}
		}
	}
}

func (c *Collector) Stop() {
	c.cancel()
}

func extractNameFromLabels(labels []string) (string, bool) {
	prefixes := []string{constants.DBLabelPrefix, constants.OSSLabelPrefix, constants.AppLabelPrefix, constants.DevboxLabelPrefix}
	for _, label := range labels {
		for _, prefix := range prefixes {
			if strings.HasPrefix(label, prefix) {
				return label[len(prefix):], true
			}
		}
	}
	return "", false
}

func extractFlowEndpoints(flow *pb.Flow) (*FlowEndpoints, bool) {
	if flow.GetSource() == nil || flow.GetDestination() == nil {
		return nil, false
	}

	srcNs := flow.GetSource().GetNamespace()
	srcLabels := flow.GetSource().GetLabels()
	srcPod := flow.GetSource().GetPodName()
	dstNs := flow.GetDestination().GetNamespace()
	dstPod := flow.GetDestination().GetPodName()
	dstLabels := flow.GetDestination().GetLabels()

	// Skip flows with missing namespace or pod information
	// This ensures we only process complete flow data
	if srcNs == "" || srcPod == "" || dstNs == "" || dstPod == "" {
		return nil, false
	}

	// Filter flows to only include those with at least one user namespace
	// User namespaces are identified by the "ns-" prefix
	// This helps focus on user traffic and exclude system-to-system communications
	if !strings.HasPrefix(srcNs, "ns-") && !strings.HasPrefix(dstNs, "ns-") {
		return nil, false
	}

	srcName, srcFound := extractNameFromLabels(srcLabels)
	if !srcFound {
		return nil, false
	}

	dstName, dstFound := extractNameFromLabels(dstLabels)
	if !dstFound {
		return nil, false
	}

	return &FlowEndpoints{
		SourceNamespace: srcNs,
		SourceName:      srcName,
		DestNamespace:   dstNs,
		DestName:        dstName,
	}, true
}

func (c *Collector) updateFlowRelationships(flowEndpoint *FlowEndpoints) error {
	srcKey := fmt.Sprintf("%s/%s", flowEndpoint.SourceNamespace, flowEndpoint.SourceName)
	dstKey := fmt.Sprintf("%s/%s", flowEndpoint.DestNamespace, flowEndpoint.DestName)
	// Filter out self-loop traffic (when source and destination are identical)
	// This typically represents internal pod communications within the same CR
	if srcKey == dstKey {
		return nil
	}
	if err := c.dataStore.AddToSet(srcKey, dstKey); err != nil {
		return fmt.Errorf("failed to update source-to-destination set: %w", err)
	}
	return nil
}
