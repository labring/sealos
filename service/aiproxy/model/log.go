package model

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	json "github.com/json-iterator/go"

	"github.com/labring/sealos/service/aiproxy/common"
)

type Log struct {
	CreatedAt        time.Time `gorm:"index" json:"created_at"`
	TokenName        string    `gorm:"index" json:"token_name"`
	Endpoint         string    `gorm:"index" json:"endpoint"`
	Content          string    `gorm:"type:text" json:"content"`
	GroupId          string    `gorm:"index" json:"group"`
	Model            string    `gorm:"index" json:"model"`
	Price            float64   `json:"price"`
	Id               int       `json:"id"`
	CompletionPrice  float64   `json:"completion_price"`
	TokenId          int       `gorm:"index" json:"token_id"`
	UsedAmount       float64   `gorm:"index" json:"used_amount"`
	PromptTokens     int       `json:"prompt_tokens"`
	CompletionTokens int       `json:"completion_tokens"`
	ChannelId        int       `gorm:"index" json:"channel"`
	Code             int       `gorm:"index" json:"code"`
}

func (l *Log) MarshalJSON() ([]byte, error) {
	type Alias Log
	return json.Marshal(&struct {
		Alias
		CreatedAt int64 `json:"created_at"`
	}{
		Alias:     (Alias)(*l),
		CreatedAt: l.CreatedAt.UnixMilli(),
	})
}

func RecordConsumeLog(ctx context.Context, group string, code int, channelId int, promptTokens int, completionTokens int, modelName string, tokenId int, tokenName string, amount float64, price float64, completionPrice float64, endpoint string, content string) error {
	log := &Log{
		GroupId:          group,
		CreatedAt:        time.Now(),
		Code:             code,
		PromptTokens:     promptTokens,
		CompletionTokens: completionTokens,
		TokenId:          tokenId,
		TokenName:        tokenName,
		Model:            modelName,
		UsedAmount:       amount,
		Price:            price,
		CompletionPrice:  completionPrice,
		ChannelId:        channelId,
		Endpoint:         endpoint,
		Content:          content,
	}
	return LOG_DB.Create(log).Error
}

func getLogOrder(order string) string {
	orderBy := "id desc"
	switch order {
	case "id":
		orderBy = "id asc"
	case "id-desc":
		orderBy = "id desc"
	case "used_amount":
		orderBy = "used_amount asc"
	case "used_amount-desc":
		orderBy = "used_amount desc"
	case "price":
		orderBy = "price asc"
	case "price-desc":
		orderBy = "price desc"
	case "completion_price":
		orderBy = "completion_price asc"
	case "completion_price-desc":
		orderBy = "completion_price desc"
	case "token_id":
		orderBy = "token_id asc"
	case "token_id-desc":
		orderBy = "token_id desc"
	case "token_name":
		orderBy = "token_name asc"
	case "token_name-desc":
		orderBy = "token_name desc"
	case "prompt_tokens":
		orderBy = "prompt_tokens asc"
	case "prompt_tokens-desc":
		orderBy = "prompt_tokens desc"
	case "completion_tokens":
		orderBy = "completion_tokens asc"
	case "completion_tokens-desc":
		orderBy = "completion_tokens desc"
	case "endpoint":
		orderBy = "endpoint asc"
	case "endpoint-desc":
		orderBy = "endpoint desc"
	case "group":
		orderBy = "group_id asc"
	case "group-desc":
		orderBy = "group_id desc"
	case "created_at":
		orderBy = "created_at asc"
	case "created_at-desc":
		orderBy = "created_at desc"
	}
	return orderBy
}

