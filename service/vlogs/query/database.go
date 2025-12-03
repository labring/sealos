package query

import (
	"fmt"
	"strings"

	"github.com/labring/sealos/service/pkg/api"
)

type DBLogsQuery struct {
	query string
}

func (v *DBLogsQuery) GetDBQuery(req *api.VlogsDatabaseRequest) (string, error) {
	v.query = ""
	v.generateVolumeUIDQuery(req)
	v.generateKeywordQuery(req)
	v.generateContainerQuery(req)
	v.generateTypeQuery(req)
	v.generateCommonQuery(req)
	v.generateNumberQuery(req)
	v.generateSortQuery(req)
	fmt.Printf("database query: %s\n", v.query)
	return v.query, nil
}

func (v *DBLogsQuery) generateVolumeUIDQuery(req *api.VlogsDatabaseRequest) {
	if len(req.Pvc) == 0 {
		return
	}
	pvcPattern := strings.Join(req.Pvc, "|")
	v.query += fmt.Sprintf(`{volume_uid=~'%s'} `, EscapeSingleQuoted(pvcPattern))
}

func (v *DBLogsQuery) generateKeywordQuery(req *api.VlogsDatabaseRequest) {
	if req.Keyword != "" {
		v.query += fmt.Sprintf(`*%s* `, EscapeSingleQuoted(req.Keyword))
	}
}

func (v *DBLogsQuery) generateContainerQuery(req *api.VlogsDatabaseRequest) {
	if len(req.Container) == 0 {
		return
	}
	escapedContainers := make([]string, 0, len(req.Container))
	for _, container := range req.Container {
		escaped := EscapeSingleQuoted(container)
		escapedContainers = append(escapedContainers, "'"+escaped+"'")
	}
	containerList := strings.Join(escapedContainers, ",")
	v.query += fmt.Sprintf(`container:in(%s) `, containerList)
}

func (v *DBLogsQuery) generateTypeQuery(req *api.VlogsDatabaseRequest) {
	if len(req.Type) == 0 {
		return
	}
	escapedTypes := make([]string, 0, len(req.Type))
	for _, logType := range req.Type {
		escaped := EscapeSingleQuoted(logType)
		escapedTypes = append(escapedTypes, "'"+escaped+"'")
	}
	typeList := strings.Join(escapedTypes, ",")
	v.query += fmt.Sprintf(`log_type:in(%s) `, typeList)
}

func (v *DBLogsQuery) generateCommonQuery(req *api.VlogsDatabaseRequest) {
	var filters []string
	if req.Time != "" {
		filters = append(filters, "_time:"+EscapeSingleQuoted(req.Time))
	}
	if len(filters) > 0 {
		v.query += strings.Join(filters, " ")
	}
	if req.NumberMode != modeTrue {
		limit := req.Limit
		if limit == "" {
			limit = "100"
		}
		v.query += " | limit " + EscapeSingleQuoted(limit)
	}
}

func (v *DBLogsQuery) generateNumberQuery(req *api.VlogsDatabaseRequest) {
	if req.NumberMode == modeTrue {
		if isValidNumberLevel(req.NumberLevel) {
			v.query += fmt.Sprintf(
				` | stats by (_time:1%s) count() logs_total`,
				EscapeSingleQuoted(req.NumberLevel),
			)
		}
	}
}

func (v *DBLogsQuery) generateSortQuery(req *api.VlogsDatabaseRequest) {
	if req.NumberMode != modeTrue {
		v.query += ` | sort by (_time) desc`
	}
}
