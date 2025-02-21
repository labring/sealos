package model

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/config"
	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	ErrTokenNotFound = "token"
)

const (
	TokenStatusEnabled   = 1 // don't use 0, 0 is the default value!
	TokenStatusDisabled  = 2 // also don't use 0
	TokenStatusExpired   = 3
	TokenStatusExhausted = 4
)

type Token struct {
	CreatedAt    time.Time       `json:"created_at"`
	ExpiredAt    time.Time       `json:"expired_at"`
	Group        *Group          `gorm:"foreignKey:GroupID"                        json:"-"`
	Key          string          `gorm:"type:char(48);uniqueIndex"                 json:"key"`
	Name         EmptyNullString `gorm:"index;uniqueIndex:idx_group_name;not null" json:"name"`
	GroupID      string          `gorm:"index;uniqueIndex:idx_group_name"          json:"group"`
	Subnet       string          `json:"subnet"`
	Models       []string        `gorm:"serializer:fastjson;type:text"             json:"models"`
	Status       int             `gorm:"default:1;index"                           json:"status"`
	ID           int             `gorm:"primaryKey"                                json:"id"`
	Quota        float64         `json:"quota"`
	UsedAmount   float64         `gorm:"index"                                     json:"used_amount"`
	RequestCount int             `gorm:"index"                                     json:"request_count"`
}

//nolint:goconst
func getTokenOrder(order string) string {
	prefix, suffix, _ := strings.Cut(order, "-")
	switch prefix {
	case "name", "expired_at", "group", "used_amount", "request_count", "id", "created_at":
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

func InsertToken(token *Token, autoCreateGroup bool) error {
	if autoCreateGroup {
		group := &Group{
			ID: token.GroupID,
		}
		if err := OnConflictDoNothing().Create(group).Error; err != nil {
			return err
		}
	}
	maxTokenNum := config.GetGroupMaxTokenNum()
	err := DB.Transaction(func(tx *gorm.DB) error {
		if maxTokenNum > 0 {
			var count int64
			err := tx.Model(&Token{}).Where("group_id = ?", token.GroupID).Count(&count).Error
			if err != nil {
				return err
			}
			if count >= maxTokenNum {
				return errors.New("group max token num reached")
			}
		}
		return tx.Create(token).Error
	})
	if err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return errors.New("token name already exists in this group")
		}
		return err
	}
	return nil
}

func GetTokens(group string, startIdx int, num int, order string, status int) (tokens []*Token, total int64, err error) {
	tx := DB.Model(&Token{})
	if group != "" {
		tx = tx.Where("group_id = ?", group)
	}

	if status != 0 {
		tx = tx.Where("status = ?", status)
	}

	err = tx.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	if total <= 0 {
		return nil, 0, nil
	}
	err = tx.Order(getTokenOrder(order)).Limit(num).Offset(startIdx).Find(&tokens).Error
	return tokens, total, err
}

