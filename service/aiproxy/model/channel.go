package model

import (
	"fmt"
	"slices"
	"strings"
	"time"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	ErrChannelNotFound = "channel"
)

const (
	ChannelStatusUnknown  = 0
	ChannelStatusEnabled  = 1 // don't use 0, 0 is the default value!
	ChannelStatusDisabled = 2 // also don't use 0
	ChannelStatusFail     = 3
)

type ChannelConfig struct {
	SplitThink bool `json:"split_think"`
}

type Channel struct {
	CreatedAt        time.Time         `gorm:"index"                              json:"created_at"`
	LastTestErrorAt  time.Time         `json:"last_test_error_at"`
	ChannelTests     []*ChannelTest    `gorm:"foreignKey:ChannelID;references:ID" json:"channel_tests,omitempty"`
	BalanceUpdatedAt time.Time         `json:"balance_updated_at"`
	ModelMapping     map[string]string `gorm:"serializer:fastjson;type:text"      json:"model_mapping"`
	Key              string            `gorm:"type:text;index"                    json:"key"`
	Name             string            `gorm:"index"                              json:"name"`
	BaseURL          string            `gorm:"index"                              json:"base_url"`
	Models           []string          `gorm:"serializer:fastjson;type:text"      json:"models"`
	Balance          float64           `json:"balance"`
	ID               int               `gorm:"primaryKey"                         json:"id"`
	UsedAmount       float64           `gorm:"index"                              json:"used_amount"`
	RequestCount     int               `gorm:"index"                              json:"request_count"`
	Status           int               `gorm:"default:1;index"                    json:"status"`
	Type             int               `gorm:"default:0;index"                    json:"type"`
	Priority         int32             `json:"priority"`
	Config           *ChannelConfig    `gorm:"serializer:fastjson;type:text"      json:"config,omitempty"`
}

func (c *Channel) BeforeDelete(tx *gorm.DB) (err error) {
	return tx.Model(&ChannelTest{}).Where("channel_id = ?", c.ID).Delete(&ChannelTest{}).Error
}

const (
	DefaultPriority = 100
)

func (c *Channel) GetPriority() int32 {
	if c.Priority == 0 {
		return DefaultPriority
	}
	return c.Priority
}

func GetModelConfigWithModels(models []string) ([]string, []string, error) {
	if len(models) == 0 || config.GetDisableModelConfig() {
		return models, nil, nil
	}

	where := DB.Model(&ModelConfig{}).Where("model IN ?", models)
	var count int64
	if err := where.Count(&count).Error; err != nil {
		return nil, nil, err
	}
	if count == 0 {
		return nil, models, nil
	}
	if count == int64(len(models)) {
		return models, nil, nil
	}

	var foundModels []string
	if err := where.Pluck("model", &foundModels).Error; err != nil {
		return nil, nil, err
	}
	if len(foundModels) == len(models) {
		return models, nil, nil
	}
	foundModelsMap := make(map[string]struct{}, len(foundModels))
	for _, model := range foundModels {
		foundModelsMap[model] = struct{}{}
	}
	if len(models)-len(foundModels) > 0 {
		missingModels := make([]string, 0, len(models)-len(foundModels))
		for _, model := range models {
			if _, exists := foundModelsMap[model]; !exists {
				missingModels = append(missingModels, model)
			}
		}
		return foundModels, missingModels, nil
	}
	return foundModels, nil, nil
}

func CheckModelConfigExist(models []string) error {
	_, missingModels, err := GetModelConfigWithModels(models)
	if err != nil {
		return err
	}
	if len(missingModels) > 0 {
		slices.Sort(missingModels)
		return fmt.Errorf("model config not found: %v", missingModels)
	}
	return nil
}

