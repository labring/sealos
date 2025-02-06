package server

import (
	"encoding/json"
	"fmt"

	"github.com/labring/sealos/service/pkg/api"
	"github.com/labring/sealos/service/pkg/auth"
	"github.com/labring/sealos/service/vlogs/request"

	"log"
	"net/http"
	"net/url"
	"strings"
)

type VLogsServer struct {
	path     string
	username string
	password string
}

const modeTrue = "true"
const modeFalse = "false"

func NewVLogsServer(config *Config) (*VLogsServer, error) {
	vl := &VLogsServer{
		path:     config.Server.Path,
		username: config.Server.Username,
		password: config.Server.Password,
	}
	return vl, nil
}

func (vl *VLogsServer) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	if req.URL.Path == "/queryLogsByParams" {
		err := vl.queryLogsByParams(rw, req)
		if err != nil {
			http.Error(rw, fmt.Sprintf("query logs error: %s", err), http.StatusInternalServerError)
			log.Printf("query logs error: %s", err)
		}
		return
	}
	http.Error(rw, "Not found", http.StatusNotFound)
}

func (vl *VLogsServer) queryLogsByParams(rw http.ResponseWriter, req *http.Request) error {
	kubeConfig, namespace, query, err := vl.generateParamsRequest(req)
	if err != nil {
		return fmt.Errorf("bad request (%s)", err)
	}

	err = auth.Authenticate(namespace, kubeConfig)
	if err != nil {
		return fmt.Errorf("authentication failed (%s)", err)
	}

	err = request.QueryLogsByParams(vl.path, vl.username, vl.password, query, rw)
	if err != nil {
		return fmt.Errorf("query failed (%s)", err)
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
