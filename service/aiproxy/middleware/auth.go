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
			"message": "unauthorized, no access token provided",
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
		if !network.IsIPInSubnets(ctx, c.ClientIP(), token.Subnet) {
			abortWithMessage(c, http.StatusForbidden,
				fmt.Sprintf("token (%s[%d]) can only be used in the specified subnet: %s, current ip: %s",
					token.Name,
					token.ID,
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
	}
	c.Set(ctxkey.AvailableModels, []string(token.Models))
	if requestModel != "" && (len(token.Models) == 0 || !slices.Contains(token.Models, requestModel)) {
		abortWithMessage(c,
			http.StatusForbidden,
			fmt.Sprintf("token (%s[%d]) has no permission to use model: %s",
				token.Name, token.ID, requestModel,
			),
		)
		return
	}

	if group.QPM <= 0 {
		group.QPM = config.GetDefaultGroupQPM()
	}

	if group.QPM > 0 {
		ok := ForceRateLimit(ctx, "group_qpm:"+group.ID, int(group.QPM), time.Minute)
		if !ok {
			abortWithMessage(c, http.StatusTooManyRequests,
				group.ID+" is requesting too frequently",
			)
			return
		}
	}

	c.Set(ctxkey.Group, token.Group)
	c.Set(ctxkey.GroupQPM, group.QPM)
	c.Set(ctxkey.TokenID, token.ID)
	c.Set(ctxkey.TokenName, token.Name)
	c.Set(ctxkey.TokenUsedAmount, token.UsedAmount)
	c.Set(ctxkey.TokenQuota, token.Quota)
	// if len(parts) > 1 {
	// 	c.Set(ctxkey.SpecificChannelId, parts[1])
	// }

	// set channel id for proxy relay
	if channelID := c.Param("channelid"); channelID != "" {
		c.Set(ctxkey.SpecificChannelID, channelID)
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
