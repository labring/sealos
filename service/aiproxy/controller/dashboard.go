package controller

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
)

func GetGroupDashboard(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		middleware.ErrorResponse(c, http.StatusOK, "invalid parameter")
		return
	}

	end := time.Now()
	var start time.Time
	switch c.Query("type") {
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
	tokenName := c.Query("token_name")
	modelName := c.Query("model")

	dashboards, err := model.GetDashboardData(id, start, end, tokenName, modelName)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, "failed to get statistics")
		return
	}
	middleware.SuccessResponse(c, dashboards)
}
