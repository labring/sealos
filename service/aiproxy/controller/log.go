package controller

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
)

func parseTimeRange(c *gin.Context) (startTime, endTime time.Time) {
	startTimestamp, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTimestamp, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)

	if startTimestamp != 0 {
		startTime = time.UnixMilli(startTimestamp)
	}
	sevenDaysAgo := time.Now().AddDate(0, 0, -7)
	if startTime.IsZero() || startTime.Before(sevenDaysAgo) {
		startTime = sevenDaysAgo
	}

	if endTimestamp != 0 {
		endTime = time.UnixMilli(endTimestamp)
	}
	return
}

func parseCommonParams(c *gin.Context) (params struct {
	tokenName string
	modelName string
	channelID int
	endpoint  string
	tokenID   int
	order     string
	requestID string
	mode      int
	codeType  string
	withBody  bool
	ip        string
},
) {
	params.tokenName = c.Query("token_name")
	params.modelName = c.Query("model_name")
	params.channelID, _ = strconv.Atoi(c.Query("channel"))
	params.endpoint = c.Query("endpoint")
	params.tokenID, _ = strconv.Atoi(c.Query("token_id"))
	params.order = c.Query("order")
	params.requestID = c.Query("request_id")
	params.mode, _ = strconv.Atoi(c.Query("mode"))
	params.codeType = c.Query("code_type")
	params.withBody, _ = strconv.ParseBool(c.Query("with_body"))
	params.ip = c.Query("ip")
	return
}

// Handler functions
func GetLogs(c *gin.Context) {
	page, perPage := parsePageParams(c)
	startTime, endTime := parseTimeRange(c)
	params := parseCommonParams(c)
	group := c.Query("group")

	result, err := model.GetLogs(
		group,
		startTime,
		endTime,
		params.modelName,
		params.requestID,
		params.tokenID,
		params.tokenName,
		params.channelID,
		params.endpoint,
		params.order,
		params.mode,
		model.CodeType(params.codeType),
		params.withBody,
		params.ip,
		page,
		perPage,
	)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, result)
}

func GetGroupLogs(c *gin.Context) {
	group := c.Param("group")
	if group == "" {
		middleware.ErrorResponse(c, http.StatusOK, "group is required")
		return
	}

	page, perPage := parsePageParams(c)
	startTime, endTime := parseTimeRange(c)
	params := parseCommonParams(c)

	result, err := model.GetGroupLogs(
		group,
		startTime,
		endTime,
		params.modelName,
		params.requestID,
		params.tokenID,
		params.tokenName,
		params.channelID,
		params.endpoint,
		params.order,
		params.mode,
		model.CodeType(params.codeType),
		params.withBody,
		params.ip,
		page,
		perPage,
	)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, result)
}

func SearchLogs(c *gin.Context) {
	page, perPage := parsePageParams(c)
	startTime, endTime := parseTimeRange(c)
	params := parseCommonParams(c)

	keyword := c.Query("keyword")
	group := c.Query("group_id")

	result, err := model.SearchLogs(
		group,
		keyword,
		params.endpoint,
		params.requestID,
		params.tokenID,
		params.tokenName,
		params.modelName,
		startTime,
		endTime,
		params.channelID,
		params.order,
		params.mode,
		model.CodeType(params.codeType),
		params.withBody,
		params.ip,
		page,
		perPage,
	)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, result)
}

func SearchGroupLogs(c *gin.Context) {
	group := c.Param("group")
	if group == "" {
		middleware.ErrorResponse(c, http.StatusOK, "group is required")
		return
	}

	page, perPage := parsePageParams(c)
	startTime, endTime := parseTimeRange(c)
	params := parseCommonParams(c)
	keyword := c.Query("keyword")

	result, err := model.SearchGroupLogs(
		group,
		keyword,
		params.endpoint,
		params.requestID,
		params.tokenID,
		params.tokenName,
		params.modelName,
		startTime,
		endTime,
		params.channelID,
		params.order,
		params.mode,
		model.CodeType(params.codeType),
		params.withBody,
		params.ip,
		page,
		perPage,
	)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, result)
}

func GetLogDetail(c *gin.Context) {
	logID, _ := strconv.Atoi(c.Param("log_id"))
	log, err := model.GetLogDetail(logID)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, log)
}

func GetGroupLogDetail(c *gin.Context) {
	group := c.Param("group")
	if group == "" {
		middleware.ErrorResponse(c, http.StatusOK, "group is required")
		return
	}
	logID, _ := strconv.Atoi(c.Param("log_id"))
	log, err := model.GetGroupLogDetail(logID, group)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, log)
}

func DeleteHistoryLogs(c *gin.Context) {
	timestamp, _ := strconv.ParseInt(c.Query("timestamp"), 10, 64)
	if timestamp == 0 {
		middleware.ErrorResponse(c, http.StatusOK, "timestamp is required")
		return
	}
	count, err := model.DeleteOldLog(time.UnixMilli(timestamp))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, count)
}

func SearchConsumeError(c *gin.Context) {
	keyword := c.Query("keyword")
	group := c.Query("group")
	tokenName := c.Query("token_name")
	modelName := c.Query("model_name")
	content := c.Query("content")
	tokenID, _ := strconv.Atoi(c.Query("token_id"))
	usedAmount, _ := strconv.ParseFloat(c.Query("used_amount"), 64)

	page, _ := strconv.Atoi(c.Query("page"))
	perPage, _ := strconv.Atoi(c.Query("per_page"))
	if perPage <= 0 {
		perPage = 10
	} else if perPage > 100 {
		perPage = 100
	}

	order := c.Query("order")
	requestID := c.Query("request_id")

	logs, total, err := model.SearchConsumeError(
		keyword,
		requestID,
		group,
		tokenName,
		modelName,
		content,
		usedAmount,
		tokenID,
		page,
		perPage,
		order,
	)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, gin.H{
		"logs":  logs,
		"total": total,
	})
}
