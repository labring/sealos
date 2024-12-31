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

const (
	fillGapsInterval = 3600
)

func fillGaps(data []*model.HourlyChartData) []*model.HourlyChartData {
	if len(data) <= 1 {
		return data
	}

	result := make([]*model.HourlyChartData, 0, len(data))
	result = append(result, data[0])

	for i := 1; i < len(data); i++ {
		curr := data[i]
		prev := data[i-1]
		hourDiff := (curr.Timestamp - prev.Timestamp) / fillGapsInterval

		// If gap is 1 hour or less, continue
		if hourDiff <= 1 {
			result = append(result, curr)
			continue
		}

		// If gap is more than 3 hours, only add boundary points
		if hourDiff > 3 {
			// Add point for hour after prev
			result = append(result, &model.HourlyChartData{
				Timestamp: prev.Timestamp + fillGapsInterval,
			})
			// Add point for hour before curr
			result = append(result, &model.HourlyChartData{
				Timestamp: curr.Timestamp - fillGapsInterval,
			})
			result = append(result, curr)
			continue
		}

		// Fill gaps of 2-3 hours with zero points
		for j := prev.Timestamp + fillGapsInterval; j < curr.Timestamp; j += fillGapsInterval {
			result = append(result, &model.HourlyChartData{
				Timestamp: j,
			})
		}
		result = append(result, curr)
	}

	return result
}

func GetDashboard(c *gin.Context) {
	start, end := getDashboardStartEndTime(c.Query("type"))
	modelName := c.Query("model")
	dashboards, err := model.GetDashboardData(start, end, modelName)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	dashboards.ChartData = fillGaps(dashboards.ChartData)
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

	dashboards.ChartData = fillGaps(dashboards.ChartData)
	middleware.SuccessResponse(c, dashboards)
}
