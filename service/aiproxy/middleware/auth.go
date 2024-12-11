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
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/sirupsen/logrus"
)

type APIResponse struct {
	Data    any    `json:"data,omitempty"`
	Message string `json:"message,omitempty"`
	Success bool   `json:"success"`
}

func SuccessResponse(c *gin.Context, data any) {
	c.JSON(http.StatusOK, &APIResponse{
		Success: true,
		Data:    data,
	})
}

func ErrorResponse(c *gin.Context, code int, message string) {
	c.JSON(code, &APIResponse{
		Success: false,
		Message: message,
	})
}

func AdminAuth(c *gin.Context) {
	accessToken := c.Request.Header.Get("Authorization")
	if config.AdminKey != "" && (accessToken == "" || strings.TrimPrefix(accessToken, "Bearer ") != config.AdminKey) {
		ErrorResponse(c, http.StatusUnauthorized, "unauthorized, no access token provided")
		c.Abort()
		return
	}
	c.Next()
}

func TokenAuth(c *gin.Context) {
	log := GetLogger(c)
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
	SetLogTokenFields(log.Data, token)
	if token.Subnet != "" {
		if ok, err := network.IsIPInSubnets(c.ClientIP(), token.Subnet); err != nil {
			abortWithMessage(c, http.StatusInternalServerError, err.Error())
			return
		} else if !ok {
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
	SetLogGroupFields(log.Data, group)
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

	c.Next()
}

func SetLogFieldsFromMeta(m *meta.Meta, fields logrus.Fields) {
	SetLogRequestIDField(fields, m.RequestID)

	SetLogModeField(fields, m.Mode)
	SetLogModelFields(fields, m.OriginModelName)
	SetLogActualModelFields(fields, m.ActualModelName)

	if m.IsChannelTest {
		SetLogIsChannelTestField(fields, true)
	}

	SetLogGroupFields(fields, m.Group)
	SetLogTokenFields(fields, m.Token)
	SetLogChannelFields(fields, m.Channel)
}

func SetLogModeField(fields logrus.Fields, mode int) {
	fields["mode"] = mode
}

func SetLogIsChannelTestField(fields logrus.Fields, isChannelTest bool) {
	fields["test"] = isChannelTest
}

func SetLogActualModelFields(fields logrus.Fields, actualModel string) {
	fields["actmodel"] = actualModel
}

func SetLogModelFields(fields logrus.Fields, model string) {
	fields["model"] = model
}

func SetLogChannelFields(fields logrus.Fields, channel *meta.ChannelMeta) {
	if channel != nil {
		fields["chid"] = channel.ID
		fields["chname"] = channel.Name
		fields["chtype"] = channel.Type
	}
}

func SetLogRequestIDField(fields logrus.Fields, requestID string) {
	fields["reqid"] = requestID
}

func SetLogGroupFields(fields logrus.Fields, group *model.GroupCache) {
	if group != nil {
		fields["gid"] = group.ID
	}
}

func SetLogTokenFields(fields logrus.Fields, token *model.TokenCache) {
	if token != nil {
		fields["tid"] = token.ID
		fields["tname"] = token.Name
		fields["key"] = maskTokenKey(token.Key)
	}
}

func maskTokenKey(key string) string {
	if len(key) <= 8 {
		return "*****"
	}
	return key[:4] + "*****" + key[len(key)-4:]
}
