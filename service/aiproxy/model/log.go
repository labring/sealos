package model

import (
	"errors"
	"fmt"
	"strings"
	"time"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/shopspring/decimal"
	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type RequestDetail struct {
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"-"`
	RequestBody  string    `gorm:"type:text"      json:"request_body,omitempty"`
	ResponseBody string    `gorm:"type:text"      json:"response_body,omitempty"`
	ID           int       `json:"id"`
	LogID        int       `json:"log_id"`
}

type Log struct {
	RequestDetail    *RequestDetail `gorm:"foreignKey:LogID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"                                                         json:"request_detail,omitempty"`
	RequestAt        time.Time      `gorm:"index;index:idx_request_at_group_id,priority:2;index:idx_group_reqat_token,priority:2"                                  json:"request_at"`
	CreatedAt        time.Time      `gorm:"index"                                                                                                                  json:"created_at"`
	TokenName        string         `gorm:"index;index:idx_group_token,priority:2;index:idx_group_reqat_token,priority:3"                                          json:"token_name"`
	Endpoint         string         `gorm:"index"                                                                                                                  json:"endpoint"`
	Content          string         `gorm:"type:text"                                                                                                              json:"content,omitempty"`
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

func GetGroupLogDetail(group string, logID int) (*RequestDetail, error) {
	var detail RequestDetail
	err := LogDB.Model(&RequestDetail{}).
		Joins("JOIN logs ON logs.id = request_details.log_id").
		Where("logs.group_id = ? AND logs.id = ?", group, logID).
		First(&detail).Error
	if err != nil {
		return nil, err
	}
	return &detail, nil
}

func GetLogDetail(logID int) (*RequestDetail, error) {
	var detail RequestDetail
	err := LogDB.Model(&RequestDetail{}).
		Where("log_id = ?", logID).
		First(&detail).Error
	if err != nil {
		return nil, err
	}
	return &detail, nil
}

func cleanRequestDetail() error {
	detailStorageHours := config.GetLogDetailStorageHours()
	if detailStorageHours <= 0 {
		return nil
	}
	return LogDB.
		Where(
			"created_at < ?",
			time.Now().Add(-time.Duration(detailStorageHours)*time.Hour),
		).
		Delete(&RequestDetail{}).Error
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
		if requestDetail == nil {
			return
		}
		err := cleanRequestDetail()
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

type CodeType string

const (
	CodeTypeAll     CodeType = "all"
	CodeTypeSuccess CodeType = "success"
	CodeTypeError   CodeType = "error"
)

type GetLogsResult struct {
	Logs  []*Log `json:"logs"`
	Total int64  `json:"total"`
}

func GetLogs(
	startTimestamp time.Time,
	endTimestamp time.Time,
	modelName string,
	group string,
	requestID string,
	tokenID int,
	tokenName string,
	startIdx int,
	num int,
	channelID int,
	endpoint string,
	order string,
	mode int,
	codeType CodeType,
	withBody bool,
) (*GetLogsResult, error) {
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
	switch codeType {
	case CodeTypeSuccess:
		tx = tx.Where("code = 200")
	case CodeTypeError:
		tx = tx.Where("code != 200")
	}

	result := &GetLogsResult{}
	err := tx.Count(&result.Total).Error
	if err != nil {
		return nil, err
	}
	if result.Total <= 0 {
		return result, nil
	}

	if withBody {
		tx = tx.Preload("RequestDetail")
	} else {
		tx = tx.Preload("RequestDetail", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "log_id")
		})
	}

	err = tx.
		Order(getLogOrder(order)).
		Limit(num).
		Offset(startIdx).
		Find(&result.Logs).Error
	return result, err
}

type GetGroupLogsResult struct {
	GetLogsResult
	TokenNames []string `json:"token_names"`
	Models     []string `json:"models"`
}

func GetGroupLogs(
	group string,
	startTimestamp time.Time,
	endTimestamp time.Time,
	modelName string,
	requestID string,
	tokenID int,
	tokenName string,
	startIdx int,
	num int,
	channelID int,
	endpoint string,
	order string,
	mode int,
	codeType CodeType,
	withBody bool,
) (*GetGroupLogsResult, error) {
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
	switch codeType {
	case CodeTypeSuccess:
		tx = tx.Where("code = 200")
	case CodeTypeError:
		tx = tx.Where("code != 200")
	}

	result := &GetGroupLogsResult{}
	err := tx.Count(&result.Total).Error
	if err != nil {
		return nil, err
	}
	if result.Total <= 0 {
		return result, nil
	}

	if withBody {
		tx = tx.Preload("RequestDetail")
	} else {
		tx = tx.Preload("RequestDetail", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "log_id")
		})
	}

	err = tx.
		Order(getLogOrder(order)).
		Limit(num).
		Offset(startIdx).
		Find(&result.Logs).Error
	if err != nil {
		return nil, err
	}

	// Get distinct token names and models for the time period
	result.TokenNames, err = getGroupLogDistinctValues[string]("token_name", group, startTimestamp, endTimestamp)
	if err != nil {
		return nil, err
	}

	result.Models, err = getGroupLogDistinctValues[string]("model", group, startTimestamp, endTimestamp)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func SearchLogs(
	keyword string,
	page int,
	perPage int,
	endpoint string,
	groupID string,
	requestID string,
	tokenID int,
	tokenName string,
	modelName string,
	startTimestamp time.Time,
	endTimestamp time.Time,
	channelID int,
	order string,
	mode int,
	codeType CodeType,
	withBody bool,
) (*GetLogsResult, error) {
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
	if endpoint != "" {
		tx = tx.Where("endpoint = ?", endpoint)
	}
	if requestID != "" {
		tx = tx.Where("request_id = ?", requestID)
	}
	if channelID != 0 {
		tx = tx.Where("channel_id = ?", channelID)
	}
	switch codeType {
	case CodeTypeSuccess:
		tx = tx.Where("code = 200")
	case CodeTypeError:
		tx = tx.Where("code != 200")
	}

	// Handle keyword search for zero value fields
	if keyword != "" {
		var conditions []string
		var values []interface{}

		if num := String2Int(keyword); num != 0 {
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
		if common.UsingPostgreSQL {
			conditions = append(conditions, "content ILIKE ?")
		} else {
			conditions = append(conditions, "content LIKE ?")
		}
		values = append(values, "%"+keyword+"%")

		if len(conditions) > 0 {
			tx = tx.Where(fmt.Sprintf("(%s)", strings.Join(conditions, " OR ")), values...)
		}
	}

	result := &GetLogsResult{}
	err := tx.Count(&result.Total).Error
	if err != nil {
		return nil, err
	}
	if result.Total <= 0 {
		return result, nil
	}

	page--
	if page < 0 {
		page = 0
	}

	if withBody {
		tx = tx.Preload("RequestDetail")
	} else {
		tx = tx.Preload("RequestDetail", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "log_id")
		})
	}

	err = tx.
		Order(getLogOrder(order)).
		Limit(perPage).
		Offset(page * perPage).
		Find(&result.Logs).Error
	return result, err
}

func SearchGroupLogs(
	group string,
	keyword string,
	page int,
	perPage int,
	endpoint string,
	requestID string,
	tokenID int,
	tokenName string,
	modelName string,
	startTimestamp time.Time,
	endTimestamp time.Time,
	channelID int,
	order string,
	mode int,
	codeType CodeType,
	withBody bool,
) (*GetGroupLogsResult, error) {
	if group == "" {
		return nil, errors.New("group is empty")
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
	if channelID != 0 {
		tx = tx.Where("channel_id = ?", channelID)
	}
	switch codeType {
	case CodeTypeSuccess:
		tx = tx.Where("code = 200")
	case CodeTypeError:
		tx = tx.Where("code != 200")
	}

	// Handle keyword search for zero value fields
	if keyword != "" {
		var conditions []string
		var values []interface{}

		if num := String2Int(keyword); num != 0 {
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
		if common.UsingPostgreSQL {
			conditions = append(conditions, "content ILIKE ?")
		} else {
			conditions = append(conditions, "content LIKE ?")
		}
		values = append(values, "%"+keyword+"%")

		if len(conditions) > 0 {
			tx = tx.Where(fmt.Sprintf("(%s)", strings.Join(conditions, " OR ")), values...)
		}
	}

	result := &GetGroupLogsResult{}
	err := tx.Count(&result.Total).Error
	if err != nil {
		return nil, err
	}
	if result.Total <= 0 {
		return result, nil
	}

	page--
	if page < 0 {
		page = 0
	}

	if withBody {
		tx = tx.Preload("RequestDetail")
	} else {
		tx = tx.Preload("RequestDetail", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "log_id")
		})
	}

	err = tx.
		Order(getLogOrder(order)).
		Limit(perPage).
		Offset(page * perPage).
		Find(&result.Logs).Error
	if err != nil {
		return nil, err
	}

	// Get distinct token names and models for the time period
	result.TokenNames, err = getGroupLogDistinctValues[string]("token_name", group, startTimestamp, endTimestamp)
	if err != nil {
		return nil, err
	}

	result.Models, err = getGroupLogDistinctValues[string]("model", group, startTimestamp, endTimestamp)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func DeleteOldLog(timestamp time.Time) (int64, error) {
	result := LogDB.Where("request_at < ?", timestamp).Delete(&Log{})
	return result.RowsAffected, result.Error
}

func DeleteGroupLogs(groupID string) (int64, error) {
	result := LogDB.Where("group_id = ?", groupID).Delete(&Log{})
	return result.RowsAffected, result.Error
}

type HourlyChartData struct {
	Timestamp      int64   `json:"timestamp"`
	RequestCount   int64   `json:"request_count"`
	UsedAmount     float64 `json:"used_amount"`
	ExceptionCount int64   `json:"exception_count"`
}

type DashboardResponse struct {
	ChartData      []*HourlyChartData `json:"chart_data"`
	TokenNames     []string           `json:"token_names"`
	Models         []string           `json:"models"`
	TotalCount     int64              `json:"total_count"`
	ExceptionCount int64              `json:"exception_count"`
	UsedAmount     float64            `json:"used_amount"`
}

func getHourTimestamp() string {
	switch {
	case common.UsingMySQL:
		return "UNIX_TIMESTAMP(DATE_FORMAT(request_at, '%Y-%m-%d %H:00:00'))"
	case common.UsingPostgreSQL:
		return "FLOOR(EXTRACT(EPOCH FROM date_trunc('hour', request_at)))"
	case common.UsingSQLite:
		return "STRFTIME('%s', STRFTIME('%Y-%m-%d %H:00:00', request_at))"
	default:
		return ""
	}
}

func getChartData(group string, start, end time.Time, tokenName, modelName string) ([]*HourlyChartData, error) {
	var chartData []*HourlyChartData

	hourTimestamp := getHourTimestamp()
	if hourTimestamp == "" {
		return nil, errors.New("unsupported hour format")
	}

	query := LogDB.Table("logs").
		Select(hourTimestamp+" as timestamp, count(*) as request_count, sum(used_amount) as used_amount, sum(case when code != 200 then 1 else 0 end) as exception_count").
		Where("group_id = ? AND request_at BETWEEN ? AND ?", group, start, end).
		Group("timestamp").
		Order("timestamp ASC")

	if tokenName != "" {
		query = query.Where("token_name = ?", tokenName)
	}
	if modelName != "" {
		query = query.Where("model = ?", modelName)
	}

	err := query.Scan(&chartData).Error
	return chartData, err
}

func getGroupLogDistinctValues[T any](field string, group string, start, end time.Time) ([]T, error) {
	var values []T
	query := LogDB.
		Model(&Log{}).
		Distinct(field).
		Where("group_id = ?", group)

	if !start.IsZero() {
		query = query.Where("request_at >= ?", start)
	}
	if !end.IsZero() {
		query = query.Where("request_at <= ?", end)
	}

	err := query.Pluck(field, &values).Error
	return values, err
}

func sumTotalCount(chartData []*HourlyChartData) int64 {
	var count int64
	for _, data := range chartData {
		count += data.RequestCount
	}
	return count
}

func sumExceptionCount(chartData []*HourlyChartData) int64 {
	var count int64
	for _, data := range chartData {
		count += data.ExceptionCount
	}
	return count
}

func sumUsedAmount(chartData []*HourlyChartData) float64 {
	var amount decimal.Decimal
	for _, data := range chartData {
		amount = amount.Add(decimal.NewFromFloat(data.UsedAmount))
	}
	return amount.InexactFloat64()
}

func GetDashboardData(group string, start, end time.Time, tokenName string, modelName string) (*DashboardResponse, error) {
	if end.IsZero() {
		end = time.Now()
	} else if end.Before(start) {
		return nil, errors.New("end time is before start time")
	}

	chartData, err := getChartData(group, start, end, tokenName, modelName)
	if err != nil {
		return nil, err
	}

	tokenNames, err := getGroupLogDistinctValues[string]("token_name", group, start, end)
	if err != nil {
		return nil, err
	}

	models, err := getGroupLogDistinctValues[string]("model", group, start, end)
	if err != nil {
		return nil, err
	}

	totalCount := sumTotalCount(chartData)
	exceptionCount := sumExceptionCount(chartData)
	usedAmount := sumUsedAmount(chartData)

	return &DashboardResponse{
		ChartData:      chartData,
		TokenNames:     tokenNames,
		Models:         models,
		TotalCount:     totalCount,
		ExceptionCount: exceptionCount,
		UsedAmount:     usedAmount,
	}, nil
}

func GetGroupLastRequestTime(group string) (time.Time, error) {
	var log Log
	err := LogDB.Model(&Log{}).Where("group_id = ?", group).Order("request_at desc").First(&log).Error
	return log.RequestAt, err
}

func GetTokenLastRequestTime(id int) (time.Time, error) {
	var log Log
	err := LogDB.Model(&Log{}).Where("token_id = ?", id).Order("request_at desc").First(&log).Error
	return log.RequestAt, err
}

func GetGroupTokenLastRequestTime(group string, id int) (time.Time, error) {
	var log Log
	err := LogDB.Model(&Log{}).Where("group_id = ? and token_id = ?", group, id).Order("request_at desc").First(&log).Error
	return log.RequestAt, err
}
