package model

import (
	"errors"
	"fmt"
	"strings"
	"time"

	json "github.com/json-iterator/go"
	log "github.com/sirupsen/logrus"

	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/helper"
)

type RequestDetail struct {
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"-"`
	RequestBody  string    `gorm:"type:text"      json:"request_body"`
	ResponseBody string    `gorm:"type:text"      json:"response_body"`
	ID           int       `json:"id"`
	LogID        int       `json:"log_id"`
}

type Log struct {
	RequestDetail    *RequestDetail `gorm:"foreignKey:LogID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"                                                         json:"request_detail,omitempty"`
	RequestAt        time.Time      `gorm:"index;index:idx_request_at_group_id,priority:2;index:idx_group_reqat_token,priority:2"                                  json:"request_at"`
	CreatedAt        time.Time      `gorm:"index"                                                                                                                  json:"created_at"`
	TokenName        string         `gorm:"index;index:idx_group_token,priority:2;index:idx_group_reqat_token,priority:3"                                          json:"token_name"`
	Endpoint         string         `gorm:"index"                                                                                                                  json:"endpoint"`
	Content          string         `gorm:"type:text"                                                                                                              json:"content"`
	GroupID          string         `gorm:"index;index:idx_group_token,priority:1;index:idx_request_at_group_id,priority:1;index:idx_group_reqat_token,priority:1" json:"group"`
	Model            string         `gorm:"index"                                                                                                                  json:"model"`
	RequestID        string         `gorm:"index"                                                                                                                  json:"request_id"`
	Price            float64        `json:"price"`
	ID               int            `gorm:"primaryKey"                                                                                                             json:"id"`
	CompletionPrice  float64        `json:"completion_price"`
	TokenID          int            `gorm:"index"                                                                                                                  json:"token_id"`
	UsedAmount       float64        `gorm:"index"                                                                                                                  json:"used_amount"`
	PromptTokens     int            `json:"prompt_tokens"`
	CompletionTokens int            `json:"completion_tokens"`
	ChannelID        int            `gorm:"index"                                                                                                                  json:"channel"`
	Code             int            `gorm:"index"                                                                                                                  json:"code"`
	Mode             int            `json:"mode"`
}

func (l *Log) MarshalJSON() ([]byte, error) {
	type Alias Log
	return json.Marshal(&struct {
		*Alias
		CreatedAt int64 `json:"created_at"`
		RequestAt int64 `json:"request_at"`
	}{
		Alias:     (*Alias)(l),
		CreatedAt: l.CreatedAt.UnixMilli(),
		RequestAt: l.RequestAt.UnixMilli(),
	})
}

func RecordConsumeLog(
	requestID string,
	requestAt time.Time,
	group string,
	code int,
	channelID int,
	promptTokens int,
	completionTokens int,
	modelName string,
	tokenID int,
	tokenName string,
	amount float64,
	price float64,
	completionPrice float64,
	endpoint string,
	content string,
	mode int,
	requestDetail *RequestDetail,
) error {
	defer func() {
		detailStorageHours := config.GetLogDetailStorageHours()
		if detailStorageHours <= 0 {
			return
		}
		err := LogDB.
			Where("created_at < ?", time.Now().Add(-time.Duration(detailStorageHours)*time.Hour)).
			Delete(&RequestDetail{}).Error
		if err != nil {
			log.Errorf("delete request detail failed: %s", err)
		}
	}()
	log := &Log{
		RequestID:        requestID,
		RequestAt:        requestAt,
		GroupID:          group,
		CreatedAt:        time.Now(),
		Code:             code,
		PromptTokens:     promptTokens,
		CompletionTokens: completionTokens,
		TokenID:          tokenID,
		TokenName:        tokenName,
		Model:            modelName,
		Mode:             mode,
		UsedAmount:       amount,
		Price:            price,
		CompletionPrice:  completionPrice,
		ChannelID:        channelID,
		Endpoint:         endpoint,
		Content:          content,
		RequestDetail:    requestDetail,
	}
	return LogDB.Create(log).Error
}

//nolint:goconst
func getLogOrder(order string) string {
	prefix, suffix, _ := strings.Cut(order, "-")
	switch prefix {
	case "used_amount", "token_id", "token_name", "group", "request_id", "request_at", "id", "created_at":
		switch suffix {
		case "asc":
			return prefix + " asc"
		default:
			return prefix + " desc"
		}
	default:
		return "request_at desc"
	}
}

func GetLogs(startTimestamp time.Time, endTimestamp time.Time, code int, modelName string, group string, requestID string, tokenID int, tokenName string, startIdx int, num int, channelID int, endpoint string, content string, order string, mode int) (logs []*Log, total int64, err error) {
	tx := LogDB.Model(&Log{})
	if group != "" {
		tx = tx.Where("group_id = ?", group)
	}
	if !startTimestamp.IsZero() {
		tx = tx.Where("request_at >= ?", startTimestamp)
	}
	if !endTimestamp.IsZero() {
		tx = tx.Where("request_at <= ?", endTimestamp)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if requestID != "" {
		tx = tx.Where("request_id = ?", requestID)
	}
	if modelName != "" {
		tx = tx.Where("model = ?", modelName)
	}
	if mode != 0 {
		tx = tx.Where("mode = ?", mode)
	}
	if tokenID != 0 {
		tx = tx.Where("token_id = ?", tokenID)
	}
	if channelID != 0 {
		tx = tx.Where("channel_id = ?", channelID)
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

	err = tx.
		Preload("RequestDetail").
		Order(getLogOrder(order)).
		Limit(num).
		Offset(startIdx).
		Find(&logs).Error
	return logs, total, err
}

func GetGroupLogs(group string, startTimestamp time.Time, endTimestamp time.Time, code int, modelName string, requestID string, tokenID int, tokenName string, startIdx int, num int, channelID int, endpoint string, content string, order string, mode int) (logs []*Log, total int64, err error) {
	tx := LogDB.Model(&Log{}).Where("group_id = ?", group)
	if !startTimestamp.IsZero() {
		tx = tx.Where("request_at >= ?", startTimestamp)
	}
	if !endTimestamp.IsZero() {
		tx = tx.Where("request_at <= ?", endTimestamp)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if modelName != "" {
		tx = tx.Where("model = ?", modelName)
	}
	if mode != 0 {
		tx = tx.Where("mode = ?", mode)
	}
	if requestID != "" {
		tx = tx.Where("request_id = ?", requestID)
	}
	if tokenID != 0 {
		tx = tx.Where("token_id = ?", tokenID)
	}
	if channelID != 0 {
		tx = tx.Where("channel_id = ?", channelID)
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

	err = tx.
		Preload("RequestDetail").
		Order(getLogOrder(order)).
		Limit(num).
		Offset(startIdx).
		Find(&logs).Error
	return logs, total, err
}

func SearchLogs(keyword string, page int, perPage int, code int, endpoint string, groupID string, requestID string, tokenID int, tokenName string, modelName string, content string, startTimestamp time.Time, endTimestamp time.Time, channelID int, order string, mode int) (logs []*Log, total int64, err error) {
	tx := LogDB.Model(&Log{})

	// Handle exact match conditions for non-zero values
	if groupID != "" {
		tx = tx.Where("group_id = ?", groupID)
	}
	if !startTimestamp.IsZero() {
		tx = tx.Where("request_at >= ?", startTimestamp)
	}
	if !endTimestamp.IsZero() {
		tx = tx.Where("request_at <= ?", endTimestamp)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if modelName != "" {
		tx = tx.Where("model = ?", modelName)
	}
	if mode != 0 {
		tx = tx.Where("mode = ?", mode)
	}
	if tokenID != 0 {
		tx = tx.Where("token_id = ?", tokenID)
	}
	if code != 0 {
		tx = tx.Where("code = ?", code)
	}
	if endpoint != "" {
		tx = tx.Where("endpoint = ?", endpoint)
	}
	if requestID != "" {
		tx = tx.Where("request_id = ?", requestID)
	}
	if content != "" {
		tx = tx.Where("content = ?", content)
	}
	if channelID != 0 {
		tx = tx.Where("channel_id = ?", channelID)
	}

	// Handle keyword search for zero value fields
	if keyword != "" {
		var conditions []string
		var values []interface{}

		if num := helper.String2Int(keyword); num != 0 {
			if code == 0 {
				conditions = append(conditions, "code = ?")
				values = append(values, num)
			}
			if channelID == 0 {
				conditions = append(conditions, "channel_id = ?")
				values = append(values, num)
			}
			if mode != 0 {
				conditions = append(conditions, "mode = ?")
				values = append(values, num)
			}
		}

		if endpoint == "" {
			if common.UsingPostgreSQL {
				conditions = append(conditions, "endpoint ILIKE ?")
			} else {
				conditions = append(conditions, "endpoint LIKE ?")
			}
			values = append(values, "%"+keyword+"%")
		}
		if groupID == "" {
			if common.UsingPostgreSQL {
				conditions = append(conditions, "group_id ILIKE ?")
			} else {
				conditions = append(conditions, "group_id LIKE ?")
			}
			values = append(values, "%"+keyword+"%")
		}
		if requestID == "" {
			if common.UsingPostgreSQL {
				conditions = append(conditions, "request_id ILIKE ?")
			} else {
				conditions = append(conditions, "request_id LIKE ?")
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

	page--
	if page < 0 {
		page = 0
	}
	err = tx.
		Preload("RequestDetail").
		Order(getLogOrder(order)).
		Limit(perPage).
		Offset(page * perPage).
		Find(&logs).Error
	return logs, total, err
}

func SearchGroupLogs(group string, keyword string, page int, perPage int, code int, endpoint string, requestID string, tokenID int, tokenName string, modelName string, content string, startTimestamp time.Time, endTimestamp time.Time, channelID int, order string, mode int) (logs []*Log, total int64, err error) {
	if group == "" {
		return nil, 0, errors.New("group is empty")
	}
	tx := LogDB.Model(&Log{}).Where("group_id = ?", group)

	// Handle exact match conditions for non-zero values
	if !startTimestamp.IsZero() {
		tx = tx.Where("request_at >= ?", startTimestamp)
	}
	if !endTimestamp.IsZero() {
		tx = tx.Where("request_at <= ?", endTimestamp)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if modelName != "" {
		tx = tx.Where("model = ?", modelName)
	}
	if code != 0 {
		tx = tx.Where("code = ?", code)
	}
	if mode != 0 {
		tx = tx.Where("mode = ?", mode)
	}
	if endpoint != "" {
		tx = tx.Where("endpoint = ?", endpoint)
	}
	if requestID != "" {
		tx = tx.Where("request_id = ?", requestID)
	}
	if tokenID != 0 {
		tx = tx.Where("token_id = ?", tokenID)
	}
	if content != "" {
		tx = tx.Where("content = ?", content)
	}
	if channelID != 0 {
		tx = tx.Where("channel_id = ?", channelID)
	}

	// Handle keyword search for zero value fields
	if keyword != "" {
		var conditions []string
		var values []interface{}

		if num := helper.String2Int(keyword); num != 0 {
			if code == 0 {
				conditions = append(conditions, "code = ?")
				values = append(values, num)
			}
			if channelID == 0 {
				conditions = append(conditions, "channel_id = ?")
				values = append(values, num)
			}
			if mode != 0 {
				conditions = append(conditions, "mode = ?")
				values = append(values, num)
			}
		}
		if endpoint == "" {
			if common.UsingPostgreSQL {
				conditions = append(conditions, "endpoint ILIKE ?")
			} else {
				conditions = append(conditions, "endpoint LIKE ?")
			}
			values = append(values, "%"+keyword+"%")
		}
		if requestID == "" {
			if common.UsingPostgreSQL {
				conditions = append(conditions, "request_id ILIKE ?")
			} else {
				conditions = append(conditions, "request_id LIKE ?")
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

	page--
	if page < 0 {
		page = 0
	}

	err = tx.
		Preload("RequestDetail").
		Order(getLogOrder(order)).
		Limit(perPage).
		Offset(page * perPage).
		Find(&logs).Error
	return logs, total, err
}

func SumUsedQuota(startTimestamp time.Time, endTimestamp time.Time, modelName string, group string, tokenName string, channel int, endpoint string) (quota int64) {
	ifnull := "ifnull"
	if common.UsingPostgreSQL {
		ifnull = "COALESCE"
	}
	tx := LogDB.Table("logs").Select(ifnull + "(sum(quota),0)")
	if group != "" {
		tx = tx.Where("group_id = ?", group)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if !startTimestamp.IsZero() {
		tx = tx.Where("request_at >= ?", startTimestamp)
	}
	if !endTimestamp.IsZero() {
		tx = tx.Where("request_at <= ?", endTimestamp)
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
	tx := LogDB.Table("logs").Select(fmt.Sprintf("%s(sum(prompt_tokens),0) + %s(sum(completion_tokens),0)", ifnull, ifnull))
	if group != "" {
		tx = tx.Where("group_id = ?", group)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if !startTimestamp.IsZero() {
		tx = tx.Where("request_at >= ?", startTimestamp)
	}
	if !endTimestamp.IsZero() {
		tx = tx.Where("request_at <= ?", endTimestamp)
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
	result := LogDB.Where("request_at < ?", timestamp).Delete(&Log{})
	return result.RowsAffected, result.Error
}

func DeleteGroupLogs(groupID string) (int64, error) {
	result := LogDB.Where("group_id = ?", groupID).Delete(&Log{})
	return result.RowsAffected, result.Error
}

type LogStatistic struct {
	Day              string `gorm:"column:day"`
	Model            string `gorm:"column:model"`
	RequestCount     int    `gorm:"column:request_count"`
	PromptTokens     int    `gorm:"column:prompt_tokens"`
	CompletionTokens int    `gorm:"column:completion_tokens"`
}

func SearchLogsByDayAndModel(group string, start time.Time, end time.Time) (logStatistics []*LogStatistic, err error) {
	groupSelect := "DATE_FORMAT(FROM_UNIXTIME(created_at), '%Y-%m-%d') as day"

	if common.UsingPostgreSQL {
		groupSelect = "TO_CHAR(date_trunc('day', to_timestamp(created_at)), 'YYYY-MM-DD') as day"
	}

	if common.UsingSQLite {
		groupSelect = "strftime('%Y-%m-%d', datetime(created_at, 'unixepoch')) as day"
	}

	err = LogDB.Raw(`
		SELECT `+groupSelect+`,
		model, count(1) as request_count,
		sum(prompt_tokens) as prompt_tokens,
		sum(completion_tokens) as completion_tokens
		FROM logs
		WHERE group_id = ?
		AND created_at BETWEEN ? AND ?
		GROUP BY day, model
		ORDER BY day, model
	`, group, start, end).Scan(&logStatistics).Error

	return logStatistics, err
}
