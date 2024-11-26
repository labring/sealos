package model

import (
	"fmt"
	"strings"
	"time"

	json "github.com/json-iterator/go"

	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/helper"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	ErrChannelNotFound = "channel"
)

const (
	ChannelStatusUnknown          = 0
	ChannelStatusEnabled          = 1 // don't use 0, 0 is the default value!
	ChannelStatusManuallyDisabled = 2 // also don't use 0
	ChannelStatusAutoDisabled     = 3
)

type Channel struct {
	CreatedAt        time.Time         `gorm:"index"                         json:"created_at"`
	AccessedAt       time.Time         `json:"accessed_at"`
	TestAt           time.Time         `json:"test_at"`
	BalanceUpdatedAt time.Time         `json:"balance_updated_at"`
	ModelMapping     map[string]string `gorm:"serializer:fastjson;type:text" json:"model_mapping"`
	Config           ChannelConfig     `gorm:"serializer:fastjson;type:text" json:"config"`
	Other            string            `json:"other"`
	Key              string            `gorm:"type:text;index"               json:"key"`
	Name             string            `gorm:"index"                         json:"name"`
	BaseURL          string            `gorm:"index"                         json:"base_url"`
	Models           []string          `gorm:"serializer:fastjson;type:text" json:"models"`
	Balance          float64           `json:"balance"`
	ResponseDuration int64             `gorm:"index"                         json:"response_duration"`
	ID               int               `gorm:"primaryKey"                    json:"id"`
	UsedAmount       float64           `gorm:"index"                         json:"used_amount"`
	RequestCount     int               `gorm:"index"                         json:"request_count"`
	Status           int               `gorm:"default:1;index"               json:"status"`
	Type             int               `gorm:"default:0;index"               json:"type"`
	Priority         int32             `json:"priority"`
}

func (c *Channel) BeforeCreate(tx *gorm.DB) (err error) {
	return c.BeforeSave(tx)
}

// check model config exist
func (c *Channel) BeforeSave(tx *gorm.DB) (err error) {
	if len(c.Models) == 0 {
		return nil
	}
	_, missingModels := CacheCheckModelConfig(c.Models)
	if len(missingModels) > 0 {
		return fmt.Errorf("model config not found: %v", missingModels)
	}
	return nil
}

func (c *Channel) MarshalJSON() ([]byte, error) {
	type Alias Channel
	return json.Marshal(&struct {
		*Alias
		CreatedAt        int64 `json:"created_at"`
		AccessedAt       int64 `json:"accessed_at"`
		TestAt           int64 `json:"test_at"`
		BalanceUpdatedAt int64 `json:"balance_updated_at"`
	}{
		Alias:            (*Alias)(c),
		CreatedAt:        c.CreatedAt.UnixMilli(),
		AccessedAt:       c.AccessedAt.UnixMilli(),
		TestAt:           c.TestAt.UnixMilli(),
		BalanceUpdatedAt: c.BalanceUpdatedAt.UnixMilli(),
	})
}

//nolint:goconst
func getChannelOrder(order string) string {
	switch order {
	case "name":
		return "name asc"
	case "name-desc":
		return "name desc"
	case "type":
		return "type asc"
	case "type-desc":
		return "type desc"
	case "created_at":
		return "created_at asc"
	case "created_at-desc":
		return "created_at desc"
	case "accessed_at":
		return "accessed_at asc"
	case "accessed_at-desc":
		return "accessed_at desc"
	case "status":
		return "status asc"
	case "status-desc":
		return "status desc"
	case "test_at":
		return "test_at asc"
	case "test_at-desc":
		return "test_at desc"
	case "balance_updated_at":
		return "balance_updated_at asc"
	case "balance_updated_at-desc":
		return "balance_updated_at desc"
	case "used_amount":
		return "used_amount asc"
	case "used_amount-desc":
		return "used_amount desc"
	case "request_count":
		return "request_count asc"
	case "request_count-desc":
		return "request_count desc"
	case "priority":
		return "priority asc"
	case "priority-desc":
		return "priority desc"
	case "id":
		return "id asc"
	default:
		return "id desc"
	}
}

type ChannelConfig struct {
	Region            string `json:"region,omitempty"`
	SK                string `json:"sk,omitempty"`
	AK                string `json:"ak,omitempty"`
	UserID            string `json:"user_id,omitempty"`
	APIVersion        string `json:"api_version,omitempty"`
	LibraryID         string `json:"library_id,omitempty"`
	Plugin            string `json:"plugin,omitempty"`
	VertexAIProjectID string `json:"vertex_ai_project_id,omitempty"`
	VertexAIADC       string `json:"vertex_ai_adc,omitempty"`
}

func GetAllChannels(onlyDisabled bool, omitKey bool) (channels []*Channel, err error) {
	tx := DB.Model(&Channel{})
	if onlyDisabled {
		tx = tx.Where("status = ? or status = ?", ChannelStatusAutoDisabled, ChannelStatusManuallyDisabled)
	}
	if omitKey {
		tx = tx.Omit("key")
	}
	err = tx.Order("id desc").Find(&channels).Error
	return channels, err
}

