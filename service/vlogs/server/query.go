package server

import (
	"fmt"
	"strings"

	"github.com/labring/sealos/service/pkg/api"
)

const (
	modeTrue  = "true"
	modeFalse = "false"
)

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
	fmt.Println(v.query)
	return v.query, nil
}

func EscapeSingleQuoted(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `'`, `\'`)
	return s
}

func (v *VLogsQuery) generatePodListQuery(req *api.VlogsRequest) string {
	var item string
	if len(req.Time) != 0 {
		item = fmt.Sprintf(
			`{namespace='%s'} _time:'%s' app:='%s' | Drop _stream_id,_stream,app,job,namespace,node`,
			EscapeSingleQuoted(req.Namespace),
			EscapeSingleQuoted(req.Time),
			EscapeSingleQuoted(req.App),
		)
	} else {
		item = fmt.Sprintf(`{namespace='%s'}  app:='%s' | Drop _stream_id,_stream,app,job,namespace,node`, EscapeSingleQuoted(req.Namespace), EscapeSingleQuoted(req.App))
	}
	v.query += item
	return v.query
}

func (v *VLogsQuery) generateKeywordQuery(req *api.VlogsRequest) {
	if len(req.Keyword) == 0 {
		return
	} else {
		v.query += fmt.Sprintf("'%s' ", EscapeSingleQuoted(req.Keyword))
	}
}

func (v *VLogsQuery) generateJSONQuery(req *api.VlogsRequest) error {
	if req.JSONMode != modeTrue {
		return nil
	}
	var builder strings.Builder
	builder.WriteString(" | unpack_json")
	if len(req.JSONQuery) > 0 {
		for _, jsonQuery := range req.JSONQuery {
			key := EscapeSingleQuoted(jsonQuery.Key)
			value := EscapeSingleQuoted(jsonQuery.Value)
			var item string
			switch jsonQuery.Mode {
			case "=":
				item = fmt.Sprintf("| '%s':='%s' ", key, value)
			case "!=":
				item = fmt.Sprintf("| '%s':(!='%s') ", key, value)
			case "~":
				item = fmt.Sprintf("| '%s':'%s' ", key, value)
			case "!~":
				item = fmt.Sprintf("| '%s':(!~'%s') ", key, value)
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
	namespace := EscapeSingleQuoted(req.Namespace)
	var builder strings.Builder
	switch {
	case len(req.Pod) == 0 && len(req.Container) == 0:
		// Generate query based only on namespace
		builder.WriteString(fmt.Sprintf(`{namespace='%s'}`, namespace))
	case len(req.Pod) == 0:
		// Generate query based on container
		for i, container := range req.Container {
			container := EscapeSingleQuoted(container)
			builder.WriteString(
				fmt.Sprintf(`{container='%s',namespace='%s'}`, container, namespace),
			)
			if i != len(req.Container)-1 {
				builder.WriteString(" OR ")
			}
		}
	case len(req.Container) == 0:
		// Generate query based on pod
		for i, pod := range req.Pod {
			pod := EscapeSingleQuoted(pod)
			builder.WriteString(fmt.Sprintf(`{pod='%s',namespace='%s'}`, pod, namespace))
			if i != len(req.Pod)-1 {
				builder.WriteString(" OR ")
			}
		}
	default:
		// Generate query based on both pod and container
		for i, container := range req.Container {
			for j, pod := range req.Pod {
				container := EscapeSingleQuoted(container)
				pod := EscapeSingleQuoted(pod)
				builder.WriteString(
					fmt.Sprintf(
						`{container='%s',namespace='%s',pod='%s'}`,
						container,
						namespace,
						pod,
					),
				)
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
	if len(req.Time) != 0 {
		item = fmt.Sprintf(
			`_time:'%s' app:='%s' `,
			EscapeSingleQuoted(req.Time),
			EscapeSingleQuoted(req.App),
		)
	} else {
		item = fmt.Sprintf(` app:='%s' `, EscapeSingleQuoted(req.App))
	}
	builder.WriteString(item)
	// if query stderr and number,using stderr first.
	if req.StderrMode == modeTrue {
		item := `| stream:="stderr" `
		builder.WriteString(item)
	}
	// if query number,dont use limit param
	if req.NumberMode == modeFalse {
		item := fmt.Sprintf(`  | limit %s  `, EscapeSingleQuoted(req.Limit))
		builder.WriteString(item)
	}
	v.query += builder.String()
}

func (v *VLogsQuery) generateDropQuery() {
	v.query += "| Drop _stream_id,_stream,app,job,namespace,node"
}

// allowedNumberLevels defines the set of valid NumberLevel values.
var allowedNumberLevels = map[string]struct{}{
	"m": {},
	"h": {},
	"d": {},
	"s": {},
}

func isValidNumberLevel(level string) bool {
	_, ok := allowedNumberLevels[level]
	return ok
}

func (v *VLogsQuery) generateNumberQuery(req *api.VlogsRequest) {
	if req.NumberMode == modeTrue {
		if isValidNumberLevel(req.NumberLevel) {
			item := fmt.Sprintf(
				" | stats by (_time:1%s) count() logs_total ",
				EscapeSingleQuoted(req.NumberLevel),
			)
			v.query += item
		}
		// else: invalid NumberLevel, do not add to query
	}
}
