package server

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/protobuf/types/known/timestamppb"
	"io"
	"log"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/labring/sealos/service/pkg/api"
	"github.com/labring/sealos/service/pkg/auth"
	"github.com/labring/sealos/service/vlogs/request"

	pb "github.com/cilium/cilium/api/v1/flow"
	observer "github.com/cilium/cilium/api/v1/observer"
)

type VLogsServer struct {
	path           string
	username       string
	password       string
	observerClient observer.ObserverClient
	grpcConn       *grpc.ClientConn
}

const modeTrue = "true"
const modeFalse = "false"

func NewVLogsServer(config *Config) (*VLogsServer, error) {
	vl := &VLogsServer{
		path:     config.Server.Path,
		username: config.Server.Username,
		password: config.Server.Password,
	}
	err := vl.initGrpcClient()
	if err != nil {
		return nil, err
	}
	return vl, nil
}

func (vl *VLogsServer) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	query, err := vl.queryConvert(req)
	if err != nil {
		http.Error(rw, fmt.Sprintf("query %s error: %s", req.URL.Path, err), http.StatusInternalServerError)
		return
	}
	err = query(rw, req)
	if err != nil {
		http.Error(rw, fmt.Sprintf("query %s error: %s", req.URL.Path, err), http.StatusInternalServerError)
		slog.Error("%s error: %s", req.URL.Path, err)
		return
	}
}

func (vl *VLogsServer) queryConvert(req *http.Request) (func(rw http.ResponseWriter, req *http.Request) error, error) {
	switch req.URL.Path {
	case "/queryLogsByParams":
		return vl.queryLogsByParams, nil
	case "/queryPodList":
		return vl.queryPodList, nil
	case "/queryFlows":
		return vl.queryFlows, nil
	default:
		return nil, fmt.Errorf("unknown url path")
	}
}

func (vl *VLogsServer) authenticate(req *http.Request) (string, error) {
	kubeConfig, namespace, query, err := vl.generateParamsRequest(req)
	if err != nil {
		return "", fmt.Errorf("bad request (%s)", err)
	}

	err = auth.Authenticate(namespace, kubeConfig)
	if err != nil {
		return "", fmt.Errorf("authentication failed (%s)", err)
	}
	return query, nil
}

func (vl *VLogsServer) queryLogsByParams(rw http.ResponseWriter, req *http.Request) error {
	query, err := vl.authenticate(req)
	if err != nil {
		return err
	}
	resp, err := request.QueryLogsByParams(vl.path, vl.username, vl.password, query)
	if err != nil {
		return fmt.Errorf("query failed (%s)", err)
	}
	defer resp.Body.Close()
	_, err = io.Copy(rw, resp.Body)
	if err != nil {
		return err
	}
	return nil
}

func (vl *VLogsServer) queryPodList(rw http.ResponseWriter, req *http.Request) error {
	query, err := vl.authenticate(req)
	if err != nil {
		return err
	}
	resp, err := request.QueryLogsByParams(vl.path, vl.username, vl.password, query)
	if err != nil {
		return fmt.Errorf("query failed (%s)", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %v", err)
	}
	if len(body) == 0 {
		return fmt.Errorf("response body is empty")
	}

	scanner := bufio.NewScanner(strings.NewReader(string(body)))
	var logs []api.VlogsResponse

	for scanner.Scan() {
		var entry api.VlogsResponse
		line := scanner.Text()
		err := json.Unmarshal([]byte(line), &entry)
		if err != nil {
			continue
		}
		logs = append(logs, entry)
	}

	uniquePods := make(map[string]struct{})
	for _, log := range logs {
		uniquePods[log.Pod] = struct{}{}
	}
	var podList []string
	for pod := range uniquePods {
		podList = append(podList, pod)
	}

	rw.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(rw).Encode(podList); err != nil {
		return fmt.Errorf("failed to write response: %v", err)
	}
	return nil
}

func (vl *VLogsServer) generateParamsRequest(req *http.Request) (string, string, string, error) {
	kubeConfig := req.Header.Get("Authorization")
	if config, err := url.PathUnescape(kubeConfig); err == nil {
		kubeConfig = config
	} else {
		return "", "", "", fmt.Errorf("failed to PathUnescape : %s", err)
	}
	var query string
	vlogsReq := &api.VlogsRequest{}
	err := json.NewDecoder(req.Body).Decode(&vlogsReq)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to parse request body: %s", err)
	}
	if vlogsReq.Namespace == "" {
		return "", "", "", fmt.Errorf("failed to get namespace")
	}
	var vlogs VLogsQuery
	query, err = vlogs.getQuery(vlogsReq)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to parse request body: %s", err)
	}
	return kubeConfig, vlogsReq.Namespace, query, nil
}

type VLogsQuery struct {
	query string
}

