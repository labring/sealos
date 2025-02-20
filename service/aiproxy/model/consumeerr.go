package model

import (
	"fmt"
	"strings"
	"time"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common"
)

type ConsumeError struct {
	RequestAt  time.Time       `gorm:"index;index:idx_consume_error_group_reqat,priority:2" json:"request_at"`
	CreatedAt  time.Time       `json:"created_at"`
	GroupID    string          `gorm:"index;index:idx_consume_error_group_reqat,priority:1" json:"group_id"`
	RequestID  string          `gorm:"index"                                                json:"request_id"`
	TokenName  EmptyNullString `gorm:"not null"                                             json:"token_name"`
	Model      string          `json:"model"`
	Content    string          `gorm:"type:text"                                            json:"content"`
	ID         int             `gorm:"primaryKey"                                           json:"id"`
	UsedAmount float64         `json:"used_amount"`
	TokenID    int             `json:"token_id"`
}

func (c *ConsumeError) MarshalJSON() ([]byte, error) {
	type Alias ConsumeError
	return json.Marshal(&struct {
		*Alias
		CreatedAt int64 `json:"created_at"`
		RequestAt int64 `json:"request_at"`
	}{
		Alias:     (*Alias)(c),
		CreatedAt: c.CreatedAt.UnixMilli(),
		RequestAt: c.RequestAt.UnixMilli(),
	})
}

func CreateConsumeError(requestID string, requestAt time.Time, group string, tokenName string, model string, content string, usedAmount float64, tokenID int) error {
	return LogDB.Create(&ConsumeError{
		RequestID:  requestID,
		RequestAt:  requestAt,
		GroupID:    group,
		TokenName:  EmptyNullString(tokenName),
		Model:      model,
		Content:    content,
		UsedAmount: usedAmount,
		TokenID:    tokenID,
	}).Error
}

func SearchConsumeError(keyword string, requestID string, group string, tokenName string, model string, content string, usedAmount float64, tokenID int, page int, perPage int, order string) ([]*ConsumeError, int64, error) {
	tx := LogDB.Model(&ConsumeError{})

	// Handle exact match conditions for non-zero values
	if group != "" {
		tx = tx.Where("group_id = ?", group)
	}
	if requestID != "" {
		tx = tx.Where("request_id = ?", requestID)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if model != "" {
		tx = tx.Where("model = ?", model)
	}
	if content != "" {
		tx = tx.Where("content = ?", content)
	}
	if usedAmount > 0 {
		tx = tx.Where("used_amount = ?", usedAmount)
	}
	if tokenID != 0 {
		tx = tx.Where("token_id = ?", tokenID)
	}

	// Handle keyword search for zero value fields
	if keyword != "" {
		var conditions []string
		var values []interface{}

		if tokenID == 0 {
			conditions = append(conditions, "token_id = ?")
			values = append(values, String2Int(keyword))
		}
		if requestID == "" {
			if common.UsingPostgreSQL {
				conditions = append(conditions, "request_id ILIKE ?")
			} else {
				conditions = append(conditions, "request_id LIKE ?")
			}
			values = append(values, "%"+keyword+"%")
		}
		if group == "" {
			if common.UsingPostgreSQL {
				conditions = append(conditions, "group_id ILIKE ?")
			} else {
				conditions = append(conditions, "group_id LIKE ?")
			}
			values = append(values, "%"+keyword+"%")
		}
		if tokenName == "" {
			if common.UsingPostgreSQL {
				conditions = append(conditions, "token_name ILIKE ?")
			} else {
				conditions = append(conditions, "token_name LIKE ?")
			}
			values = append(values, "%"+keyword+"%")
		}
		if model == "" {
			if common.UsingPostgreSQL {
				conditions = append(conditions, "model ILIKE ?")
			} else {
				conditions = append(conditions, "model LIKE ?")
			}
			values = append(values, "%"+keyword+"%")
		}
		if content == "" {
			if common.UsingPostgreSQL {
				conditions = append(conditions, "content ILIKE ?")
			} else {
				conditions = append(conditions, "content LIKE ?")
			}
			values = append(values, "%"+keyword+"%")
		}

		if len(conditions) > 0 {
			tx = tx.Where(fmt.Sprintf("(%s)", strings.Join(conditions, " OR ")), values...)
		}
	}

	var total int64
	err := tx.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	if total <= 0 {
		return nil, 0, nil
	}

	page--
	if page < 0 {
		page = 0
	}

	var errors []*ConsumeError
	err = tx.Order(getLogOrder(order)).Limit(perPage).Offset(page * perPage).Find(&errors).Error
	return errors, total, err
}
