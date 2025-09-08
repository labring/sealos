package server

import (
	"fmt"
	"github.com/labring/sealos/service/pkg/api"
	"strings"
)

const modeTrue = "true"
const modeFalse = "false"

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

func (v *VLogsQuery) generateCommonQuery(req *api.VlogsRequest) {
	var builder strings.Builder
	var item string
	if req.Time != "" {
		item = fmt.Sprintf(`_time:%s app:="%s" `, req.Time, req.App)
	} else {
		item = fmt.Sprintf(`app:="%s" `, req.App)
	}
	builder.WriteString(item)
	// if query stderr and number,using stderr first.
	if req.StderrMode == modeTrue {
		item := `| stream:="stderr" `
		builder.WriteString(item)
	}
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