func GetLogs(startTimestamp time.Time, endTimestamp time.Time, code int, modelName string, group string, tokenId int, tokenName string, startIdx int, num int, channel int, endpoint string, content string, order string) (logs []*Log, total int64, err error) {
	tx := LOG_DB.Model(&Log{})
	if modelName != "" {
		tx = tx.Where("model = ?", modelName)
	}
	if group != "" {
		tx = tx.Where("group_id = ?", group)
	}
	if tokenId != 0 {
		tx = tx.Where("token_id = ?", tokenId)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if !startTimestamp.IsZero() {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if !endTimestamp.IsZero() {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	if channel != 0 {
		tx = tx.Where("channel_id = ?", channel)
	}
	if endpoint != "" {
		tx = tx.Where("endpoint = ?", endpoint)
	}
	if content != "" {
		tx = tx.Where("content = ?", content)
	}
	if code != 0 {
		tx = tx.Where("code = ?", code)
	}
	err = tx.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	if total <= 0 {
		return nil, 0, nil
	}

	err = tx.Order(getLogOrder(order)).Limit(num).Offset(startIdx).Find(&logs).Error
	return logs, total, err
}

func GetGroupLogs(group string, startTimestamp time.Time, endTimestamp time.Time, code int, modelName string, tokenId int, tokenName string, startIdx int, num int, channel int, endpoint string, content string, order string) (logs []*Log, total int64, err error) {
	tx := LOG_DB.Model(&Log{}).Where("group_id = ?", group)
	if modelName != "" {
		tx = tx.Where("model = ?", modelName)
	}
	if tokenId != 0 {
		tx = tx.Where("token_id = ?", tokenId)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if !startTimestamp.IsZero() {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if !endTimestamp.IsZero() {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	if channel != 0 {
		tx = tx.Where("channel_id = ?", channel)
	}
	if endpoint != "" {
		tx = tx.Where("endpoint = ?", endpoint)
	}
	if content != "" {
		tx = tx.Where("content = ?", content)
	}
	if code != 0 {
		tx = tx.Where("code = ?", code)
	}
	err = tx.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	if total <= 0 {
		return nil, 0, nil
	}

	err = tx.Order(getLogOrder(order)).Limit(num).Offset(startIdx).Omit("id").Find(&logs).Error
	return logs, total, err
}

func SearchLogs(keyword string, page int, perPage int, code int, endpoint string, groupId string, tokenId int, tokenName string, modelName string, content string, startTimestamp time.Time, endTimestamp time.Time, channel int, order string) (logs []*Log, total int64, err error) {
	tx := LOG_DB.Model(&Log{})

	// Handle exact match conditions for non-zero values
	if code != 0 {
		tx = tx.Where("code = ?", code)
	}
	if endpoint != "" {
		tx = tx.Where("endpoint = ?", endpoint)
	}
	if groupId != "" {
		tx = tx.Where("group_id = ?", groupId)
	}
	if tokenId != 0 {
		tx = tx.Where("token_id = ?", tokenId)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if modelName != "" {
		tx = tx.Where("model = ?", modelName)
	}
	if content != "" {
		tx = tx.Where("content = ?", content)
	}
	if !startTimestamp.IsZero() {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if !endTimestamp.IsZero() {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	if channel != 0 {
		tx = tx.Where("channel_id = ?", channel)
	}

	// Handle keyword search for zero value fields
	if keyword != "" {
		var conditions []string
		var values []interface{}

		if code == 0 {
			conditions = append(conditions, "code = ?")
			values = append(values, keyword)
		}
		if channel == 0 {
			conditions = append(conditions, "channel_id = ?")
			values = append(values, keyword)
		}
		if endpoint == "" {
			if common.UsingPostgreSQL {
				conditions = append(conditions, "endpoint ILIKE ?")
			} else {
				conditions = append(conditions, "endpoint LIKE ?")
			}
			values = append(values, "%"+keyword+"%")
		}
		if groupId == "" {
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
		if modelName == "" {
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

	err = tx.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	if total <= 0 {
		return nil, 0, nil
	}

	page -= 1
	if page < 0 {
		page = 0
	}
	err = tx.Order(getLogOrder(order)).Limit(perPage).Offset(page * perPage).Find(&logs).Error
	return logs, total, err
}

func SearchGroupLogs(group string, keyword string, page int, perPage int, code int, endpoint string, tokenId int, tokenName string, modelName string, content string, startTimestamp time.Time, endTimestamp time.Time, channel int, order string) (logs []*Log, total int64, err error) {
	if group == "" {
		return nil, 0, errors.New("group is empty")
	}
	tx := LOG_DB.Model(&Log{}).Where("group_id = ?", group)

	// Handle exact match conditions for non-zero values
	if code != 0 {
		tx = tx.Where("code = ?", code)
	}
	if endpoint != "" {
		tx = tx.Where("endpoint = ?", endpoint)
	}
	if tokenId != 0 {
		tx = tx.Where("token_id = ?", tokenId)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if modelName != "" {
		tx = tx.Where("model = ?", modelName)
	}
	if content != "" {
		tx = tx.Where("content = ?", content)
	}
	if !startTimestamp.IsZero() {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if !endTimestamp.IsZero() {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	if channel != 0 {
		tx = tx.Where("channel_id = ?", channel)
	}

	// Handle keyword search for zero value fields
	if keyword != "" {
		var conditions []string
		var values []interface{}

		if code == 0 {
			conditions = append(conditions, "code = ?")
			values = append(values, keyword)
		}
		if channel == 0 {
			conditions = append(conditions, "channel_id = ?")
			values = append(values, keyword)
		}
		if endpoint == "" {
			if common.UsingPostgreSQL {
				conditions = append(conditions, "endpoint ILIKE ?")
			} else {
				conditions = append(conditions, "endpoint LIKE ?")
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
		if modelName == "" {
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

	err = tx.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	if total <= 0 {
		return nil, 0, nil
	}

	page -= 1
	if page < 0 {
		page = 0
	}

	err = tx.Order(getLogOrder(order)).Limit(perPage).Offset(page * perPage).Find(&logs).Error
	return logs, total, err
}

func SumUsedQuota(startTimestamp time.Time, endTimestamp time.Time, modelName string, group string, tokenName string, channel int, endpoint string) (quota int64) {
	ifnull := "ifnull"
	if common.UsingPostgreSQL {
		ifnull = "COALESCE"
	}
	tx := LOG_DB.Table("logs").Select(fmt.Sprintf("%s(sum(quota),0)", ifnull))
	if group != "" {
		tx = tx.Where("group_id = ?", group)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if !startTimestamp.IsZero() {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if !endTimestamp.IsZero() {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	if modelName != "" {
		tx = tx.Where("model = ?", modelName)
	}
	if channel != 0 {
		tx = tx.Where("channel_id = ?", channel)
	}
	if endpoint != "" {
		tx = tx.Where("endpoint = ?", endpoint)
	}
	tx.Scan(&quota)
	return quota
}

func SumUsedToken(startTimestamp time.Time, endTimestamp time.Time, modelName string, group string, tokenName string, endpoint string) (token int) {
	ifnull := "ifnull"
	if common.UsingPostgreSQL {
		ifnull = "COALESCE"
	}
	tx := LOG_DB.Table("logs").Select(fmt.Sprintf("%s(sum(prompt_tokens),0) + %s(sum(completion_tokens),0)", ifnull, ifnull))
	if group != "" {
		tx = tx.Where("group_id = ?", group)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if !startTimestamp.IsZero() {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if !endTimestamp.IsZero() {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	if modelName != "" {
		tx = tx.Where("model = ?", modelName)
	}
	if endpoint != "" {
		tx = tx.Where("endpoint = ?", endpoint)
	}
	tx.Scan(&token)
	return token
}

func DeleteOldLog(timestamp time.Time) (int64, error) {
	result := LOG_DB.Where("created_at < ?", timestamp).Delete(&Log{})
	return result.RowsAffected, result.Error
}

func DeleteGroupLogs(groupId string) (int64, error) {
	result := LOG_DB.Where("group_id = ?", groupId).Delete(&Log{})
	return result.RowsAffected, result.Error
}

type LogStatistic struct {
	Day              string `gorm:"column:day"`
	Model            string `gorm:"column:model"`
	RequestCount     int    `gorm:"column:request_count"`
	PromptTokens     int    `gorm:"column:prompt_tokens"`
	CompletionTokens int    `gorm:"column:completion_tokens"`
}

func SearchLogsByDayAndModel(group string, start time.Time, end time.Time) (LogStatistics []*LogStatistic, err error) {
	groupSelect := "DATE_FORMAT(FROM_UNIXTIME(created_at), '%Y-%m-%d') as day"

	if common.UsingPostgreSQL {
		groupSelect = "TO_CHAR(date_trunc('day', to_timestamp(created_at)), 'YYYY-MM-DD') as day"
	}

	if common.UsingSQLite {
		groupSelect = "strftime('%Y-%m-%d', datetime(created_at, 'unixepoch')) as day"
	}

	err = LOG_DB.Raw(`
		SELECT `+groupSelect+`,
		model, count(1) as request_count,
		sum(prompt_tokens) as prompt_tokens,
		sum(completion_tokens) as completion_tokens
		FROM logs
		WHERE group_id = ?
		AND created_at BETWEEN ? AND ?
		GROUP BY day, model
		ORDER BY day, model
	`, group, start, end).Scan(&LogStatistics).Error

	return LogStatistics, err
}
