package controller

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/rpmlimit"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
)

func getDashboardTime(t string) (time.Time, time.Time, model.TimeSpanType) {
	end := time.Now()
	var start time.Time
	var timeSpan model.TimeSpanType
	switch t {
	case "month":
		start = end.AddDate(0, 0, -30)
		timeSpan = model.TimeSpanDay
	case "two_week":
		start = end.AddDate(0, 0, -15)
		timeSpan = model.TimeSpanDay
	case "week":
		start = end.AddDate(0, 0, -7)
		timeSpan = model.TimeSpanDay
	case "day":
		fallthrough
	default:
		start = end.AddDate(0, 0, -1)
		timeSpan = model.TimeSpanHour
	}
	return start, end, timeSpan
}

func fillGaps(data []*model.ChartData, start, end time.Time, t model.TimeSpanType) []*model.ChartData {
	if len(data) == 0 {
		return data
	}

	var timeSpan time.Duration
	switch t {
	case model.TimeSpanDay:
		timeSpan = time.Hour * 24
	default:
		timeSpan = time.Hour
	}

	// Handle first point
	firstPoint := time.Unix(data[0].Timestamp, 0)
	firstAlignedTime := firstPoint
	for !firstAlignedTime.Add(-timeSpan).Before(start) {
		firstAlignedTime = firstAlignedTime.Add(-timeSpan)
	}
	var firstIsZero bool
	if !firstAlignedTime.Equal(firstPoint) {
		data = append([]*model.ChartData{
			{
				Timestamp: firstAlignedTime.Unix(),
			},
		}, data...)
		firstIsZero = true
	}

	// Handle last point
	lastPoint := time.Unix(data[len(data)-1].Timestamp, 0)
	lastAlignedTime := lastPoint
	for !lastAlignedTime.Add(timeSpan).After(end) {
		lastAlignedTime = lastAlignedTime.Add(timeSpan)
	}
	var lastIsZero bool
	if !lastAlignedTime.Equal(lastPoint) {
		data = append(data, &model.ChartData{
			Timestamp: lastAlignedTime.Unix(),
		})
		lastIsZero = true
	}

	result := make([]*model.ChartData, 0, len(data))
	result = append(result, data[0])

	for i := 1; i < len(data); i++ {
		curr := data[i]
		prev := data[i-1]
		hourDiff := (curr.Timestamp - prev.Timestamp) / int64(timeSpan.Seconds())

		// If gap is 1 hour or less, continue
		if hourDiff <= 1 {
			result = append(result, curr)
			continue
		}

		// If gap is more than 3 hours, only add boundary points
		if hourDiff > 3 {
			// Add point for hour after prev
			if i != 1 || (i == 1 && !firstIsZero) {
				result = append(result, &model.ChartData{
					Timestamp: prev.Timestamp + int64(timeSpan.Seconds()),
				})
			}
			// Add point for hour before curr
			if i != len(data)-1 || (i == len(data)-1 && !lastIsZero) {
				result = append(result, &model.ChartData{
					Timestamp: curr.Timestamp - int64(timeSpan.Seconds()),
				})
			}
			result = append(result, curr)
			continue
		}

		// Fill gaps of 2-3 hours with zero points
		for j := prev.Timestamp + int64(timeSpan.Seconds()); j < curr.Timestamp; j += int64(timeSpan.Seconds()) {
			result = append(result, &model.ChartData{
				Timestamp: j,
			})
		}
		result = append(result, curr)
	}

	return result
}

func GetDashboard(c *gin.Context) {
	log := middleware.GetLogger(c)

	start, end, timeSpan := getDashboardTime(c.Query("type"))
	modelName := c.Query("model")

	dashboards, err := model.GetDashboardData(start, end, modelName, timeSpan)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	dashboards.ChartData = fillGaps(dashboards.ChartData, start, end, timeSpan)

	if common.RedisEnabled {
		rpm, err := rpmlimit.GetRPM(c.Request.Context(), "", modelName)
		if err != nil {
			log.Errorf("failed to get rpm: %v", err)
		} else {
			dashboards.RPM = rpm
		}
	}

	middleware.SuccessResponse(c, dashboards)
}

func GetGroupDashboard(c *gin.Context) {
	log := middleware.GetLogger(c)

	group := c.Param("group")
	if group == "" {
		middleware.ErrorResponse(c, http.StatusOK, "invalid parameter")
		return
	}

	start, end, timeSpan := getDashboardTime(c.Query("type"))
	tokenName := c.Query("token_name")
	modelName := c.Query("model")

	dashboards, err := model.GetGroupDashboardData(group, start, end, tokenName, modelName, timeSpan)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, "failed to get statistics")
		return
	}

	dashboards.ChartData = fillGaps(dashboards.ChartData, start, end, timeSpan)

	if common.RedisEnabled && tokenName == "" {
		rpm, err := rpmlimit.GetRPM(c.Request.Context(), group, modelName)
		if err != nil {
			log.Errorf("failed to get rpm: %v", err)
		} else {
			dashboards.RPM = rpm
		}
	}

	middleware.SuccessResponse(c, dashboards)
}

func GetGroupDashboardModels(c *gin.Context) {
	group := c.Param("group")
	if group == "" {
		middleware.ErrorResponse(c, http.StatusOK, "invalid parameter")
		return
	}
	groupCache, err := model.CacheGetGroup(group)
	if err != nil {
		if errors.Is(err, model.NotFoundError(model.ErrGroupNotFound)) {
			middleware.SuccessResponse(c, model.LoadModelCaches().EnabledModelConfigs)
		} else {
			middleware.ErrorResponse(c, http.StatusOK, fmt.Sprintf("failed to get group: %v", err))
		}
		return
	}

	enabledModelConfigs := model.LoadModelCaches().EnabledModelConfigs
	newEnabledModelConfigs := make([]*model.ModelConfig, len(enabledModelConfigs))
	for i, mc := range enabledModelConfigs {
		newEnabledModelConfigs[i] = middleware.GetGroupAdjustedModelConfig(groupCache, mc)
	}
	middleware.SuccessResponse(c, newEnabledModelConfigs)
}
