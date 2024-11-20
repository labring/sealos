package controller

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
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
	logs, total, err := model.GetLogs(
		startTimestampTime, endTimestampTime,
		code, modelName, group, tokenID, tokenName, p*perPage, perPage, channel, endpoint, content, order)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"logs":  logs,
			"total": total,
		},
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
	logs, total, err := model.GetGroupLogs(group,
		startTimestampTime, endTimestampTime,
		code, modelName, tokenID, tokenName, p*perPage, perPage, channel, endpoint, content, order)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"logs":  logs,
			"total": total,
		},
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
	logs, total, err := model.SearchLogs(keyword, p, perPage, code, endpoint, groupID, tokenID, tokenName, modelName, content, startTimestampTime, endTimestampTime, channel, order)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"logs":  logs,
			"total": total,
		},
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
	logs, total, err := model.SearchGroupLogs(group, keyword, p, perPage, code, endpoint, tokenID, tokenName, modelName, content, startTimestampTime, endTimestampTime, channelID, order)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"logs":  logs,
			"total": total,
		},
	})
}

func GetLogsStat(c *gin.Context) {
	startTimestamp, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTimestamp, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)
	if endTimestamp < startTimestamp {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "end_timestamp must be greater than start_timestamp",
		})
		return
	}
	tokenName := c.Query("token_name")
	group := c.Query("group")
	modelName := c.Query("model_name")
	channel, _ := strconv.Atoi(c.Query("channel"))
	endpoint := c.Query("endpoint")
	var startTimestampTime time.Time
	if startTimestamp != 0 {
		startTimestampTime = time.UnixMilli(startTimestamp)
	}
	var endTimestampTime time.Time
	if endTimestamp != 0 {
		endTimestampTime = time.UnixMilli(endTimestamp)
	}
	quotaNum := model.SumUsedQuota(startTimestampTime, endTimestampTime, modelName, group, tokenName, channel, endpoint)
	// tokenNum := model.SumUsedToken(logType, startTimestamp, endTimestamp, modelName, username, "")
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"quota": quotaNum,
			// "token": tokenNum,
		},
	})
}

func GetLogsSelfStat(c *gin.Context) {
	group := c.GetString(ctxkey.Group)
	startTimestamp, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTimestamp, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)
	tokenName := c.Query("token_name")
	modelName := c.Query("model_name")
	channel, _ := strconv.Atoi(c.Query("channel"))
	endpoint := c.Query("endpoint")
	var startTimestampTime time.Time
	if startTimestamp != 0 {
		startTimestampTime = time.UnixMilli(startTimestamp)
	}
	var endTimestampTime time.Time
	if endTimestamp != 0 {
		endTimestampTime = time.UnixMilli(endTimestamp)
	}
	quotaNum := model.SumUsedQuota(startTimestampTime, endTimestampTime, modelName, group, tokenName, channel, endpoint)
	// tokenNum := model.SumUsedToken(logType, startTimestamp, endTimestamp, modelName, username, tokenName)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"quota": quotaNum,
			// "token": tokenNum,
		},
	})
}

func DeleteHistoryLogs(c *gin.Context) {
	timestamp, _ := strconv.ParseInt(c.Query("timestamp"), 10, 64)
	if timestamp == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "timestamp is required",
		})
		return
	}
	count, err := model.DeleteOldLog(time.UnixMilli(timestamp))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    count,
	})
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
	logs, total, err := model.SearchConsumeError(keyword, group, tokenName, modelName, content, usedAmount, tokenID, page, perPage, order)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"logs":  logs,
			"total": total,
		},
	})
}
