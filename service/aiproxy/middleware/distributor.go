package middleware

import (
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/balance"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/consume"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
	"github.com/labring/sealos/service/aiproxy/common/rpmlimit"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	log "github.com/sirupsen/logrus"
)

func calculateGroupConsumeLevelRatio(usedAmount float64) float64 {
	v := config.GetGroupConsumeLevelRatio()
	if len(v) == 0 {
		return 1
	}
	var maxConsumeLevel float64 = -1
	var groupConsumeLevelRatio float64
	for consumeLevel, ratio := range v {
		if usedAmount < consumeLevel {
			continue
		}
		if consumeLevel > maxConsumeLevel {
			maxConsumeLevel = consumeLevel
			groupConsumeLevelRatio = ratio
		}
	}
	if groupConsumeLevelRatio <= 0 {
		groupConsumeLevelRatio = 1
	}
	return groupConsumeLevelRatio
}

func getGroupPMRatio(group *model.GroupCache) (float64, float64) {
	groupRPMRatio := group.RPMRatio
	if groupRPMRatio <= 0 {
		groupRPMRatio = 1
	}
	groupTPMRatio := group.TPMRatio
	if groupTPMRatio <= 0 {
		groupTPMRatio = 1
	}
	return groupRPMRatio, groupTPMRatio
}

func GetGroupAdjustedModelConfig(group *model.GroupCache, mc *model.ModelConfig) *model.ModelConfig {
	rpm := mc.RPM
	tpm := mc.TPM
	if group.RPM != nil && group.RPM[mc.Model] > 0 {
		rpm = group.RPM[mc.Model]
	}
	if group.TPM != nil && group.TPM[mc.Model] > 0 {
		tpm = group.TPM[mc.Model]
	}
	rpmRatio, tpmRatio := getGroupPMRatio(group)
	groupConsumeLevelRatio := calculateGroupConsumeLevelRatio(group.UsedAmount)
	rpm = int64(float64(rpm) * rpmRatio * groupConsumeLevelRatio)
	tpm = int64(float64(tpm) * tpmRatio * groupConsumeLevelRatio)
	if rpm != mc.RPM || tpm != mc.TPM {
		newMc := *mc
		newMc.RPM = rpm
		newMc.TPM = tpm
		return &newMc
	}
	return mc
}

var (
	ErrRequestRateLimitExceeded = errors.New("request rate limit exceeded, please try again later")
	ErrRequestTpmLimitExceeded  = errors.New("request tpm limit exceeded, please try again later")
)

func checkGroupModelRPMAndTPM(c *gin.Context, group *model.GroupCache, mc *model.ModelConfig) error {
	adjustedModelConfig := GetGroupAdjustedModelConfig(group, mc)

	if adjustedModelConfig.RPM > 0 {
		ok := rpmlimit.ForceRateLimit(
			c.Request.Context(),
			group.ID,
			mc.Model,
			adjustedModelConfig.RPM,
			time.Minute,
		)
		if !ok {
			return ErrRequestRateLimitExceeded
		}
	} else if common.RedisEnabled {
		_, err := rpmlimit.PushRequest(c.Request.Context(), group.ID, mc.Model, time.Minute)
		if err != nil {
			log.Errorf("push request error: %s", err.Error())
		}
	}

	if adjustedModelConfig.TPM > 0 {
		tpm, err := model.CacheGetGroupModelTPM(group.ID, mc.Model)
		if err != nil {
			log.Errorf("get group model tpm (%s:%s) error: %s", group.ID, mc.Model, err.Error())
			// ignore error
			return nil
		}

		if tpm >= adjustedModelConfig.TPM {
			return ErrRequestTpmLimitExceeded
		}
	}
	return nil
}

type GroupBalanceConsumer struct {
	GroupBalance float64
	Consumer     balance.PostGroupConsumer
}

func checkGroupBalance(c *gin.Context, group *model.GroupCache) bool {
	var groupBalance float64
	var consumer balance.PostGroupConsumer

	if group.Status == model.GroupStatusInternal {
		groupBalance, consumer, _ = balance.MockGetGroupRemainBalance(c.Request.Context(), *group)
	} else {
		log := GetLogger(c)
		var err error
		groupBalance, consumer, err = balance.Default.GetGroupRemainBalance(c.Request.Context(), *group)
		if err != nil {
			if errors.Is(err, balance.ErrNoRealNameUsedAmountLimit) {
				abortLogWithMessage(c, http.StatusForbidden, balance.ErrNoRealNameUsedAmountLimit.Error())
				return false
			}
			log.Errorf("get group (%s) balance error: %v", group.ID, err)
			abortWithMessage(c, http.StatusInternalServerError, fmt.Sprintf("get group (%s) balance error", group.ID))
			return false
		}
		log.Data["balance"] = strconv.FormatFloat(groupBalance, 'f', -1, 64)
	}

	if groupBalance <= 0 {
		abortLogWithMessage(c, http.StatusForbidden, fmt.Sprintf("group (%s) balance not enough", group.ID))
		return false
	}
	c.Set(ctxkey.GroupBalance, &GroupBalanceConsumer{
		GroupBalance: groupBalance,
		Consumer:     consumer,
	})
	return true
}

func NewDistribute(mode int) gin.HandlerFunc {
	return func(c *gin.Context) {
		distribute(c, mode)
	}
}

func distribute(c *gin.Context, mode int) {
	if config.GetDisableServe() {
		abortLogWithMessage(c, http.StatusServiceUnavailable, "service is under maintenance")
		return
	}

	log := GetLogger(c)

	group := GetGroup(c)

	if !checkGroupBalance(c, group) {
		return
	}

	requestModel, err := getRequestModel(c)
	if err != nil {
		abortLogWithMessage(c, http.StatusBadRequest, err.Error())
		return
	}
	if requestModel == "" {
		abortLogWithMessage(c, http.StatusBadRequest, "no model provided")
		return
	}

	c.Set(ctxkey.OriginalModel, requestModel)

	SetLogModelFields(log.Data, requestModel)

	mc, ok := GetModelCaches(c).ModelConfig.GetModelConfig(requestModel)
	if !ok {
		abortLogWithMessage(c, http.StatusServiceUnavailable, requestModel+" is not available")
		return
	}

	c.Set(ctxkey.ModelConfig, mc)

	token := GetToken(c)

	if len(token.Models) == 0 || !slices.Contains(token.Models, requestModel) {
		abortLogWithMessage(c,
			http.StatusForbidden,
			fmt.Sprintf("token (%s[%d]) has no permission to use model: %s",
				token.Name, token.ID, requestModel,
			),
		)
		return
	}

	if err := checkGroupModelRPMAndTPM(c, group, mc); err != nil {
		errMsg := err.Error()
		consume.AsyncConsume(
			nil,
			http.StatusTooManyRequests,
			nil,
			NewMetaByContext(c, nil, mc.Model, mode),
			0,
			0,
			errMsg,
			c.ClientIP(),
			nil,
		)
		abortLogWithMessage(c, http.StatusTooManyRequests, errMsg)
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
