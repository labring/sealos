package collector

import (
	"context"
	"fmt"
	"log"
	"strings"

	"google.golang.org/grpc/credentials"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"

	pb "github.com/cilium/cilium/api/v1/flow"
	observer "github.com/cilium/cilium/api/v1/observer"
	"github.com/labring/sealos/service/hubble/datastore"
	"github.com/labring/sealos/service/hubble/pkg/constants"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// Collector handles the collection of network flow data from Hubble
type Collector struct {
	hubbleAddr string
	dataStore  *datastore.DataStore
	k8sClient  kubernetes.Interface
	tlsConfig  *TLSConfig
}

func NewCollector(hubbleAddr string, dataStore *datastore.DataStore, enableTLS bool) (*Collector, error) {
	var k8sClient kubernetes.Interface
	var tlsConfig *TLSConfig
	if enableTLS {
		config, err := rest.InClusterConfig()
		if err != nil {
			return nil, fmt.Errorf("failed to get in-cluster config: %v", err)
		}
		clientset, err := kubernetes.NewForConfig(config)
		if err != nil {
			return nil, fmt.Errorf("failed to create kubernetes client: %v", err)
		}
		k8sClient = clientset
		tlsConfig = NewDefaultTLSConfig()
	}

	return &Collector{
		hubbleAddr: hubbleAddr,
		dataStore:  dataStore,
		k8sClient:  k8sClient,
		tlsConfig:  tlsConfig,
	}, nil
}

type FlowEndpoints struct {
	SourceNamespace string
	SourceName      string
	SourceType      string
	DestNamespace   string
	DestName        string
	DestType        string
}

// Start begins collecting flow data from Hubble
func (c *Collector) Start(ctx context.Context) {
	log.Printf("Loaded hubble address: %s", c.hubbleAddr)
	var creds credentials.TransportCredentials
	if c.tlsConfig != nil && c.k8sClient != nil {
		tlsCreds, err := LoadTLSCredentials(ctx, c.k8sClient, c.tlsConfig)
		if err != nil {
			log.Fatalf("Failed to load TLS credentials: %v", err)
		}
		creds = tlsCreds
	} else {
		creds = insecure.NewCredentials()
	}
	conn, err := grpc.NewClient(
		c.hubbleAddr,
		grpc.WithTransportCredentials(creds),
	)
	if err != nil {
		log.Fatalf("Failed to connect to Hubble: %v", err)
	}
	client := observer.NewObserverClient(conn)
	req := &observer.GetFlowsRequest{
		Follow: true,
	}

	stream, err := client.GetFlows(ctx, req)
	if err != nil {
		conn.Close()
		log.Fatalf("Failed to get flow data: %v", err)
	}
	defer conn.Close()
	for {
		select {
		case <-ctx.Done():
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

			if err := c.updateFlowRelationships(ctx, flowEndpoint); err != nil {
				log.Printf("Error updating flow relationships: %v", err)
			}
		}
	}
}

var prefixToResourceType = map[string]string{
	constants.DBLabelPrefix:     constants.DatabaseType,
	constants.OSSLabelPrefix:    constants.OSSType,
	constants.AppLabelPrefix:    constants.AppType,
	constants.DevboxLabelPrefix: constants.DevboxType,
}

var prefixes = make([]string, 0, len(prefixToResourceType))

func init() {
	for prefix := range prefixToResourceType {
		prefixes = append(prefixes, prefix)
	}
}

func extractNameFromLabels(labels []string) (name, resourceType string, found bool) {
	for _, label := range labels {
		for _, prefix := range prefixes {
			if strings.HasPrefix(label, prefix) {
				return label[len(prefix):], prefixToResourceType[prefix], true
			}
		}
	}
	return "", "", false
}

func extractFlowEndpoints(flow *pb.Flow) (*FlowEndpoints, bool) {
	if flow.GetSource() == nil || flow.GetDestination() == nil {
		return nil, false
	}
	source := flow.GetSource()
	dest := flow.GetDestination()
	// Skip flows with missing namespace or pod information
	// This ensures we only process complete flow data
	if source.GetNamespace() == "" || source.GetPodName() == "" || dest.GetNamespace() == "" ||
		dest.GetPodName() == "" {
		return nil, false
	}

	// Filter flows to only include those with at least one user namespace
	// User namespaces are identified by the "ns-" prefix
	// This helps focus on user traffic and exclude system-to-system communications
	if !strings.HasPrefix(source.GetNamespace(), "ns-") &&
		!strings.HasPrefix(dest.GetNamespace(), "ns-") {
		return nil, false
	}

	if source.GetNamespace() == "kube-dns" || dest.GetNamespace() == "kube-dns" {
		return nil, false
	}

	srcName, srcType, srcFound := extractNameFromLabels(source.GetLabels())
	if !srcFound {
		return nil, false
	}

	dstName, dstType, dstFound := extractNameFromLabels(dest.GetLabels())
	if !dstFound {
		return nil, false
	}

	return &FlowEndpoints{
		SourceNamespace: source.GetNamespace(),
		SourceName:      srcName,
		SourceType:      srcType,
		DestNamespace:   dest.GetNamespace(),
		DestName:        dstName,
		DestType:        dstType,
	}, true
}

func (c *Collector) updateFlowRelationships(
	ctx context.Context,
	flowEndpoint *FlowEndpoints,
) error {
	srcKey := fmt.Sprintf(
		"%s/%s/%s",
		flowEndpoint.SourceNamespace,
		flowEndpoint.SourceType,
		flowEndpoint.SourceName,
	)
	dstKey := fmt.Sprintf(
		"%s/%s/%s",
		flowEndpoint.DestNamespace,
		flowEndpoint.DestType,
		flowEndpoint.DestName,
	)
	// Filter out self-loop traffic (when source and destination are identical)
	// This typically represents internal pod communications within the same CR
	if srcKey == dstKey {
		return nil
	}
	if err := c.dataStore.AddToSet(ctx, srcKey, dstKey); err != nil {
		return fmt.Errorf("failed to update source-to-destination set: %w", err)
	}
	return nil
}
