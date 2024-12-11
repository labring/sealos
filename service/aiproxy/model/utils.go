package model

import (
	"database/sql/driver"
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type NotFoundError string

func (e NotFoundError) Error() string {
	return string(e) + " not found"
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
	requestDetail *RequestDetail,
) error {
	errs := []error{}
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
		requestDetail,
	)
	if err != nil {
		errs = append(errs, fmt.Errorf("failed to record log: %w", err))
	}
	err = UpdateGroupUsedAmountAndRequestCount(group, amount, 1)
	if err != nil {
		errs = append(errs, fmt.Errorf("failed to update group used amount and request count: %w", err))
	}
	err = UpdateTokenUsedAmount(tokenID, amount, 1)
	if err != nil {
		errs = append(errs, fmt.Errorf("failed to update token used amount: %w", err))
	}
	err = UpdateChannelUsedAmount(channelID, amount, 1)
	if err != nil {
		errs = append(errs, fmt.Errorf("failed to update channel used amount: %w", err))
	}
	if len(errs) == 0 {
		return nil
	}
	return errors.Join(errs...)
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
