package model

import (
	"fmt"
	"strings"
	"time"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common"
	"gorm.io/gorm"
)

const (
	// /1K tokens
	PriceUnit = 1000
)

//nolint:revive
type ModelConfig struct {
	CreatedAt         time.Time              `gorm:"index;autoCreateTime"          json:"created_at"`
	UpdatedAt         time.Time              `gorm:"index;autoUpdateTime"          json:"updated_at"`
	Config            map[ModelConfigKey]any `gorm:"serializer:fastjson;type:text" json:"config,omitempty"`
	ImagePrices       map[string]float64     `gorm:"serializer:fastjson"           json:"image_prices,omitempty"`
	Model             string                 `gorm:"primaryKey"                    json:"model"`
	Owner             ModelOwner             `gorm:"type:varchar(255);index"       json:"owner"`
	ImageMaxBatchSize int                    `json:"image_batch_size,omitempty"`
	Type              int                    `json:"type"` // relaymode/define.go
	InputPrice        float64                `json:"input_price,omitempty"`
	OutputPrice       float64                `json:"output_price,omitempty"`
	RPM               int64                  `json:"rpm,omitempty"`
	TPM               int64                  `json:"tpm,omitempty"`
}

func NewDefaultModelConfig(model string) *ModelConfig {
	return &ModelConfig{
		Model: model,
	}
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

func (c *ModelConfig) MaxContextTokens() (int, bool) {
	return GetModelConfigInt(c.Config, ModelConfigMaxContextTokensKey)
}

func (c *ModelConfig) MaxInputTokens() (int, bool) {
	return GetModelConfigInt(c.Config, ModelConfigMaxInputTokensKey)
}

func (c *ModelConfig) MaxOutputTokens() (int, bool) {
	return GetModelConfigInt(c.Config, ModelConfigMaxOutputTokensKey)
}

func (c *ModelConfig) SupportVision() (bool, bool) {
	return GetModelConfigBool(c.Config, ModelConfigVisionKey)
}

func (c *ModelConfig) SupportVoices() ([]string, bool) {
	return GetModelConfigStringSlice(c.Config, ModelConfigSupportVoicesKey)
}

func (c *ModelConfig) SupportToolChoice() (bool, bool) {
	return GetModelConfigBool(c.Config, ModelConfigToolChoiceKey)
}

func (c *ModelConfig) SupportFormats() ([]string, bool) {
	return GetModelConfigStringSlice(c.Config, ModelConfigSupportFormatsKey)
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