func (c *Channel) MarshalJSON() ([]byte, error) {
	type Alias Channel
	return json.Marshal(&struct {
		*Alias
		CreatedAt        int64 `json:"created_at"`
		BalanceUpdatedAt int64 `json:"balance_updated_at"`
		LastTestErrorAt  int64 `json:"last_test_error_at"`
	}{
		Alias:            (*Alias)(c),
		CreatedAt:        c.CreatedAt.UnixMilli(),
		BalanceUpdatedAt: c.BalanceUpdatedAt.UnixMilli(),
		LastTestErrorAt:  c.LastTestErrorAt.UnixMilli(),
	})
}

//nolint:goconst
func getChannelOrder(order string) string {
	prefix, suffix, _ := strings.Cut(order, "-")
	switch prefix {
	case "name", "type", "created_at", "status", "test_at", "balance_updated_at", "used_amount", "request_count", "priority", "id":
		switch suffix {
		case "asc":
			return prefix + " asc"
		default:
			return prefix + " desc"
		}
	default:
		return "id desc"
	}
}

func GetAllChannels() (channels []*Channel, err error) {
	tx := DB.Model(&Channel{})
	err = tx.Order("id desc").Find(&channels).Error
	return channels, err
}

func GetChannels(startIdx int, num int, id int, name string, key string, channelType int, baseURL string, order string) (channels []*Channel, total int64, err error) {
	tx := DB.Model(&Channel{})
	if id != 0 {
		tx = tx.Where("id = ?", id)
	}
	if name != "" {
		tx = tx.Where("name = ?", name)
	}
	if key != "" {
		tx = tx.Where("key = ?", key)
	}
	if channelType != 0 {
		tx = tx.Where("type = ?", channelType)
	}
	if baseURL != "" {
		tx = tx.Where("base_url = ?", baseURL)
	}
	err = tx.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	if total <= 0 {
		return nil, 0, nil
	}
	err = tx.Order(getChannelOrder(order)).Limit(num).Offset(startIdx).Find(&channels).Error
	return channels, total, err
}

