package controller

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
)

func GetLogs(c *gin.Context) {
	p, _ := strconv.Atoi(c.Query("p"))
	p--
	if p < 0 {
		p = 0
	}
	perPage, _ := strconv.Atoi(c.Query("per_page"))
	if perPage <= 0 {
		perPage = 10
	} else if perPage > 100 {
		perPage = 100
	}
	startTimestamp, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTimestamp, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)
	var startTimestampTime time.Time
	if startTimestamp != 0 {
		startTimestampTime = time.UnixMilli(startTimestamp)
	}
	var endTimestampTime time.Time
	if endTimestamp != 0 {
		endTimestampTime = time.UnixMilli(endTimestamp)
	}
	tokenName := c.Query("token_name")
	modelName := c.Query("model_name")
	channelID, _ := strconv.Atoi(c.Query("channel"))
	group := c.Query("group")
	endpoint := c.Query("endpoint")
	tokenID, _ := strconv.Atoi(c.Query("token_id"))
	order := c.Query("order")
	requestID := c.Query("request_id")
	mode, _ := strconv.Atoi(c.Query("mode"))
	codeType := c.Query("code_type")
	withBody, _ := strconv.ParseBool(c.Query("with_body"))
	ip := c.Query("ip")
	result, err := model.GetLogs(
		group,
		startTimestampTime,
		endTimestampTime,
		modelName,
		requestID,
		tokenID,
		tokenName,
		channelID,
		endpoint,
		order,
		mode,
		model.CodeType(codeType),
		withBody,
		ip,
		p,
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
	p, _ := strconv.Atoi(c.Query("p"))
	p--
	if p < 0 {
		p = 0
	}
	perPage, _ := strconv.Atoi(c.Query("per_page"))
	if perPage <= 0 {
		perPage = 10
	} else if perPage > 100 {
		perPage = 100
	}
	startTimestamp, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTimestamp, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)
	var startTimestampTime time.Time
	if startTimestamp != 0 {
		startTimestampTime = time.UnixMilli(startTimestamp)
	}
	var endTimestampTime time.Time
	if endTimestamp != 0 {
		endTimestampTime = time.UnixMilli(endTimestamp)
	}
	tokenName := c.Query("token_name")
	modelName := c.Query("model_name")
	channelID, _ := strconv.Atoi(c.Query("channel"))
	endpoint := c.Query("endpoint")
	tokenID, _ := strconv.Atoi(c.Query("token_id"))
	order := c.Query("order")
	requestID := c.Query("request_id")
	mode, _ := strconv.Atoi(c.Query("mode"))
	codeType := c.Query("code_type")
	withBody, _ := strconv.ParseBool(c.Query("with_body"))
	ip := c.Query("ip")
	result, err := model.GetGroupLogs(
		group,
		startTimestampTime,
		endTimestampTime,
		modelName,
		requestID,
		tokenID,
		tokenName,
		channelID,
		endpoint,
		order,
		mode,
		model.CodeType(codeType),
		withBody,
		ip,
		p,
		perPage,
	)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, result)
}

func SearchLogs(c *gin.Context) {
	keyword := c.Query("keyword")
	p, _ := strconv.Atoi(c.Query("p"))
	perPage, _ := strconv.Atoi(c.Query("per_page"))
	if perPage <= 0 {
		perPage = 10
	} else if perPage > 100 {
		perPage = 100
	}
	endpoint := c.Query("endpoint")
	tokenName := c.Query("token_name")
	modelName := c.Query("model_name")
	group := c.Query("group_id")
	tokenID, _ := strconv.Atoi(c.Query("token_id"))
	channelID, _ := strconv.Atoi(c.Query("channel"))
	startTimestamp, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTimestamp, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)
	var startTimestampTime time.Time
	if startTimestamp != 0 {
		startTimestampTime = time.UnixMilli(startTimestamp)
	}
	var endTimestampTime time.Time
	if endTimestamp != 0 {
		endTimestampTime = time.UnixMilli(endTimestamp)
	}
	order := c.Query("order")
	requestID := c.Query("request_id")
	mode, _ := strconv.Atoi(c.Query("mode"))
	codeType := c.Query("code_type")
	withBody, _ := strconv.ParseBool(c.Query("with_body"))
	ip := c.Query("ip")
	result, err := model.SearchLogs(
		group,
		keyword,
		endpoint,
		requestID,
		tokenID,
		tokenName,
		modelName,
		startTimestampTime,
		endTimestampTime,
		channelID,
		order,
		mode,
		model.CodeType(codeType),
		withBody,
		ip,
		p,
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
	keyword := c.Query("keyword")
	p, _ := strconv.Atoi(c.Query("p"))
	perPage, _ := strconv.Atoi(c.Query("per_page"))
	if perPage <= 0 {
		perPage = 10
	} else if perPage > 100 {
		perPage = 100
	}
	endpoint := c.Query("endpoint")
	tokenName := c.Query("token_name")
	modelName := c.Query("model_name")
	tokenID, _ := strconv.Atoi(c.Query("token_id"))
	channelID, _ := strconv.Atoi(c.Query("channel"))
	startTimestamp, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTimestamp, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)
	var startTimestampTime time.Time
	if startTimestamp != 0 {
		startTimestampTime = time.UnixMilli(startTimestamp)
	}
	var endTimestampTime time.Time
	if endTimestamp != 0 {
		endTimestampTime = time.UnixMilli(endTimestamp)
	}
	order := c.Query("order")
	requestID := c.Query("request_id")
	mode, _ := strconv.Atoi(c.Query("mode"))
	codeType := c.Query("code_type")
	withBody, _ := strconv.ParseBool(c.Query("with_body"))
	ip := c.Query("ip")
	result, err := model.SearchGroupLogs(
		group,
		keyword,
		endpoint,
		requestID,
		tokenID,
		tokenName,
		modelName,
		startTimestampTime,
		endTimestampTime,
		channelID,
		order,
		mode,
		model.CodeType(codeType),
		withBody,
		ip,
		p,
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
	logs, total, err := model.SearchConsumeError(keyword, requestID, group, tokenName, modelName, content, usedAmount, tokenID, page, perPage, order)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, gin.H{
		"logs":  logs,
		"total": total,
	})
}