func GetChannels(startIdx int, num int, onlyDisabled bool, omitKey bool, id int, name string, key string, channelType int, baseURL string, order string) (channels []*Channel, total int64, err error) {
	tx := DB.Model(&Channel{})
	if onlyDisabled {
		tx = tx.Where("status = ? or status = ?", ChannelStatusAutoDisabled, ChannelStatusManuallyDisabled)
	}
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
	if omitKey {
		tx = tx.Omit("key")
	}
	if total <= 0 {
		return nil, 0, nil
	}
	err = tx.Order(getChannelOrder(order)).Limit(num).Offset(startIdx).Find(&channels).Error
	return channels, total, err
}

func SearchChannels(keyword string, startIdx int, num int, onlyDisabled bool, omitKey bool, id int, name string, key string, channelType int, baseURL string, order string) (channels []*Channel, total int64, err error) {
	tx := DB.Model(&Channel{})
	if onlyDisabled {
		tx = tx.Where("status = ? or status = ?", ChannelStatusAutoDisabled, ChannelStatusManuallyDisabled)
	}

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
			values = append(values, helper.String2Int(keyword))
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
		if channelType == 0 {
			conditions = append(conditions, "type = ?")
			values = append(values, helper.String2Int(keyword))
		}
		if baseURL == "" {
			if common.UsingPostgreSQL {
				conditions = append(conditions, "base_url ILIKE ?")
			} else {
				conditions = append(conditions, "base_url LIKE ?")
			}
			values = append(values, "%"+keyword+"%")
		}

		if len(conditions) > 0 {
			tx = tx.Where(fmt.Sprintf("(%s)", strings.Join(conditions, " OR ")), values...)
		}
	}

	err = tx.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	if omitKey {
		tx = tx.Omit("key")
	}
	if total <= 0 {
		return nil, 0, nil
	}
	err = tx.Order(getChannelOrder(order)).Limit(num).Offset(startIdx).Find(&channels).Error
	return channels, total, err
}

func GetChannelByID(id int, omitKey bool) (*Channel, error) {
	channel := Channel{ID: id}
	var err error
	if omitKey {
		err = DB.Omit("key").First(&channel, "id = ?", id).Error
	} else {
		err = DB.First(&channel, "id = ?", id).Error
	}
	if err != nil {
		return nil, err
	}
	return &channel, nil
}

func BatchInsertChannels(channels []*Channel) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		return tx.Create(&channels).Error
	})
}

func UpdateChannel(channel *Channel) error {
	result := DB.
		Model(channel).
		Omit("accessed_at", "used_amount", "request_count", "balance_updated_at", "created_at", "balance", "test_at", "balance_updated_at").
		Clauses(clause.Returning{}).
		Updates(channel)
	return HandleUpdateResult(result, ErrChannelNotFound)
}

func (c *Channel) UpdateResponseTime(responseTime int64) {
	err := DB.Model(c).Select("test_at", "response_duration").Updates(Channel{
		TestAt:           time.Now(),
		ResponseDuration: responseTime,
	}).Error
	if err != nil {
		logger.SysError("failed to update response time: " + err.Error())
	}
}

func (c *Channel) UpdateBalance(balance float64) {
	err := DB.Model(c).Select("balance_updated_at", "balance").Updates(Channel{
		BalanceUpdatedAt: time.Now(),
		Balance:          balance,
	}).Error
	if err != nil {
		logger.SysError("failed to update balance: " + err.Error())
	}
}

func DeleteChannelByID(id int) error {
	result := DB.Delete(&Channel{ID: id})
	return HandleUpdateResult(result, ErrChannelNotFound)
}

func UpdateChannelStatusByID(id int, status int) error {
	result := DB.Model(&Channel{}).Where("id = ?", id).Update("status", status)
	return HandleUpdateResult(result, ErrChannelNotFound)
}

func DisableChannelByID(id int) error {
	return UpdateChannelStatusByID(id, ChannelStatusAutoDisabled)
}

func EnableChannelByID(id int) error {
	return UpdateChannelStatusByID(id, ChannelStatusEnabled)
}

func UpdateChannelUsedAmount(id int, amount float64, requestCount int) error {
	result := DB.Model(&Channel{}).Where("id = ?", id).Updates(map[string]interface{}{
		"used_amount":   gorm.Expr("used_amount + ?", amount),
		"request_count": gorm.Expr("request_count + ?", requestCount),
		"accessed_at":   time.Now(),
	})
	return HandleUpdateResult(result, ErrChannelNotFound)
}

func DeleteDisabledChannel() error {
	result := DB.Where("status = ? or status = ?", ChannelStatusAutoDisabled, ChannelStatusManuallyDisabled).Delete(&Channel{})
	return HandleUpdateResult(result, ErrChannelNotFound)
}
