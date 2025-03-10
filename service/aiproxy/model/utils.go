package model

import (
	"context"
	"database/sql/driver"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/labring/sealos/service/aiproxy/common/notify"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func NotFoundError(errMsg ...string) error {
	return fmt.Errorf("%s %w", strings.Join(errMsg, " "), gorm.ErrRecordNotFound)
}

func HandleNotFound(err error, errMsg ...string) error {
	if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
		return NotFoundError(strings.Join(errMsg, " "))
	}
	return err
}

// Helper function to handle update results
func HandleUpdateResult(result *gorm.DB, entityName string) error {
	if result.Error != nil {
		return HandleNotFound(result.Error, entityName)
	}
	if result.RowsAffected == 0 {
		return NotFoundError(entityName)
	}
	return nil
}

func OnConflictDoNothing() *gorm.DB {
	return DB.Clauses(clause.OnConflict{
		DoNothing: true,
	})
}

func IgnoreNotFound(err error) error {
	if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
		return nil
	}
	return err
}

type BatchUpdateData struct {
	Groups   map[string]*GroupUpdate
	Tokens   map[int]*TokenUpdate
	Channels map[int]*ChannelUpdate
	sync.Mutex
}

type GroupUpdate struct {
	Amount float64
	Count  int
}

type TokenUpdate struct {
	Amount float64
	Count  int
}

type ChannelUpdate struct {
	Amount float64
	Count  int
}

var batchData BatchUpdateData

func init() {
	batchData = BatchUpdateData{
		Groups:   make(map[string]*GroupUpdate),
		Tokens:   make(map[int]*TokenUpdate),
		Channels: make(map[int]*ChannelUpdate),
	}
}

func StartBatchProcessor(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			ProcessBatchUpdates()
			return
		case <-ticker.C:
			ProcessBatchUpdates()
		}
	}
}

func ProcessBatchUpdates() {
	batchData.Lock()
	defer batchData.Unlock()

	if len(batchData.Groups) > 0 {
		for groupID, data := range batchData.Groups {
			err := UpdateGroupUsedAmountAndRequestCount(groupID, data.Amount, data.Count)
			if IgnoreNotFound(err) != nil {
				notify.ErrorThrottle(
					"batchUpdateGroupUsedAmountAndRequestCount",
					time.Minute,
					"failed to batch update group",
					err.Error(),
				)
			} else {
				delete(batchData.Groups, groupID)
			}
		}
	}

	if len(batchData.Tokens) > 0 {
		for tokenID, data := range batchData.Tokens {
			err := UpdateTokenUsedAmount(tokenID, data.Amount, data.Count)
			if IgnoreNotFound(err) != nil {
				notify.ErrorThrottle(
					"batchUpdateTokenUsedAmount",
					time.Minute,
					"failed to batch update token",
					err.Error(),
				)
			} else {
				delete(batchData.Tokens, tokenID)
			}
		}
	}

	if len(batchData.Channels) > 0 {
		for channelID, data := range batchData.Channels {
			err := UpdateChannelUsedAmount(channelID, data.Amount, data.Count)
			if IgnoreNotFound(err) != nil {
				notify.ErrorThrottle(
					"batchUpdateChannelUsedAmount",
					time.Minute,
					"failed to batch update channel",
					err.Error(),
				)
			} else {
				delete(batchData.Channels, channelID)
			}
		}
	}
}

func BatchRecordConsume(
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
	ip string,
	retryTimes int,
	requestDetail *RequestDetail,
) error {
	err := RecordConsumeLog(
		requestID,
		requestAt,
		group,
		code,
		channelID,
		promptTokens,
		completionTokens,
		modelName,
		tokenID,
		tokenName,
		amount,
		price,
		completionPrice,
		endpoint,
		content,
		mode,
		ip,
		retryTimes,
		requestDetail,
	)

	amountDecimal := decimal.NewFromFloat(amount)

	batchData.Lock()
	defer batchData.Unlock()

	if group != "" {
		if _, ok := batchData.Groups[group]; !ok {
			batchData.Groups[group] = &GroupUpdate{}
		}

		if amount > 0 {
			batchData.Groups[group].Amount = amountDecimal.
				Add(decimal.NewFromFloat(batchData.Groups[group].Amount)).
				InexactFloat64()
		}
		batchData.Groups[group].Count += 1
	}

	if tokenID > 0 {
		if _, ok := batchData.Tokens[tokenID]; !ok {
			batchData.Tokens[tokenID] = &TokenUpdate{}
		}

		if amount > 0 {
			batchData.Tokens[tokenID].Amount = amountDecimal.
				Add(decimal.NewFromFloat(batchData.Tokens[tokenID].Amount)).
				InexactFloat64()
		}
		batchData.Tokens[tokenID].Count += 1
	}

	if channelID > 0 {
		if _, ok := batchData.Channels[channelID]; !ok {
			batchData.Channels[channelID] = &ChannelUpdate{}
		}

		if amount > 0 {
			batchData.Channels[channelID].Amount = amountDecimal.
				Add(decimal.NewFromFloat(batchData.Channels[channelID].Amount)).
				InexactFloat64()
		}
		batchData.Channels[channelID].Count += 1
	}

	return err
}

type EmptyNullString string

func (ns EmptyNullString) String() string {
	return string(ns)
}

// Scan implements the [Scanner] interface.
func (ns *EmptyNullString) Scan(value any) error {
	if value == nil {
		*ns = ""
		return nil
	}
	switch v := value.(type) {
	case []byte:
		*ns = EmptyNullString(v)
	case string:
		*ns = EmptyNullString(v)
	default:
		return fmt.Errorf("unsupported type: %T", v)
	}
	return nil
}

// Value implements the [driver.Valuer] interface.
func (ns EmptyNullString) Value() (driver.Value, error) {
	if ns == "" {
		return nil, nil
	}
	return string(ns), nil
}

func String2Int(keyword string) int {
	if keyword == "" {
		return 0
	}
	i, err := strconv.Atoi(keyword)
	if err != nil {
		return 0
	}
	return i
}

func toLimitOffset(page int, perPage int) (limit int, offset int) {
	page--
	if page < 0 {
		page = 0
	}
	if perPage <= 0 {
		perPage = 10
	} else if perPage > 100 {
		perPage = 100
	}
	return perPage, page * perPage
}