func SearchTokens(group string, keyword string, startIdx int, num int, order string, status int, name string, key string) (tokens []*Token, total int64, err error) {
	tx := DB.Model(&Token{})
	if group != "" {
		tx = tx.Where("group_id = ?", group)
	}
	if status != 0 {
		tx = tx.Where("status = ?", status)
	}
	if name != "" {
		tx = tx.Where("name = ?", name)
	}
	if key != "" {
		tx = tx.Where("key = ?", key)
	}

	if keyword != "" {
		var conditions []string
		var values []interface{}

		if group == "" {
			conditions = append(conditions, "group_id = ?")
			values = append(values, keyword)
		}
		if status == 0 {
			conditions = append(conditions, "status = ?")
			values = append(values, String2Int(keyword))
		}
		if name == "" {
			conditions = append(conditions, "name = ?")
			values = append(values, keyword)
		}
		if key == "" {
			conditions = append(conditions, "key = ?")
			values = append(values, keyword)
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
	err = tx.Order(getTokenOrder(order)).Limit(num).Offset(startIdx).Find(&tokens).Error
	return tokens, total, err
}

func GetTokenByKey(key string) (*Token, error) {
	var token Token
	err := DB.Where("key = ?", key).First(&token).Error
	return &token, HandleNotFound(err, ErrTokenNotFound)
}

func GetTokenUsedAmount(id int) (float64, error) {
	var amount float64
	err := DB.Model(&Token{}).Where("id = ?", id).Select("used_amount").Scan(&amount).Error
	return amount, HandleNotFound(err, ErrTokenNotFound)
}

func GetTokenUsedAmountByKey(key string) (float64, error) {
	var amount float64
	err := DB.Model(&Token{}).Where("key = ?", key).Select("used_amount").Scan(&amount).Error
	return amount, HandleNotFound(err, ErrTokenNotFound)
}

func ValidateAndGetToken(key string) (token *TokenCache, err error) {
	if key == "" {
		return nil, errors.New("no token provided")
	}
	token, err = CacheGetTokenByKey(key)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid token")
		}
		log.Error("get token from cache failed: " + err.Error())
		return nil, errors.New("token validation failed")
	}
	switch token.Status {
	case TokenStatusExhausted:
		return nil, fmt.Errorf("token (%s[%d]) quota is exhausted", token.Name, token.ID)
	case TokenStatusExpired:
		return nil, fmt.Errorf("token (%s[%d]) is expired", token.Name, token.ID)
	case TokenStatusDisabled:
		return nil, fmt.Errorf("token (%s[%d]) is disabled", token.Name, token.ID)
	}
	if token.Status != TokenStatusEnabled {
		return nil, fmt.Errorf("token (%s[%d]) is not available", token.Name, token.ID)
	}
	if !time.Time(token.ExpiredAt).IsZero() && time.Time(token.ExpiredAt).Before(time.Now()) {
		err := UpdateTokenStatus(token.ID, TokenStatusExpired)
		if err != nil {
			log.Error("failed to update token status" + err.Error())
		}
		return nil, fmt.Errorf("token (%s[%d]) is expired", token.Name, token.ID)
	}
	if token.Quota > 0 && token.UsedAmount >= token.Quota {
		// in this case, we can make sure the token is exhausted
		err := UpdateTokenStatus(token.ID, TokenStatusExhausted)
		if err != nil {
			log.Error("failed to update token status" + err.Error())
		}
		return nil, fmt.Errorf("token (%s[%d]) quota is exhausted", token.Name, token.ID)
	}
	return token, nil
}

func GetGroupTokenByID(group string, id int) (*Token, error) {
	if id == 0 || group == "" {
		return nil, errors.New("id or group is empty")
	}
	token := Token{}
	err := DB.
		Where("id = ? and group_id = ?", id, group).
		First(&token).Error
	return &token, HandleNotFound(err, ErrTokenNotFound)
}

func GetTokenByID(id int) (*Token, error) {
	if id == 0 {
		return nil, errors.New("id is empty")
	}
	token := Token{ID: id}
	err := DB.First(&token, "id = ?", id).Error
	return &token, HandleNotFound(err, ErrTokenNotFound)
}

func UpdateTokenStatus(id int, status int) (err error) {
	token := Token{ID: id}
	defer func() {
		if err == nil {
			if err := CacheUpdateTokenStatus(token.Key, status); err != nil {
				log.Error("update token status in cache failed: " + err.Error())
			}
		}
	}()
	result := DB.
		Model(&token).
		Clauses(clause.Returning{
			Columns: []clause.Column{
				{Name: "key"},
			},
		}).
		Where("id = ?", id).
		Updates(
			map[string]interface{}{
				"status": status,
			},
		)
	return HandleUpdateResult(result, ErrTokenNotFound)
}

func UpdateGroupTokenStatus(group string, id int, status int) (err error) {
	token := Token{}
	defer func() {
		if err == nil {
			if err := CacheUpdateTokenStatus(token.Key, status); err != nil {
				log.Error("update token status in cache failed: " + err.Error())
			}
		}
	}()
	result := DB.
		Model(&token).
		Clauses(clause.Returning{
			Columns: []clause.Column{
				{Name: "key"},
			},
		}).
		Where("id = ? and group_id = ?", id, group).
		Updates(
			map[string]interface{}{
				"status": status,
			},
		)
	return HandleUpdateResult(result, ErrTokenNotFound)
}

func DeleteGroupTokenByID(groupID string, id int) (err error) {
	if id == 0 || groupID == "" {
		return errors.New("id 或 group 为空！")
	}
	token := Token{ID: id, GroupID: groupID}
	defer func() {
		if err == nil {
			if err := CacheDeleteToken(token.Key); err != nil {
				log.Error("delete token from cache failed: " + err.Error())
			}
		}
	}()
	result := DB.
		Clauses(clause.Returning{
			Columns: []clause.Column{
				{Name: "key"},
			},
		}).
		Where(token).
		Delete(&token)
	return HandleUpdateResult(result, ErrTokenNotFound)
}