func (v *VLogsQuery) getQuery(req *api.VlogsRequest) (string, error) {
	if req.PodQuery == modeTrue {
		query := v.generatePodListQuery(req)
		return query, nil
	}
	v.generateKeywordQuery(req)
	v.generateStreamQuery(req)
	v.generateCommonQuery(req)
	err := v.generateJSONQuery(req)
	if err != nil {
		return "", err
	}
	v.generateStdQuery(req)
	v.generateDropQuery()
	v.generateNumberQuery(req)
	return v.query, nil
}

func (v *VLogsQuery) generatePodListQuery(req *api.VlogsRequest) string {
	var builder strings.Builder
	item := fmt.Sprintf(`{namespace="%s"} _time:%s app:="%s" | Drop _stream_id,_stream,app,job,namespace,node`, req.Namespace, req.Time, req.App)
	builder.WriteString(item)
	v.query += builder.String()
	return v.query
}

func (v *VLogsQuery) generateKeywordQuery(req *api.VlogsRequest) {
	var builder strings.Builder
	builder.WriteString(req.Keyword)
	builder.WriteString(" ")
	v.query += builder.String()
}

func (v *VLogsQuery) generateJSONQuery(req *api.VlogsRequest) error {
	if req.JSONMode != modeTrue {
		return nil
	}
	var builder strings.Builder
	builder.WriteString(" | unpack_json")
	if len(req.JSONQuery) > 0 {
		for _, jsonQuery := range req.JSONQuery {
			var item string
			switch jsonQuery.Mode {
			case "=":
				item = fmt.Sprintf("| %s:=%s ", jsonQuery.Key, jsonQuery.Value)
			case "!=":
				item = fmt.Sprintf("| %s:(!=%s) ", jsonQuery.Key, jsonQuery.Value)
			case "~":
				item = fmt.Sprintf("| %s:%s ", jsonQuery.Key, jsonQuery.Value)
			case "!~":
				item = fmt.Sprintf("| %s:(!~%s) ", jsonQuery.Key, jsonQuery.Value)
			default:
				return fmt.Errorf("invalid JSON query mode: %s", jsonQuery.Mode)
			}
			builder.WriteString(item)
		}
	}
	v.query += builder.String()
	return nil
}

func (v *VLogsQuery) generateStreamQuery(req *api.VlogsRequest) {
	var builder strings.Builder

	if len(req.Pod) == 0 && len(req.Container) == 0 {
		// Generate query based only on namespace
		builder.WriteString(fmt.Sprintf(`{namespace="%s"}`, req.Namespace))
	} else if len(req.Pod) == 0 {
		// Generate query based on container
		for i, container := range req.Container {
			builder.WriteString(fmt.Sprintf(`{container="%s",namespace="%s"}`, container, req.Namespace))
			if i != len(req.Container)-1 {
				builder.WriteString(" OR ")
			}
		}
	} else if len(req.Container) == 0 {
		// Generate query based on pod
		for i, pod := range req.Pod {
			builder.WriteString(fmt.Sprintf(`{pod="%s",namespace="%s"}`, pod, req.Namespace))
			if i != len(req.Pod)-1 {
				builder.WriteString(" OR ")
			}
		}
	} else {
		// Generate query based on both pod and container
		for i, container := range req.Container {
			for j, pod := range req.Pod {
				builder.WriteString(fmt.Sprintf(`{container="%s",namespace="%s",pod="%s"}`, container, req.Namespace, pod))
				if i != len(req.Container)-1 || j != len(req.Pod)-1 {
					builder.WriteString(" OR ")
				}
			}
		}
	}
	v.query += builder.String()
}

func (v *VLogsQuery) generateStdQuery(req *api.VlogsRequest) {
	var builder strings.Builder
	if req.StderrMode == modeTrue {
		item := `| stream:="stderr" `
		builder.WriteString(item)
	}
	v.query += builder.String()
}

func (v *VLogsQuery) generateCommonQuery(req *api.VlogsRequest) {
	var builder strings.Builder
	item := fmt.Sprintf(`_time:%s app:="%s" `, req.Time, req.App)
	builder.WriteString(item)
	// if query number,dont use limit param
	if req.NumberMode == modeFalse {
		item := fmt.Sprintf(`  | limit %s  `, req.Limit)
		builder.WriteString(item)
	}
	v.query += builder.String()
}

func (v *VLogsQuery) generateDropQuery() {
	var builder strings.Builder
	builder.WriteString("| Drop _stream_id,_stream,app,job,namespace,node")
	v.query += builder.String()
}

func (v *VLogsQuery) generateNumberQuery(req *api.VlogsRequest) {
	var builder strings.Builder
	if req.NumberMode == modeTrue {
		item := fmt.Sprintf(" | stats by (_time:1%s) count() logs_total ", req.NumberLevel)
		builder.WriteString(item)
		v.query += builder.String()
	}
}

