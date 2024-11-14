package middleware

import (
	"fmt"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
	"github.com/labring/sealos/service/aiproxy/common/network"
	"github.com/labring/sealos/service/aiproxy/model"
)

func AdminAuth(c *gin.Context) {
	accessToken := c.Request.Header.Get("Authorization")
	if config.AdminKey != "" && (accessToken == "" || strings.TrimPrefix(accessToken, "Bearer ") != config.AdminKey) {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "无权进行此操作，未登录且未提供 access token",
		})
		c.Abort()
		return
	}
	c.Next()
}

func TokenAuth(c *gin.Context) {
	ctx := c.Request.Context()
	key := c.Request.Header.Get("Authorization")
	key = strings.TrimPrefix(
		strings.TrimPrefix(key, "Bearer "),
		"sk-",
	)
	parts := strings.Split(key, "-")
	key = parts[0]
	token, err := model.ValidateAndGetToken(key)
	if err != nil {
		abortWithMessage(c, http.StatusUnauthorized, err.Error())
		return
	}
	if token.Subnet != "" {
		if !network.IsIpInSubnets(ctx, c.ClientIP(), token.Subnet) {
			abortWithMessage(c, http.StatusForbidden,
				fmt.Sprintf("令牌 (%s[%d]) 只能在指定网段使用：%s，当前 ip：%s",
					token.Name,
					token.Id,
					token.Subnet,
					c.ClientIP(),
				),
			)
			return
		}
	}
	group, err := model.CacheGetGroup(token.Group)
	if err != nil {
		abortWithMessage(c, http.StatusInternalServerError, err.Error())
		return
	}
	requestModel, err := getRequestModel(c)
	if err != nil && shouldCheckModel(c) {
		abortWithMessage(c, http.StatusBadRequest, err.Error())
		return
	}
	c.Set(ctxkey.RequestModel, requestModel)
	if len(token.Models) == 0 {
		token.Models = model.CacheGetAllModels()
		if requestModel != "" && len(token.Models) == 0 {
			abortWithMessage(c,
				http.StatusForbidden,
				fmt.Sprintf("令牌 (%s[%d]) 无权使用任何模型",
					token.Name, token.Id,
				),
			)
			return
		}
	}
	c.Set(ctxkey.AvailableModels, []string(token.Models))
	if requestModel != "" && !slices.Contains(token.Models, requestModel) {
		abortWithMessage(c,
			http.StatusForbidden,
			fmt.Sprintf("令牌 (%s[%d]) 无权使用模型：%s",
				token.Name, token.Id, requestModel,
			),
		)
		return
	}

	if group.QPM <= 0 {
		group.QPM = config.GetDefaultGroupQPM()
	}

	if group.QPM > 0 {
		ok, err := RateLimit(ctx, fmt.Sprintf("group_qpm:%s", group.Id), int(group.QPM), time.Minute)
		if err != nil {
			abortWithMessage(c, http.StatusInternalServerError, err.Error())
			return
		}
		if !ok {
			abortWithMessage(c, http.StatusTooManyRequests,
				fmt.Sprintf("%s 请求过于频繁",
					group.Id,
				),
			)
			return
		}
	}

	c.Set(ctxkey.Group, token.Group)
	c.Set(ctxkey.GroupQPM, group.QPM)
	c.Set(ctxkey.TokenId, token.Id)
	c.Set(ctxkey.TokenName, token.Name)
	c.Set(ctxkey.TokenUsedAmount, token.UsedAmount)
	c.Set(ctxkey.TokenQuota, token.Quota)
	if len(parts) > 1 {
		// c.Set(ctxkey.SpecificChannelId, parts[1])
	}

	// set channel id for proxy relay
	if channelId := c.Param("channelid"); channelId != "" {
		c.Set(ctxkey.SpecificChannelId, channelId)
	}

	c.Next()
}

func shouldCheckModel(c *gin.Context) bool {
	if strings.HasPrefix(c.Request.URL.Path, "/v1/completions") {
		return true
	}
	if strings.HasPrefix(c.Request.URL.Path, "/v1/chat/completions") {
		return true
	}
	if strings.HasPrefix(c.Request.URL.Path, "/v1/images") {
		return true
	}
	if strings.HasPrefix(c.Request.URL.Path, "/v1/audio") {
		return true
	}
	return false
}
