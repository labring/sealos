package collector

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/labring/sealos/service/hubble/datastore"

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

			srcNs, srcPod, dstNs, dstPod, ok := extractFlowEndpoints(flow)
			if !ok {
				continue
			}

			timestamp := time.Now()
			if flow.GetTime() != nil {
				timestamp = flow.GetTime().AsTime()
			}

			if err := c.updateFlowRelationships(srcNs, srcPod, dstNs, dstPod, timestamp); err != nil {
				log.Printf("Error updating flow relationships: %v", err)
			}
		}
	}
}

func (c *Collector) Stop() {
	c.cancel()
}

func extractFlowEndpoints(flow *pb.Flow) (string, string, string, string, bool) {
	if flow.GetSource() == nil || flow.GetDestination() == nil {
		return "", "", "", "", false
	}

	srcNs := flow.GetSource().GetNamespace()
	srcPod := flow.GetSource().GetPodName()
	dstNs := flow.GetDestination().GetNamespace()
	dstPod := flow.GetDestination().GetPodName()

	if srcNs == "" || srcPod == "" || dstNs == "" || dstPod == "" {
		return "", "", "", "", false
	}

	if !strings.HasPrefix(srcNs, "ns-") || !strings.HasPrefix(dstNs, "ns-") {
		return "", "", "", "", false
	}

	return srcNs, srcPod, dstNs, dstPod, true
}

func (c *Collector) updateFlowRelationships(srcNs, srcPod, dstNs, dstPod string, timestamp time.Time) error {
	srcToKey := fmt.Sprintf("%s-%s-to", srcNs, srcPod)
	dstFromKey := fmt.Sprintf("%s-%s-from", dstNs, dstPod)
	connectionKey := fmt.Sprintf("%s-%s-%s-%s", srcNs, srcPod, dstNs, dstPod)
	dstValue := fmt.Sprintf("%s-%s", dstNs, dstPod)
	srcValue := fmt.Sprintf("%s-%s", srcNs, srcPod)
	timeValue := timestamp.Format(time.RFC3339)

	if err := c.dataStore.AddToSet(srcToKey, dstValue); err != nil {
		return fmt.Errorf("failed to update source-to-destination set: %w", err)
	}

	if err := c.dataStore.AddToSet(dstFromKey, srcValue); err != nil {
		return fmt.Errorf("failed to update destination-from-source set: %w", err)
	}

	if err := c.dataStore.Set(connectionKey, timeValue); err != nil {
		return fmt.Errorf("failed to set connection timestamp: %w", err)
	}

	return nil
}