func SearchChannels(keyword string, startIdx int, num int, id int, name string, key string, channelType int, baseURL string, order string) (channels []*Channel, total int64, err error) {
	tx := DB.Model(&Channel{})

	// Handle exact match conditions for non-zero values
	if id != 0 {
		tx = tx.Where("id = ?", id)
	}
	if name != "" {
		tx = tx.Where("name = ?", name)
	}
	if key != "" {
		tx = tx.Where("key = ?", key)
	}
	if channelType != 0 {
		tx = tx.Where("type = ?", channelType)
	}
	if baseURL != "" {
		tx = tx.Where("base_url = ?", baseURL)
	}

	// Handle keyword search for zero value fields
	if keyword != "" {
		var conditions []string
		var values []interface{}

		if id == 0 {
			conditions = append(conditions, "id = ?")
			values = append(values, String2Int(keyword))
		}
		if channelType == 0 {
			conditions = append(conditions, "type = ?")
			values = append(values, String2Int(keyword))
		}
		if name == "" {
			if common.UsingPostgreSQL {
				conditions = append(conditions, "name ILIKE ?")
			} else {
				conditions = append(conditions, "name LIKE ?")
			}
			values = append(values, "%"+keyword+"%")
		}
		if key == "" {
			if common.UsingPostgreSQL {
				conditions = append(conditions, "key ILIKE ?")
			} else {
				conditions = append(conditions, "key LIKE ?")
			}
			values = append(values, "%"+keyword+"%")
		}
		if baseURL == "" {
			if common.UsingPostgreSQL {
				conditions = append(conditions, "base_url ILIKE ?")
			} else {
				conditions = append(conditions, "base_url LIKE ?")
			}
			values = append(values, "%"+keyword+"%")
		}

		if common.UsingPostgreSQL {
			conditions = append(conditions, "models ILIKE ?")
		} else {
			conditions = append(conditions, "models LIKE ?")
		}
		values = append(values, "%"+keyword+"%")

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
	err = tx.Order(getChannelOrder(order)).Limit(num).Offset(startIdx).Find(&channels).Error
	return channels, total, err
}

func GetChannelByID(id int) (*Channel, error) {
	channel := Channel{ID: id}
	err := DB.First(&channel, "id = ?", id).Error
	return &channel, HandleNotFound(err, ErrChannelNotFound)
}

func BatchInsertChannels(channels []*Channel) error {
	for _, channel := range channels {
		if err := CheckModelConfigExist(channel.Models); err != nil {
			return err
		}
	}
	return DB.Transaction(func(tx *gorm.DB) error {
		return tx.Create(&channels).Error
	})
}

func UpdateChannel(channel *Channel) error {
	if err := CheckModelConfigExist(channel.Models); err != nil {
		return err
	}
	result := DB.
		Model(channel).
		Select("model_mapping", "key", "name", "base_url", "models", "type", "priority", "config").
		Clauses(clause.Returning{}).
		Where("id = ?", channel.ID).
		Updates(channel)
	return HandleUpdateResult(result, ErrChannelNotFound)
}

func ClearLastTestErrorAt(id int) error {
	result := DB.Model(&Channel{}).Where("id = ?", id).Update("last_test_error_at", gorm.Expr("NULL"))
	return HandleUpdateResult(result, ErrChannelNotFound)
}

func (c *Channel) UpdateModelTest(testAt time.Time, model, actualModel string, mode int, took float64, success bool, response string, code int) (*ChannelTest, error) {
	var ct *ChannelTest
	err := DB.Transaction(func(tx *gorm.DB) error {
		if !success {
			result := tx.Model(&Channel{}).Where("id = ?", c.ID).Update("last_test_error_at", testAt)
			if err := HandleUpdateResult(result, ErrChannelNotFound); err != nil {
				return err
			}
		} else if !c.LastTestErrorAt.IsZero() && time.Since(c.LastTestErrorAt) > time.Hour {
			result := tx.Model(&Channel{}).Where("id = ?", c.ID).Update("last_test_error_at", gorm.Expr("NULL"))
			if err := HandleUpdateResult(result, ErrChannelNotFound); err != nil {
				return err
			}
		}
		ct = &ChannelTest{
			ChannelID:   c.ID,
			ChannelType: c.Type,
			ChannelName: c.Name,
			Model:       model,
			ActualModel: actualModel,
			Mode:        mode,
			TestAt:      testAt,
			Took:        took,
			Success:     success,
			Response:    response,
			Code:        code,
		}
		result := tx.Save(ct)
		return HandleUpdateResult(result, ErrChannelNotFound)
	})
	if err != nil {
		return nil, err
	}
	return ct, nil
}

func (c *Channel) UpdateBalance(balance float64) error {
	result := DB.Model(&Channel{}).
		Select("balance_updated_at", "balance").
		Where("id = ?", c.ID).
		Updates(Channel{
			BalanceUpdatedAt: time.Now(),
			Balance:          balance,
		})
	return HandleUpdateResult(result, ErrChannelNotFound)
}

func DeleteChannelByID(id int) error {
	result := DB.Delete(&Channel{ID: id})
	return HandleUpdateResult(result, ErrChannelNotFound)
}

func DeleteChannelsByIDs(ids []int) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		return tx.
			Where("id IN (?)", ids).
			Delete(&Channel{}).
			Error
	})
}

func UpdateChannelStatusByID(id int, status int) error {
	result := DB.Model(&Channel{}).
		Where("id = ?", id).
		Update("status", status)
	return HandleUpdateResult(result, ErrChannelNotFound)
}

func UpdateChannelUsedAmount(id int, amount float64, requestCount int) error {
	result := DB.Model(&Channel{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"used_amount":   gorm.Expr("used_amount + ?", amount),
			"request_count": gorm.Expr("request_count + ?", requestCount),
		})
	return HandleUpdateResult(result, ErrChannelNotFound)
}

func DeleteDisabledChannel() error {
	result := DB.Where("status = ?", ChannelStatusDisabled).Delete(&Channel{})
	return HandleUpdateResult(result, ErrChannelNotFound)
}

func DeleteFailChannel() error {
	result := DB.Where("status = ?", ChannelStatusFail).Delete(&Channel{})
	return HandleUpdateResult(result, ErrChannelNotFound)
}
