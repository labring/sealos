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
	code, _ := strconv.Atoi(c.Query("code"))
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
	channel, _ := strconv.Atoi(c.Query("channel"))
	group := c.Query("group")
	endpoint := c.Query("endpoint")
	content := c.Query("content")
	tokenID, _ := strconv.Atoi(c.Query("token_id"))
	order := c.Query("order")
	requestID := c.Query("request_id")
	mode, _ := strconv.Atoi(c.Query("mode"))
	logs, total, err := model.GetLogs(
		startTimestampTime,
		endTimestampTime,
		code,
		modelName,
		group,
		requestID,
		tokenID,
		tokenName,
		p*perPage,
		perPage,
		channel,
		endpoint,
		content,
		order,
		mode,
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

func GetGroupLogs(c *gin.Context) {
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
	code, _ := strconv.Atoi(c.Query("code"))
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
	channel, _ := strconv.Atoi(c.Query("channel"))
	group := c.Param("group")
	endpoint := c.Query("endpoint")
	content := c.Query("content")
	tokenID, _ := strconv.Atoi(c.Query("token_id"))
	order := c.Query("order")
	requestID := c.Query("request_id")
	mode, _ := strconv.Atoi(c.Query("mode"))
	logs, total, err := model.GetGroupLogs(
		group,
		startTimestampTime,
		endTimestampTime,
		code,
		modelName,
		requestID,
		tokenID,
		tokenName,
		p*perPage,
		perPage,
		channel,
		endpoint,
		content,
		order,
		mode,
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

func SearchLogs(c *gin.Context) {
	keyword := c.Query("keyword")
	p, _ := strconv.Atoi(c.Query("p"))
	perPage, _ := strconv.Atoi(c.Query("per_page"))
	if perPage <= 0 {
		perPage = 10
	} else if perPage > 100 {
		perPage = 100
	}
	code, _ := strconv.Atoi(c.Query("code"))
	endpoint := c.Query("endpoint")
	tokenName := c.Query("token_name")
	modelName := c.Query("model_name")
	content := c.Query("content")
	groupID := c.Query("group_id")
	tokenID, _ := strconv.Atoi(c.Query("token_id"))
	channel, _ := strconv.Atoi(c.Query("channel"))
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
	logs, total, err := model.SearchLogs(
		keyword,
		p,
		perPage,
		code,
		endpoint,
		groupID,
		requestID,
		tokenID,
		tokenName,
		modelName,
		content,
		startTimestampTime,
		endTimestampTime,
		channel,
		order,
		mode,
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

func SearchGroupLogs(c *gin.Context) {
	keyword := c.Query("keyword")
	p, _ := strconv.Atoi(c.Query("p"))
	perPage, _ := strconv.Atoi(c.Query("per_page"))
	if perPage <= 0 {
		perPage = 10
	} else if perPage > 100 {
		perPage = 100
	}
	group := c.Param("group")
	code, _ := strconv.Atoi(c.Query("code"))
	endpoint := c.Query("endpoint")
	tokenName := c.Query("token_name")
	modelName := c.Query("model_name")
	content := c.Query("content")
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
	logs, total, err := model.SearchGroupLogs(
		group,
		keyword,
		p,
		perPage,
		code,
		endpoint,
		requestID,
		tokenID,
		tokenName,
		modelName,
		content,
		startTimestampTime,
		endTimestampTime,
		channelID,
		order,
		mode,
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
