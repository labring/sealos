package middleware

import (
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/bytedance/sonic"
	"github.com/bytedance/sonic/ast"
	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/balance"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/consume"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
	"github.com/labring/sealos/service/aiproxy/common/notify"
	"github.com/labring/sealos/service/aiproxy/common/rpmlimit"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
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
		_, _, err := rpmlimit.PushRequest(c.Request.Context(), group.ID, mc.Model, 1, time.Minute)
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

func GetGroupBalanceConsumer(c *gin.Context, group *model.GroupCache) (*GroupBalanceConsumer, error) {
	gbcI, ok := c.Get(ctxkey.GroupBalance)
	if ok {
		groupBalanceConsumer, ok := gbcI.(*GroupBalanceConsumer)
		if !ok {
			return nil, errors.New("internal error: group balance consumer unavailable")
		}
		return groupBalanceConsumer, nil
	}

	var groupBalance float64
	var consumer balance.PostGroupConsumer

	if group.Status == model.GroupStatusInternal {
		groupBalance, consumer, _ = balance.MockGetGroupRemainBalance(c.Request.Context(), *group)
	} else {
		log := GetLogger(c)
		var err error
		groupBalance, consumer, err = balance.GetGroupRemainBalance(c.Request.Context(), *group)
		if err != nil {
			return nil, err
		}
		log.Data["balance"] = strconv.FormatFloat(groupBalance, 'f', -1, 64)
	}

	gbc := &GroupBalanceConsumer{GroupBalance: groupBalance, Consumer: consumer}
	c.Set(ctxkey.GroupBalance, gbc)
	return gbc, nil
}

func checkGroupBalance(c *gin.Context, group *model.GroupCache) bool {
	gbc, err := GetGroupBalanceConsumer(c, group)
	if err != nil {
		if errors.Is(err, balance.ErrNoRealNameUsedAmountLimit) {
			abortLogWithMessage(c, http.StatusForbidden, err.Error(), &errorField{
				Code: "no_real_name_used_amount_limit",
			})
			return false
		}
		notify.ErrorThrottle("balance", time.Minute, fmt.Sprintf("get group (%s) balance error", group.ID), err.Error())
		abortWithMessage(c, http.StatusInternalServerError, fmt.Sprintf("get group (%s) balance error", group.ID), &errorField{
			Code: "get_group_balance_error",
		})
		return false
	}

	if gbc.GroupBalance <= 0 {
		abortLogWithMessage(c, http.StatusForbidden, fmt.Sprintf("group (%s) balance not enough", group.ID), &errorField{
			Code: "group_balance_not_enough",
		})
		return false
	}
	return true
}

func NewDistribute(mode relaymode.Mode) gin.HandlerFunc {
	return func(c *gin.Context) {
		distribute(c, mode)
	}
}

func distribute(c *gin.Context, mode relaymode.Mode) {
	if config.GetDisableServe() {
		abortLogWithMessage(c, http.StatusServiceUnavailable, "service is under maintenance")
		return
	}

	log := GetLogger(c)

	group := GetGroup(c)

	if !checkGroupBalance(c, group) {
		return
	}

	requestModel, err := getRequestModel(c, mode)
	if err != nil {
		abortLogWithMessage(c, http.StatusInternalServerError, err.Error(), &errorField{
			Type: "invalid_request_error",
			Code: "get_request_model_error",
		})
		return
	}
	if requestModel == "" {
		abortLogWithMessage(c, http.StatusBadRequest, "no model provided", &errorField{
			Type: "invalid_request_error",
			Code: "no_model_provided",
		})
		return
	}

	c.Set(ctxkey.OriginalModel, requestModel)

	SetLogModelFields(log.Data, requestModel)

	token := GetToken(c)
	mc, ok := GetModelCaches(c).ModelConfig.GetModelConfig(requestModel)
	if !ok || len(token.Models) == 0 || !slices.Contains(token.Models, requestModel) {
		abortLogWithMessage(c,
			http.StatusNotFound,
			fmt.Sprintf("The model `%s` does not exist or you do not have access to it.", requestModel),
			&errorField{
				Type: "invalid_request_error",
				Code: "model_not_found",
			},
		)
		return
	}
	c.Set(ctxkey.ModelConfig, mc)

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
			0,
			nil,
		)
		abortLogWithMessage(c, http.StatusTooManyRequests, errMsg, &errorField{
			Type: "invalid_request_error",
			Code: "request_rate_limit_exceeded",
		})
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

func NewMetaByContext(c *gin.Context,
	channel *model.Channel,
	modelName string,
	mode relaymode.Mode,
	opts ...meta.Option,
) *meta.Meta {
	requestID := GetRequestID(c)
	group := GetGroup(c)
	token := GetToken(c)

	opts = append(
		opts,
		meta.WithRequestID(requestID),
		meta.WithGroup(group),
		meta.WithToken(token),
		meta.WithEndpoint(c.Request.URL.Path),
	)

	return meta.NewMeta(
		channel,
		mode,
		modelName,
		GetModelConfig(c),
		opts...,
	)
}

type ModelRequest struct {
	Model string `form:"model" json:"model"`
}

func getRequestModel(c *gin.Context, mode relaymode.Mode) (string, error) {
	path := c.Request.URL.Path
	switch {
	case mode == relaymode.ParsePdf:
		query := c.Request.URL.Query()
		model := query.Get("model")
		if model != "" {
			return model, nil
		}

		fallthrough
	case mode == relaymode.AudioTranscription,
		mode == relaymode.AudioTranslation:
		return c.Request.FormValue("model"), nil

	case strings.HasPrefix(path, "/v1/engines") && strings.HasSuffix(path, "/embeddings"):
		// /engines/:model/embeddings
		return c.Param("model"), nil

	default:
		body, err := common.GetRequestBody(c.Request)
		if err != nil {
			return "", fmt.Errorf("get request model failed: %w", err)
		}
		return GetModelFromJSON(body)
	}
}

func GetModelFromJSON(body []byte) (string, error) {
	node, err := sonic.GetWithOptions(body, ast.SearchOptions{}, "model")
	if err != nil {
		if errors.Is(err, ast.ErrNotExist) {
			return "", nil
		}
		return "", fmt.Errorf("get request model failed: %w", err)
	}
	return node.String()
}
