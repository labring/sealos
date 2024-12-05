package middleware

import (
	"fmt"
	"net/http"
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
	if len(token.Models) == 0 {
		token.Models = model.CacheGetEnabledModels()
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

	c.Set(ctxkey.Group, group)
	c.Set(ctxkey.Token, token)

	log := GetLogger(c)
	log.Data["gid"] = group.ID
	log.Data["tid"] = token.ID
	log.Data["tname"] = token.Name
	log.Data["key"] = maskTokenKey(key)

	c.Next()
}

func maskTokenKey(key string) string {
	if len(key) <= 8 {
		return "*****"
	}
	return key[:4] + "*****" + key[len(key)-4:]
}
