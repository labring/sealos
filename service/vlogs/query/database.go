package query

import (
	"fmt"
	"strings"

	"github.com/labring/sealos/service/pkg/api"
)

type DBLogsQuery struct {
	query string
}

func (v *DBLogsQuery) GetDBQuery(req *api.DBLogsRequest) (string, error) {
	v.query = ""
	v.generateVolumeUIDQuery(req)
	v.generateKeywordQuery(req)
	v.generateContainerQuery(req)
	v.generateTypeQuery(req)
	v.generateCommonQuery(req)
	v.generateNumberQuery(req)
	v.generateSortQuery(req)
	return v.query, nil
}

func (v *DBLogsQuery) generateVolumeUIDQuery(req *api.DBLogsRequest) {
	if len(req.Pvc) == 0 {
		return
	}
	pvcPattern := strings.Join(req.Pvc, "|")
	v.query += fmt.Sprintf(`{volume_uid=~"%s"} `, pvcPattern)
}

func (v *DBLogsQuery) generateKeywordQuery(req *api.DBLogsRequest) {
	if req.Keyword != "" {
		v.query += fmt.Sprintf(`*%s* `, req.Keyword)
	}
}

func (v *DBLogsQuery) generateContainerQuery(req *api.DBLogsRequest) {
	if len(req.Container) == 0 {
		return
	}
	containerList := `"` + strings.Join(req.Container, `","`) + `"`
	v.query += fmt.Sprintf(`container:in(%s) `, containerList)
}

func (v *DBLogsQuery) generateTypeQuery(req *api.DBLogsRequest) {
	if len(req.Type) == 0 {
		return
	}
	containerList := `"` + strings.Join(req.Type, `","`) + `"`
	v.query += fmt.Sprintf(`log_type:in(%s) `, containerList)
}

func (v *DBLogsQuery) generateCommonQuery(req *api.DBLogsRequest) {
	var filters []string
	if req.Time != "" {
		filters = append(filters, fmt.Sprintf(`_time:%s`, req.Time))
	}
	if len(filters) > 0 {
		v.query += strings.Join(filters, " ")
	}
	if req.NumberMode != modeTrue {
		limit := req.Limit
		if limit == "" {
			limit = "100"
		}
		v.query += fmt.Sprintf(` | limit %s`, limit)
	}
}

func (v *DBLogsQuery) generateNumberQuery(req *api.DBLogsRequest) {
	if req.NumberMode == modeTrue {
		if isValidNumberLevel(req.NumberLevel) {
			v.query += fmt.Sprintf(` | stats by (_time:1%s) count() logs_total`, req.NumberLevel)
		}
	}
}

func (v *DBLogsQuery) generateSortQuery(req *api.DBLogsRequest) {
	if req.NumberMode != modeTrue {
		v.query += ` | sort by (_time) desc`
	}
}
