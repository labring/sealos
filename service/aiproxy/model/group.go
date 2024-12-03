package model

import (
	"errors"
	"fmt"
	"strings"
	"time"

	json "github.com/json-iterator/go"

	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"gorm.io/gorm"
)

const (
	ErrGroupNotFound = "group"
)

const (
	GroupStatusEnabled  = 1 // don't use 0, 0 is the default value!
	GroupStatusDisabled = 2 // also don't use 0
)

type Group struct {
	CreatedAt    time.Time `json:"created_at"`
	AccessedAt   time.Time `json:"accessed_at"`
	ID           string    `gorm:"primaryKey"         json:"id"`
	Tokens       []*Token  `gorm:"foreignKey:GroupID" json:"-"`
	Status       int       `gorm:"default:1;index"    json:"status"`
	UsedAmount   float64   `gorm:"index"              json:"used_amount"`
	QPM          int64     `gorm:"index"              json:"qpm"`
	RequestCount int       `gorm:"index"              json:"request_count"`
}

func (g *Group) AfterDelete(tx *gorm.DB) (err error) {
	return tx.Model(&Token{}).Where("group_id = ?", g.ID).Delete(&Token{}).Error
}

func (g *Group) MarshalJSON() ([]byte, error) {
	type Alias Group
	return json.Marshal(&struct {
		*Alias
		CreatedAt  int64 `json:"created_at"`
		AccessedAt int64 `json:"accessed_at"`
	}{
		Alias:      (*Alias)(g),
		CreatedAt:  g.CreatedAt.UnixMilli(),
		AccessedAt: g.AccessedAt.UnixMilli(),
	})
}

//nolint:goconst
func getGroupOrder(order string) string {
	switch order {
	case "id-desc":
		return "id desc"
	case "request_count":
		return "request_count asc"
	case "request_count-desc":
		return "request_count desc"
	case "accessed_at":
		return "accessed_at asc"
	case "accessed_at-desc":
		return "accessed_at desc"
	case "status":
		return "status asc"
	case "status-desc":
		return "status desc"
	case "created_at":
		return "created_at asc"
	case "created_at-desc":
		return "created_at desc"
	case "used_amount":
		return "used_amount asc"
	case "used_amount-desc":
		return "used_amount desc"
	case "id":
		return "id asc"
	default:
		return "id desc"
	}
}

func GetGroups(startIdx int, num int, order string, onlyDisabled bool) (groups []*Group, total int64, err error) {
	tx := DB.Model(&Group{})
	if onlyDisabled {
		tx = tx.Where("status = ?", GroupStatusDisabled)
	}

	err = tx.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	if total <= 0 {
		return nil, 0, nil
	}

	err = tx.Order(getGroupOrder(order)).Limit(num).Offset(startIdx).Find(&groups).Error
	return groups, total, err
}

func GetGroupByID(id string) (*Group, error) {
	if id == "" {
		return nil, errors.New("id 为空！")
	}
	group := Group{ID: id}
	err := DB.First(&group, "id = ?", id).Error
	return &group, HandleNotFound(err, ErrGroupNotFound)
}

func DeleteGroupByID(id string) (err error) {
	if id == "" {
		return errors.New("id 为空！")
	}
	defer func() {
		if err == nil {
			if err := CacheDeleteGroup(id); err != nil {
				logger.SysError("CacheDeleteGroup failed: " + err.Error())
			}
			if _, err := DeleteGroupLogs(id); err != nil {
				logger.SysError("DeleteGroupLogs failed: " + err.Error())
			}
		}
	}()
	result := DB.
		Delete(&Group{
			ID: id,
		})
	return HandleUpdateResult(result, ErrGroupNotFound)
}

func UpdateGroupUsedAmountAndRequestCount(id string, amount float64, count int) error {
	result := DB.Model(&Group{}).Where("id = ?", id).Updates(map[string]interface{}{
		"used_amount":   gorm.Expr("used_amount + ?", amount),
		"request_count": gorm.Expr("request_count + ?", count),
		"accessed_at":   time.Now(),
	})
	return HandleUpdateResult(result, ErrGroupNotFound)
}

func UpdateGroupUsedAmount(id string, amount float64) error {
	result := DB.Model(&Group{}).Where("id = ?", id).Updates(map[string]interface{}{
		"used_amount": gorm.Expr("used_amount + ?", amount),
		"accessed_at": time.Now(),
	})
	return HandleUpdateResult(result, ErrGroupNotFound)
}

func UpdateGroupRequestCount(id string, count int) error {
	result := DB.Model(&Group{}).Where("id = ?", id).Updates(map[string]interface{}{
		"request_count": gorm.Expr("request_count + ?", count),
		"accessed_at":   time.Now(),
	})
	return HandleUpdateResult(result, ErrGroupNotFound)
}

func UpdateGroupQPM(id string, qpm int64) (err error) {
	defer func() {
		if err == nil {
			if err := CacheUpdateGroupQPM(id, qpm); err != nil {
				logger.SysError("CacheUpdateGroupQPM failed: " + err.Error())
			}
		}
	}()
	result := DB.Model(&Group{}).Where("id = ?", id).Update("qpm", qpm)
	return HandleUpdateResult(result, ErrGroupNotFound)
}

func UpdateGroupStatus(id string, status int) (err error) {
	defer func() {
		if err == nil {
			if err := CacheUpdateGroupStatus(id, status); err != nil {
				logger.SysError("CacheUpdateGroupStatus failed: " + err.Error())
			}
		}
	}()
	result := DB.Model(&Group{}).Where("id = ?", id).Update("status", status)
	return HandleUpdateResult(result, ErrGroupNotFound)
}

func SearchGroup(keyword string, startIdx int, num int, order string, status int) (groups []*Group, total int64, err error) {
	tx := DB.Model(&Group{})
	if status != 0 {
		tx = tx.Where("status = ?", status)
	}
	if common.UsingPostgreSQL {
		tx = tx.Where("id ILIKE ?", "%"+keyword+"%")
	} else {
		tx = tx.Where("id LIKE ?", "%"+keyword+"%")
	}
	if keyword != "" {
		var conditions []string
		var values []interface{}

		if status == 0 {
			conditions = append(conditions, "status = ?")
			values = append(values, 1)
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
	err = tx.Order(getGroupOrder(order)).Limit(num).Offset(startIdx).Find(&groups).Error
	return groups, total, err
}

func CreateGroup(group *Group) error {
	return DB.Create(group).Error
}