func DeleteGroupTokensByIDs(groupID string, ids []int) (err error) {
	if len(ids) == 0 {
		return nil
	}
	tokens := make([]Token, len(ids))
	defer func() {
		if err == nil {
			for _, token := range tokens {
				if err := CacheDeleteToken(token.Key); err != nil {
					log.Error("delete token from cache failed: " + err.Error())
				}
			}
		}
	}()
	return DB.Transaction(func(tx *gorm.DB) error {
		return tx.
			Clauses(clause.Returning{
				Columns: []clause.Column{
					{Name: "key"},
				},
			}).
			Where("group_id = ?", groupID).
			Where("id IN (?)", ids).
			Delete(&tokens).
			Error
	})
}

func DeleteTokenByID(id int) (err error) {
	if id == 0 {
		return errors.New("id 为空！")
	}
	token := Token{ID: id}
	defer func() {
		if err == nil {
			if err := CacheDeleteToken(token.Key); err != nil {
				log.Error("delete token from cache failed: " + err.Error())
			}
		}
	}()
	result := DB.
		Clauses(clause.Returning{
			Columns: []clause.Column{
				{Name: "key"},
			},
		}).
		Where(token).
		Delete(&token)
	return HandleUpdateResult(result, ErrTokenNotFound)
}

func DeleteTokensByIDs(ids []int) (err error) {
	if len(ids) == 0 {
		return nil
	}
	tokens := make([]Token, len(ids))
	defer func() {
		if err == nil {
			for _, token := range tokens {
				if err := CacheDeleteToken(token.Key); err != nil {
					log.Error("delete token from cache failed: " + err.Error())
				}
			}
		}
	}()
	return DB.Transaction(func(tx *gorm.DB) error {
		return tx.
			Clauses(clause.Returning{
				Columns: []clause.Column{
					{Name: "key"},
				},
			}).
			Where("id IN (?)", ids).
			Delete(&tokens).
			Error
	})
}

func UpdateToken(token *Token) (err error) {
	defer func() {
		if err == nil {
			if err := CacheDeleteToken(token.Key); err != nil {
				log.Error("delete token from cache failed: " + err.Error())
			}
		}
	}()
	result := DB.Omit("created_at", "status", "key", "group_id", "used_amount", "request_count").Save(token)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrDuplicatedKey) {
			return errors.New("token name already exists in this group")
		}
	}
	return HandleUpdateResult(result, ErrTokenNotFound)
}

func UpdateTokenUsedAmount(id int, amount float64, requestCount int) (err error) {
	token := &Token{ID: id}
	defer func() {
		if amount > 0 && err == nil && token.Quota > 0 {
			if err := CacheUpdateTokenUsedAmountOnlyIncrease(token.Key, token.UsedAmount); err != nil {
				log.Error("update token used amount in cache failed: " + err.Error())
			}
		}
	}()
	result := DB.
		Model(token).
		Clauses(clause.Returning{
			Columns: []clause.Column{
				{Name: "key"},
				{Name: "quota"},
				{Name: "used_amount"},
			},
		}).
		Where("id = ?", id).
		Updates(
			map[string]interface{}{
				"used_amount":   gorm.Expr("used_amount + ?", amount),
				"request_count": gorm.Expr("request_count + ?", requestCount),
			},
		)
	return HandleUpdateResult(result, ErrTokenNotFound)
}

func UpdateTokenName(id int, name string) (err error) {
	token := &Token{ID: id}
	defer func() {
		if err == nil {
			if err := CacheUpdateTokenName(token.Key, name); err != nil {
				log.Error("update token name in cache failed: " + err.Error())
			}
		}
	}()
	result := DB.
		Model(token).
		Clauses(clause.Returning{
			Columns: []clause.Column{
				{Name: "key"},
			},
		}).
		Where("id = ?", id).
		Update("name", name)
	if result.Error != nil && errors.Is(result.Error, gorm.ErrDuplicatedKey) {
		return errors.New("token name already exists in this group")
	}
	return HandleUpdateResult(result, ErrTokenNotFound)
}

func UpdateGroupTokenName(group string, id int, name string) (err error) {
	token := &Token{ID: id, GroupID: group}
	defer func() {
		if err == nil {
			if err := CacheUpdateTokenName(token.Key, name); err != nil {
				log.Error("update token name in cache failed: " + err.Error())
			}
		}
	}()
	result := DB.
		Model(token).
		Clauses(clause.Returning{
			Columns: []clause.Column{
				{Name: "key"},
			},
		}).
		Where("id = ? and group_id = ?", id, group).
		Update("name", name)
	if result.Error != nil && errors.Is(result.Error, gorm.ErrDuplicatedKey) {
		return errors.New("token name already exists in this group")
	}
	return HandleUpdateResult(result, ErrTokenNotFound)
}