func (vl *VLogsServer) queryFlows(rw http.ResponseWriter, req *http.Request) error {
	rw.Header().Set("Content-Type", "application/json")
	if req.Method != http.MethodGet {
		http.Error(rw, "Only GET requests are supported", http.StatusMethodNotAllowed)
		return fmt.Errorf("Unsupported HTTP method: %s", req.Method)
	}
	sourcePod := req.URL.Query().Get("source")
	destPod := req.URL.Query().Get("dest")
	destPortStr := req.URL.Query().Get("port")
	limitStr := req.URL.Query().Get("limit")
	minutesAgoStr := req.URL.Query().Get("min")

	if sourcePod == "" || destPod == "" || destPortStr == "" {
		http.Error(rw, "Missing required parameters: source_pod, dest_pod, dest_port", http.StatusBadRequest)
		return fmt.Errorf("Missing required parameters")
	}

	limit := uint64(100)
	if limitStr != "" {
		parsedLimit, err := strconv.ParseUint(limitStr, 10, 64)
		if err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	minutesAgo := int64(10)
	if minutesAgoStr != "" {
		parsedMinutes, err := strconv.ParseInt(minutesAgoStr, 10, 64)
		if err == nil && parsedMinutes > 0 {
			minutesAgo = parsedMinutes
		}
	}

	if vl.observerClient == nil {
		if err := vl.initGrpcClient(); err != nil {
			http.Error(rw, fmt.Sprintf("Hubble client not initialized: %v", err), http.StatusInternalServerError)
			return err
		}
	}

	since := time.Now().Add(-time.Duration(minutesAgo) * time.Minute)
	sinceProto := timestamppb.New(since)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	flowsRequest := &observer.GetFlowsRequest{
		Number: limit,
		First:  false,
		Follow: false,
		Since:  sinceProto,
		Whitelist: []*pb.FlowFilter{
			{
				SourcePod:       []string{sourcePod},
				DestinationPod:  []string{destPod},
				DestinationPort: []string{destPortStr},
			},
		},
	}

	stream, err := vl.observerClient.GetFlows(ctx, flowsRequest)
	if err != nil {
		http.Error(rw, fmt.Sprintf("Failed to call GetFlows: %v", err), http.StatusInternalServerError)
		return err
	}

	var flows []SimplifiedFlow
	for {
		resp, err := stream.Recv()
		if err == io.EOF {
			break
		}
		if err != nil {
			http.Error(rw, fmt.Sprintf("Error receiving stream data: %v", err), http.StatusInternalServerError)
			return err
		}

		if resp.GetFlow() != nil {
			flow := resp.GetFlow()
			protocol := "UNKNOWN"
			var srcPort, dstPort uint32

			if flow.GetL4() != nil {
				if flow.GetL4().GetTCP() != nil {
					protocol = "TCP"
					srcPort = flow.GetL4().GetTCP().GetSourcePort()
					dstPort = flow.GetL4().GetTCP().GetDestinationPort()
				} else if flow.GetL4().GetUDP() != nil {
					protocol = "UDP"
					srcPort = flow.GetL4().GetUDP().GetSourcePort()
					dstPort = flow.GetL4().GetUDP().GetDestinationPort()
				}
			}

			simplifiedFlow := SimplifiedFlow{
				Time:      resp.GetTime().AsTime().Format(time.RFC3339),
				SourcePod: flow.GetSource().GetPodName(),
				DestPod:   flow.GetDestination().GetPodName(),
				SrcPort:   srcPort,
				DstPort:   dstPort,
				Protocol:  protocol,
				Verdict:   flow.GetVerdict().String(),
			}
			flows = append(flows, simplifiedFlow)
		}
	}

	jsonResponse, err := json.Marshal(map[string]interface{}{
		"flows": flows,
		"count": len(flows),
		"query_params": map[string]interface{}{
			"source_pod":  sourcePod,
			"dest_pod":    destPod,
			"dest_port":   destPortStr,
			"limit":       limit,
			"minutes_ago": minutesAgo,
			"since":       since.Format(time.RFC3339),
		},
	})

	if err != nil {
		http.Error(rw, fmt.Sprintf("Unable to generate JSON response: %v", err), http.StatusInternalServerError)
		return err
	}

	rw.Write(jsonResponse)
	return nil
}

func (vl *VLogsServer) initGrpcClient() error {
	conn, err := grpc.Dial("hubble-relay.kube-system.svc.cluster.local:80", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return fmt.Errorf("Failed to connect to Hubble: %v", err)
	}
	vl.grpcConn = conn
	vl.observerClient = observer.NewObserverClient(conn)
	log.Println("Connected to Hubble service")
	return nil
}

type SimplifiedFlow struct {
	Time      string `json:"time"`
	SourcePod string `json:"source_pod"`
	DestPod   string `json:"destination_pod"`
	SrcPort   uint32 `json:"source_port,omitempty"`
	DstPort   uint32 `json:"destination_port,omitempty"`
	Protocol  string `json:"protocol,omitempty"`
	Verdict   string `json:"verdict,omitempty"`
}
