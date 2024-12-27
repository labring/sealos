package controller

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
)

func getDashboardStartEndTime(t string) (time.Time, time.Time) {
	end := time.Now()
	var start time.Time
	switch t {
	case "month":
		start = end.AddDate(0, 0, -30)
	case "two_week":
		start = end.AddDate(0, 0, -15)
	case "week":
		start = end.AddDate(0, 0, -7)
	case "day":
		fallthrough
	default:
		start = end.AddDate(0, 0, -1)
	}
	return start, end
}

func GetDashboard(c *gin.Context) {
	start, end := getDashboardStartEndTime(c.Query("type"))
	modelName := c.Query("model")
	dashboards, err := model.GetDashboardData(start, end, modelName)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, dashboards)
}

func GetGroupDashboard(c *gin.Context) {
	group := c.Param("group")
	if group == "" {
		middleware.ErrorResponse(c, http.StatusOK, "invalid parameter")
		return
	}

	start, end := getDashboardStartEndTime(c.Query("type"))
	tokenName := c.Query("token_name")
	modelName := c.Query("model")

	dashboards, err := model.GetGroupDashboardData(group, start, end, tokenName, modelName)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, "failed to get statistics")
		return
	}
	middleware.SuccessResponse(c, dashboards)
}
