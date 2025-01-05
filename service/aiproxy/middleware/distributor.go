package middleware

import (
	"fmt"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/consume"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
	"github.com/labring/sealos/service/aiproxy/common/rpmlimit"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	log "github.com/sirupsen/logrus"
)

func calculateGroupConsumeLevelRpmRatio(usedAmount float64) float64 {
	v := config.GetGroupConsumeLevelRpmRatio()
	var maxConsumeLevel float64 = -1
	var groupConsumeLevelRpmRatio float64
	for consumeLevel, ratio := range v {
		if usedAmount < consumeLevel {
			continue
		}
		if consumeLevel > maxConsumeLevel {
			maxConsumeLevel = consumeLevel
			groupConsumeLevelRpmRatio = ratio
		}
	}
	if groupConsumeLevelRpmRatio <= 0 {
		groupConsumeLevelRpmRatio = 1
	}
	return groupConsumeLevelRpmRatio
}

func getGroupRPMRatio(group *model.GroupCache) float64 {
	groupRPMRatio := group.RPMRatio
	if groupRPMRatio <= 0 {
		groupRPMRatio = 1
	}
	return groupRPMRatio
}

func checkGroupModelRPMAndTPM(c *gin.Context, group *model.GroupCache, requestModel string, modelRPM int64, modelTPM int64) error {
	if group.RPM != nil && group.RPM[requestModel] > 0 {
		modelRPM = group.RPM[requestModel]
	}
	if group.TPM != nil && group.TPM[requestModel] > 0 {
		modelTPM = group.TPM[requestModel]
	}

	if modelRPM <= 0 && modelTPM <= 0 {
		return nil
	}

	groupConsumeLevelRpmRatio := calculateGroupConsumeLevelRpmRatio(group.UsedAmount)
	groupRPMRatio := getGroupRPMRatio(group)

	adjustedModelRPM := int64(float64(modelRPM) * groupRPMRatio * groupConsumeLevelRpmRatio)

	ok := rpmlimit.ForceRateLimit(
		c.Request.Context(),
		group.ID,
		requestModel,
		adjustedModelRPM,
		time.Minute,
	)

	if !ok {
		return fmt.Errorf("group (%s) is requesting too frequently", group.ID)
	}

	if modelTPM > 0 {
		tpm, err := model.CacheGetGroupModelTPM(group.ID, requestModel)
		if err != nil {
			log.Errorf("get group model tpm (%s:%s) error: %s", group.ID, requestModel, err.Error())
			// ignore error
			return nil
		}

		if tpm >= modelTPM {
			return fmt.Errorf("group (%s) tpm is too high", group.ID)
		}
	}
	return nil
}

func NewDistribute(mode int) gin.HandlerFunc {
	return func(c *gin.Context) {
		distribute(c, mode)
	}
}

func distribute(c *gin.Context, mode int) {
	if config.GetDisableServe() {
		abortWithMessage(c, http.StatusServiceUnavailable, "service is under maintenance")
		return
	}

	log := GetLogger(c)

	group := GetGroup(c)

	requestModel, err := getRequestModel(c)
	if err != nil {
		abortWithMessage(c, http.StatusBadRequest, err.Error())
		return
	}
	if requestModel == "" {
		abortWithMessage(c, http.StatusBadRequest, "no model provided")
		return
	}

	c.Set(ctxkey.OriginalModel, requestModel)

	SetLogModelFields(log.Data, requestModel)

	mc, ok := GetModelCaches(c).ModelConfigMap[requestModel]
	if !ok {
		abortWithMessage(c, http.StatusServiceUnavailable, requestModel+" is not available")
		return
	}

	c.Set(ctxkey.ModelConfig, mc)

	token := GetToken(c)

	if len(token.Models) == 0 || !slices.Contains(token.Models, requestModel) {
		abortWithMessage(c,
			http.StatusForbidden,
			fmt.Sprintf("token (%s[%d]) has no permission to use model: %s",
				token.Name, token.ID, requestModel,
			),
		)
		return
	}

	if err := checkGroupModelRPMAndTPM(c, group, requestModel, mc.RPM, mc.TPM); err != nil {
		errMsg := err.Error()
		consume.AsyncConsume(
			nil,
			http.StatusTooManyRequests,
			nil,
			NewMetaByContext(c, nil, requestModel, mode),
			0,
			0,
			errMsg,
			nil,
		)
		abortWithMessage(c, http.StatusTooManyRequests, errMsg)
		return
	}

	c.Next()
}

func GetOriginalModel(c *gin.Context) string {
	return c.GetString(ctxkey.OriginalModel)
}

func GetModelConfig(c *gin.Context) *model.ModelConfig {
	return c.MustGet(ctxkey.ModelConfig).(*model.ModelConfig)
}

func NewMetaByContext(c *gin.Context, channel *model.Channel, modelName string, mode int) *meta.Meta {
	requestID := GetRequestID(c)
	group := GetGroup(c)
	token := GetToken(c)

	return meta.NewMeta(
		channel,
		mode,
		modelName,
		GetModelConfig(c),
		meta.WithRequestID(requestID),
		meta.WithGroup(group),
		meta.WithToken(token),
		meta.WithEndpoint(c.Request.URL.Path),
	)
}

type ModelRequest struct {
	Model string `form:"model" json:"model"`
}

func getRequestModel(c *gin.Context) (string, error) {
	path := c.Request.URL.Path
	switch {
	case strings.HasPrefix(path, "/v1/audio/transcriptions"),
		strings.HasPrefix(path, "/v1/audio/translations"):
		return c.Request.FormValue("model"), nil
	case strings.HasPrefix(path, "/v1/engines") && strings.HasSuffix(path, "/embeddings"):
		// /engines/:model/embeddings
		return c.Param("model"), nil
	default:
		var modelRequest ModelRequest
		err := common.UnmarshalBodyReusable(c.Request, &modelRequest)
		if err != nil {
			return "", fmt.Errorf("get request model failed: %w", err)
		}
		return modelRequest.Model, nil
	}
}
