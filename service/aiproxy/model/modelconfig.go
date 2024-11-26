package model

import (
	"time"

	json "github.com/json-iterator/go"
)

//nolint:revive
type ModelConfigItem struct {
	Config map[string]any `gorm:"serializer:fastjson" json:"config,omitempty"`
	Model  string         `gorm:"primaryKey"          json:"model"`
	// relaymode/define.go
	Type        int     `json:"type"`
	InputPrice  float64 `json:"input_price"`
	OutputPrice float64 `json:"output_price"`
}

//nolint:revive
type ModelConfig struct {
	CreatedAt       time.Time `gorm:"index"`
	UpdatedAt       time.Time `gorm:"index"`
	ModelConfigItem `gorm:"embedded"`
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

func SearchModelConfigs(keyword string, startIdx int, num int) (configs []*ModelConfig, err error) {
	tx := DB.Model(&ModelConfig{}).Where("model LIKE ?", "%"+keyword+"%")
	err = tx.Order("created_at desc").Limit(num).Offset(startIdx).Find(&configs).Error
	return configs, err
}

func SaveModelConfig(config *ModelConfig) error {
	return DB.Omit("created_at", "updated_at").Save(config).Error
}

func SaveModelConfigs(configs []*ModelConfig) error {
	return DB.Omit("created_at", "updated_at").Save(configs).Error
}

const ErrModelConfigNotFound = "model config"

func DeleteModelConfigByModel(model string) error {
	result := DB.Where("model = ?", model).Delete(&ModelConfig{})
	return HandleUpdateResult(result, ErrModelConfigNotFound)
}
