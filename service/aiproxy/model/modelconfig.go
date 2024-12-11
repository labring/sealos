package model

import (
	"fmt"
	"strings"
	"time"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common"
	"gorm.io/gorm"
)

//nolint:revive
type ModelConfigKey string

const (
	ModelConfigMaxContextTokensKey ModelConfigKey = "max_context_tokens"
	ModelConfigMaxInputTokensKey   ModelConfigKey = "max_input_tokens"
	ModelConfigMaxOutputTokensKey  ModelConfigKey = "max_output_tokens"
	ModelConfigToolChoiceKey       ModelConfigKey = "tool_choice"
	ModelConfigFunctionCallingKey  ModelConfigKey = "function_calling"
	ModelConfigSupportFormatsKey   ModelConfigKey = "support_formats"
	ModelConfigSupportVoicesKey    ModelConfigKey = "support_voices"
)

//nolint:revive
type ModelOwner string

const (
	ModelOwnerOpenAI      ModelOwner = "openai"
	ModelOwnerAlibaba     ModelOwner = "alibaba"
	ModelOwnerTencent     ModelOwner = "tencent"
	ModelOwnerXunfei      ModelOwner = "xunfei"
	ModelOwnerDeepSeek    ModelOwner = "deepseek"
	ModelOwnerMoonshot    ModelOwner = "moonshot"
	ModelOwnerMiniMax     ModelOwner = "minimax"
	ModelOwnerBaidu       ModelOwner = "baidu"
	ModelOwnerGoogle      ModelOwner = "google"
	ModelOwnerBAAI        ModelOwner = "baai"
	ModelOwnerFunAudioLLM ModelOwner = "funaudiollm"
	ModelOwnerDoubao      ModelOwner = "doubao"
	ModelOwnerFishAudio   ModelOwner = "fishaudio"
	ModelOwnerChatGLM     ModelOwner = "chatglm"
	ModelOwnerStabilityAI ModelOwner = "stabilityai"
	ModelOwnerNetease     ModelOwner = "netease"
	ModelOwnerAI360       ModelOwner = "ai360"
	ModelOwnerAnthropic   ModelOwner = "anthropic"
	ModelOwnerMeta        ModelOwner = "meta"
	ModelOwnerBaichuan    ModelOwner = "baichuan"
	ModelOwnerMistral     ModelOwner = "mistral"
	ModelOwnerOpenChat    ModelOwner = "openchat"
	ModelOwnerMicrosoft   ModelOwner = "microsoft"
	ModelOwnerDefog       ModelOwner = "defog"
	ModelOwnerNexusFlow   ModelOwner = "nexusflow"
	ModelOwnerCohere      ModelOwner = "cohere"
	ModelOwnerHuggingFace ModelOwner = "huggingface"
	ModelOwnerLingyiWanwu ModelOwner = "lingyiwanwu"
	ModelOwnerStepFun     ModelOwner = "stepfun"
)

//nolint:revive
type ModelConfig struct {
	CreatedAt         time.Time              `gorm:"index;autoCreateTime"          json:"created_at"`
	UpdatedAt         time.Time              `gorm:"index;autoUpdateTime"          json:"updated_at"`
	Config            map[ModelConfigKey]any `gorm:"serializer:fastjson;type:text" json:"config,omitempty"`
	ImagePrices       map[string]float64     `gorm:"serializer:fastjson"           json:"image_prices"`
	Model             string                 `gorm:"primaryKey"                    json:"model"`
	Owner             ModelOwner             `gorm:"type:varchar(255);index"       json:"owner"`
	ImageMaxBatchSize int                    `json:"image_batch_size"`
	// relaymode/define.go
	Type        int     `json:"type"`
	InputPrice  float64 `json:"input_price"`
	OutputPrice float64 `json:"output_price"`
}

func (c *ModelConfig) MarshalJSON() ([]byte, error) {
	type Alias ModelConfig
	return json.Marshal(&struct {
		*Alias
		CreatedAt int64 `json:"created_at,omitempty"`
		UpdatedAt int64 `json:"updated_at,omitempty"`
	}{
		Alias:     (*Alias)(c),
		CreatedAt: c.CreatedAt.UnixMilli(),
		UpdatedAt: c.UpdatedAt.UnixMilli(),
	})
}

func GetModelConfigs(startIdx int, num int, model string) (configs []*ModelConfig, total int64, err error) {
	tx := DB.Model(&ModelConfig{})
	if model != "" {
		tx = tx.Where("model = ?", model)
	}
	err = tx.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	if total <= 0 {
		return nil, 0, nil
	}
	err = tx.Order("created_at desc").Limit(num).Offset(startIdx).Find(&configs).Error
	return configs, total, err
}

func GetAllModelConfigs() (configs []*ModelConfig, err error) {
	tx := DB.Model(&ModelConfig{})
	err = tx.Order("created_at desc").Find(&configs).Error
	return configs, err
}

func GetModelConfigsByModels(models []string) (configs []*ModelConfig, err error) {
	tx := DB.Model(&ModelConfig{}).Where("model IN (?)", models)
	err = tx.Order("created_at desc").Find(&configs).Error
	return configs, err
}

func GetModelConfig(model string) (*ModelConfig, error) {
	config := &ModelConfig{}
	err := DB.Model(&ModelConfig{}).Where("model = ?", model).First(config).Error
	return config, HandleNotFound(err, ErrModelConfigNotFound)
}

func SearchModelConfigs(keyword string, startIdx int, num int, model string, owner ModelOwner) (configs []*ModelConfig, total int64, err error) {
	tx := DB.Model(&ModelConfig{}).Where("model LIKE ?", "%"+keyword+"%")
	if model != "" {
		tx = tx.Where("model = ?", model)
	}
	if owner != "" {
		tx = tx.Where("owner = ?", owner)
	}
	if keyword != "" {
		var conditions []string
		var values []interface{}

		if model == "" {
			if common.UsingPostgreSQL {
				conditions = append(conditions, "model ILIKE ?")
			} else {
				conditions = append(conditions, "model LIKE ?")
			}
			values = append(values, "%"+keyword+"%")
		}

		if owner != "" {
			if common.UsingPostgreSQL {
				conditions = append(conditions, "owner ILIKE ?")
			} else {
				conditions = append(conditions, "owner LIKE ?")
			}
			values = append(values, "%"+string(owner)+"%")
		}

		if len(conditions) > 0 {
			tx = tx.Where(fmt.Sprintf("(%s)", strings.Join(conditions, " OR ")), values...)
		}
	}
	err = tx.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	if total <= 0 {
		return nil, 0, nil
	}
	err = tx.Order("created_at desc").Limit(num).Offset(startIdx).Find(&configs).Error
	return configs, total, err
}

func SaveModelConfig(config *ModelConfig) error {
	return DB.Save(config).Error
}

func SaveModelConfigs(configs []*ModelConfig) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		for _, config := range configs {
			if err := tx.Save(config).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

const ErrModelConfigNotFound = "model config"

func DeleteModelConfig(model string) error {
	result := DB.Where("model = ?", model).Delete(&ModelConfig{})
	return HandleUpdateResult(result, ErrModelConfigNotFound)
}

func DeleteModelConfigsByModels(models []string) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		return tx.
			Where("model IN (?)", models).
			Delete(&ModelConfig{}).
			Error
	})
}
