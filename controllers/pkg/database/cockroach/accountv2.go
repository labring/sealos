// Copyright © 2024 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package cockroach

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/sirupsen/logrus"

	"gorm.io/gorm/clause"

	"gorm.io/gorm/logger"

	gonanoid "github.com/matoous/go-nanoid/v2"

	"gorm.io/driver/postgres"

	"github.com/labring/sealos/controllers/pkg/crypto"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/labring/sealos/controllers/pkg/types"
)

type Cockroach struct {
	DB                *gorm.DB
	Localdb           *gorm.DB
	LocalRegion       *types.Region
	ZeroAccount       *types.Account
	accountConfig     *types.AccountConfig
	tasks             map[uuid.UUID]types.Task
	subscriptionPlans *sync.Map
	// use sync.map : More suitable for writing once read multiple scenarios & Lock contention can be reduced when multiple processes operate on different keys
	ownerUsrUIDMap *sync.Map
	ownerUsrIDMap  *sync.Map
}

const (
	EnvLocalRegion = "LOCAL_REGION"
	EnvBaseBalance = "BASE_BALANCE"
)

func (c *Cockroach) CreateUser(oAuth *types.OauthProvider, regionUserCr *types.RegionUserCr, user *types.User, workspace *types.Workspace, userWorkspace *types.UserWorkspace) error {
	findUser, findRegionUserCr, findUserWorkspace := &types.User{}, &types.RegionUserCr{}, &types.UserWorkspace{}
	if c.DB.Where(&types.User{Nickname: user.Nickname}).First(findUser).Error == gorm.ErrRecordNotFound {
		findUser = user
		if err := c.DB.Save(user).Error; err != nil {
			return fmt.Errorf("failed to create user: %w", err)
		}
	}
	if c.DB.Where(types.OauthProvider{UserUID: findUser.UID}).First(&types.OauthProvider{}).Error == gorm.ErrRecordNotFound {
		oAuth.UserUID = findUser.UID
		if err := c.DB.Save(oAuth).Error; err != nil {
			return fmt.Errorf("failed to create user oauth provider: %w", err)
		}
	}
	if c.Localdb.Where(&types.RegionUserCr{CrName: regionUserCr.CrName}).First(findRegionUserCr).Error == gorm.ErrRecordNotFound {
		regionUserCr.UserUID = findUser.UID
		findRegionUserCr = regionUserCr
		if err := c.Localdb.Save(regionUserCr).Error; err != nil {
			return fmt.Errorf("failed to create user region cr: %w", err)
		}
	}
	if c.Localdb.Where(types.UserWorkspace{UserCrUID: findRegionUserCr.UID}).First(findUserWorkspace).Error == gorm.ErrRecordNotFound {
		userWorkspace.UserCrUID = findRegionUserCr.UID
		findUserWorkspace = userWorkspace
		if err := c.Localdb.Save(userWorkspace).Error; err != nil {
			return fmt.Errorf("failed to create user workspace: %w", err)
		}
	}
	if c.Localdb.Where(types.Workspace{UID: findUserWorkspace.WorkspaceUID}).First(&types.Workspace{}).Error == gorm.ErrRecordNotFound {
		workspace.UID = findUserWorkspace.WorkspaceUID
		if err := c.Localdb.Save(workspace).Error; err != nil {
			return fmt.Errorf("failed to create workspace: %w", err)
		}
	}
	return nil
}

func (c *Cockroach) CreateRegion(region *types.Region) error {
	if err := c.DB.Where(&types.Region{UID: region.UID}).FirstOrCreate(region).Error; err != nil {
		return fmt.Errorf("failed to create region: %w", err)
	}
	return nil
}

func (c *Cockroach) GetUser(ops *types.UserQueryOpts) (*types.User, error) {
	if err := checkOps(ops); err != nil {
		return nil, err
	}
	queryUser := &types.User{}
	if ops.UID != uuid.Nil {
		queryUser.UID = ops.UID
	} else if ops.ID != "" {
		queryUser.ID = ops.ID
	} else if ops.Owner != "" {
		userUID, err := c.getUserUIDByOwnerWithCache(ops.Owner)
		if err != nil {
			if ops.IgnoreEmpty && err == gorm.ErrRecordNotFound {
				return nil, nil
			}
			return nil, fmt.Errorf("failed to get user uid: %v", err)
		}
		queryUser.UID = userUID
	}
	var user types.User
	if err := c.DB.Where(queryUser).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func cloneMap(m map[int64]int64) map[int64]int64 {
	newMap := make(map[int64]int64, len(m))
	for k, v := range m {
		newMap[k] = v
	}
	return newMap
}

func (c *Cockroach) GetUserRechargeDiscount(ops *types.UserQueryOpts) (types.UserRechargeDiscount, error) {
	if ops.UID == uuid.Nil {
		userUID, err := c.GetUserUID(ops)
		if err != nil {
			return types.UserRechargeDiscount{}, fmt.Errorf("failed to get user uid: %v", err)
		}
		ops.UID = userUID
	}
	cfg, err := c.GetAccountConfig()
	if err != nil {
		return types.UserRechargeDiscount{}, fmt.Errorf("failed to get account config: %v", err)
	}
	activeSteps, firstRechargeSteps := cloneMap(cfg.DefaultDiscountSteps), cloneMap(cfg.FirstRechargeDiscountSteps)
	if firstRechargeSteps != nil {
		var firstRechargeTime time.Time
		if err := c.DB.Model(&types.Payment{}).Where(&types.Payment{PaymentRaw: types.PaymentRaw{UserUID: ops.UID}}).
			Order("created_at ASC").Limit(1).Select("created_at").Scan(&firstRechargeTime).Error; err != nil {
			if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				return types.UserRechargeDiscount{}, fmt.Errorf("failed to get first recharge time: %v", err)
			}
		}
		if !firstRechargeTime.IsZero() {
			if firstRechargeTime.After(time.Date(2024, 12, 0, 0, 0, 0, 0, time.UTC)) {
				payments, err := c.getActivePayments(ops, types.ActivityTypeFirstRecharge)
				if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
					return types.UserRechargeDiscount{}, fmt.Errorf("failed to get first recharge payments: %v", err)
				}
				if len(payments) != 0 {
					for i := range payments {
						delete(firstRechargeSteps, payments[i].Amount/BaseUnit)
					}
				}
			} else {
				firstRechargeSteps = map[int64]int64{}
			}
		}
	}
	if cfg.DefaultActiveType != "" {
		count, err := c.getActivePaymentCount(ops, cfg.DefaultActiveType)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return types.UserRechargeDiscount{}, fmt.Errorf("failed to get active payment count: %v", err)
		}
		if count > 0 {
			for i := range activeSteps {
				activeSteps[i] = 0
			}
		}
	}
	return types.UserRechargeDiscount{
		DefaultActiveType:  cfg.DefaultActiveType,
		DefaultSteps:       activeSteps,
		FirstRechargeSteps: firstRechargeSteps,
	}, nil
}

func (c *Cockroach) GetAccountConfig() (types.AccountConfig, error) {
	if c.accountConfig == nil {
		config := &types.Configs{}
		if err := c.DB.Where(&types.Configs{}).First(config).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return types.AccountConfig{}, nil
			}
			return types.AccountConfig{}, fmt.Errorf("failed to get account config: %v", err)
		}
		var accountConfig types.AccountConfig
		if err := json.Unmarshal([]byte(config.Data), &accountConfig); err != nil {
			return types.AccountConfig{}, fmt.Errorf("failed to unmarshal account config: %v", err)
		}
		c.accountConfig = &accountConfig
	}
	return *c.accountConfig, nil
}

func (c *Cockroach) InsertAccountConfig(config *types.AccountConfig) error {
	data, err := json.Marshal(config)
	if err != nil {
		return fmt.Errorf("failed to marshal account config: %v", err)
	}
	return c.DB.Model(&types.Configs{}).Create(&types.Configs{Type: types.AccountConfigType, Data: string(data)}).Error
}

func (c *Cockroach) IsNullRecharge(ops *types.UserQueryOpts) (bool, error) {
	if ops.UID == uuid.Nil {
		userUID, err := c.GetUserUID(ops)
		if err != nil {
			return false, fmt.Errorf("failed to get user: %v", err)
		}
		ops.UID = userUID
	}
	var count int64
	if err := c.DB.Model(&types.Payment{}).Where(&types.Payment{PaymentRaw: types.PaymentRaw{UserUID: ops.UID}}).
		Count(&count).Error; err != nil {
		return false, fmt.Errorf("failed to get payment count: %v", err)
	}
	return count == 0, nil
}

func (c *Cockroach) getActivePayments(ops *types.UserQueryOpts, activeType types.ActivityType) ([]types.Payment, error) {
	if ops.UID == uuid.Nil {
		userUID, err := c.GetUserUID(ops)
		if err != nil {
			return nil, fmt.Errorf("failed to get user uid: %v", err)
		}
		ops.UID = userUID
	}
	var payments []types.Payment
	if err := c.DB.Model(&types.Payment{}).Where(&types.Payment{PaymentRaw: types.PaymentRaw{UserUID: ops.UID}}).Where(`"activityType" = ?`, activeType).
		Find(&payments).Error; err != nil {
		return nil, fmt.Errorf("failed to get payment count: %v", err)
	}
	return payments, nil
}

// get active payments count
func (c *Cockroach) getActivePaymentCount(ops *types.UserQueryOpts, activeType types.ActivityType) (int64, error) {
	if ops.UID == uuid.Nil {
		userUID, err := c.GetUserUID(ops)
		if err != nil {
			return 0, fmt.Errorf("failed to get user uid: %v", err)
		}
		ops.UID = userUID
	}
	var count int64
	if err := c.DB.Model(&types.Payment{}).Where(&types.Payment{PaymentRaw: types.PaymentRaw{UserUID: ops.UID}}).Where(`"activityType" = ?`, activeType).
		Count(&count).Error; err != nil {
		return 0, fmt.Errorf("failed to get payment count: %v", err)
	}
	return count, nil
}

func (c *Cockroach) ProcessPendingTaskRewards() error {
	for {
		var userTask types.UserTask
		err := c.DB.Transaction(func(tx *gorm.DB) error {
			if err := tx.Clauses(clause.Locking{
				Strength: "UPDATE",
				Options:  "SKIP LOCKED",
			}).Where(&types.UserTask{
				Status:       types.TaskStatusCompleted,
				RewardStatus: types.TaskStatusNotCompleted,
			}).First(&userTask).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return err
				}
				return fmt.Errorf("failed to get pending reward user task: %w", err)
			}
			tasks, err := c.getTask()
			if err != nil {
				return fmt.Errorf("failed to get tasks: %w", err)
			}

			task := tasks[userTask.TaskID]
			if task.Reward == 0 {
				fmt.Printf("usertask %v reward is 0, skip\n", userTask)
				return nil
			}
			if err = c.updateBalanceRaw(tx, &types.UserQueryOpts{UID: userTask.UserUID}, task.Reward, false, true, true); err != nil {
				return fmt.Errorf("failed to update balance: %w", err)
			}
			msg := fmt.Sprintf("task %s reward", task.Title)
			transaction := types.AccountTransaction{
				Balance:   task.Reward,
				Type:      string(task.TaskType) + "_Reward",
				UserUID:   userTask.UserUID,
				ID:        uuid.New(),
				Message:   &msg,
				BillingID: userTask.ID,
			}
			if err = tx.Create(&transaction).Error; err != nil {
				return fmt.Errorf("failed to save transaction: %w", err)
			}
			if err = tx.Model(&userTask).Update("rewardStatus", types.TaskStatusCompleted).Error; err != nil {
				return fmt.Errorf("failed to update user task status: %w", err)
			}
			return nil
		})
		if errors.Is(err, gorm.ErrRecordNotFound) {
			break
		}
		if err != nil {
			return err
		}
	}
	return nil
}

func (c *Cockroach) getTask() (map[uuid.UUID]types.Task, error) {
	if len(c.tasks) != 0 {
		return c.tasks, nil
	}
	c.tasks = make(map[uuid.UUID]types.Task)
	var tasks []types.Task
	if err := c.DB.Model(&types.Task{IsActive: true, IsNewUserTask: true}).Find(&tasks).Error; err != nil {
		return nil, fmt.Errorf("failed to get tasks: %v", err)
	}
	for i := range tasks {
		c.tasks[tasks[i].ID] = tasks[i]
	}
	return c.tasks, nil
}

func (c *Cockroach) GetUserCr(ops *types.UserQueryOpts) (*types.RegionUserCr, error) {
	if ops.UID == uuid.Nil && ops.Owner == "" {
		if ops.ID == "" {
			return nil, fmt.Errorf("empty query opts")
		}
		userUID, err := c.getUserUIDByID(ops.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to get user: %v", err)
		}
		ops.UID = userUID
	}
	query := &types.RegionUserCr{
		CrName: ops.Owner,
	}
	if ops.UID != uuid.Nil {
		query.UserUID = ops.UID
	}
	var userCr types.RegionUserCr
	if err := c.Localdb.Where(query).First(&userCr).Error; err != nil {
		return nil, err
	}
	return &userCr, nil
}

func (c *Cockroach) GetAccountWithWorkspace(workspace string) (*types.Account, error) {
	if workspace == "" {
		return nil, fmt.Errorf("empty workspace")
	}
	var userUIDString string
	err := c.Localdb.Table("Workspace").
		Select(`"UserCr"."userUid"`).
		Joins(`JOIN "UserWorkspace" ON "Workspace".uid = "UserWorkspace"."workspaceUid"`).
		Joins(`JOIN "UserCr" ON "UserWorkspace"."userCrUid" = "UserCr".uid`).
		Where(`"Workspace".id = ?`, workspace).
		Where(`"UserWorkspace".role = ?`, "OWNER").
		Limit(1).
		Scan(&userUIDString).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("not found user uid with workspace %s", workspace)
		}
		return nil, fmt.Errorf("failed to get user uid with workspace %s: %v", workspace, err)
	}

	userUID, err := uuid.Parse(userUIDString)
	if err != nil {
		return nil, fmt.Errorf("failed to parse user uid %s: %v", userUIDString, err)
	}
	if userUID == uuid.Nil {
		return nil, fmt.Errorf("empty user uid")
	}

	var account types.Account
	err = c.DB.Where(&types.Account{UserUID: userUID}).First(&account).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("not found account with user uid %s", userUID)
		}
		return nil, fmt.Errorf("failed to get account with user uid %s: %v", userUID, err)
	}
	return &account, nil
}

func (c *Cockroach) GetUserUID(ops *types.UserQueryOpts) (uid uuid.UUID, err error) {
	if ops.UID != uuid.Nil {
		return ops.UID, nil
	}
	if ops.ID == "" && ops.Owner == "" {
		return uuid.Nil, fmt.Errorf("empty query opts")
	}
	// data in the cache owner is preferred
	if ops.Owner != "" {
		uid, err = c.getUserUIDByOwnerWithCache(ops.Owner)
	} else {
		uid, err = c.getUserUIDByID(ops.ID)
	}
	if err != nil {
		if ops.IgnoreEmpty && errors.Is(err, gorm.ErrRecordNotFound) {
			return uuid.Nil, nil
		}
		return uuid.Nil, err
	}
	if uid == uuid.Nil && !ops.IgnoreEmpty {
		return uuid.Nil, fmt.Errorf("failed to get userUID: record not found")
	}
	ops.UID = uid
	return uid, nil
}

func (c *Cockroach) GetUserID(ops *types.UserQueryOpts) (id string, err error) {
	if ops.ID != "" {
		return ops.ID, nil
	}
	if ops.Owner == "" && ops.UID == uuid.Nil {
		return "", fmt.Errorf("empty query opts")
	}
	if ops.Owner != "" {
		id, err = c.getUserIDByOwner(ops.Owner, !ops.WithOutCache)
		if ops.IgnoreEmpty && errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil
		}
		return id, err
	}
	id, err = c.getUserIDByUID(ops.UID)
	if err != nil {
		return "", fmt.Errorf("failed to get userID: %v", err)
	}
	if !ops.IgnoreEmpty && id == "" {
		return "", fmt.Errorf("user record not found")
	}
	return id, nil
}

func (c *Cockroach) getUserIDByUID(uid uuid.UUID) (string, error) {
	var user struct {
		ID string `gorm:"id"`
	}
	err := c.DB.Table("User").Select("id").Where("uid = ?", uid).First(&user).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return "", err
	}
	return user.ID, nil
}

func (c *Cockroach) getUserUIDByID(id string) (uuid.UUID, error) {
	var user struct {
		UID uuid.UUID `gorm:"uid,type:uuid"`
	}
	err := c.DB.Table("User").Select("uid").Where("id = ?", id).First(&user).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return uuid.Nil, fmt.Errorf("failed to get userUIDByID: %v", err)
	}
	return user.UID, nil
}

// cache user owner uid mapping
func (c *Cockroach) getUserUIDByOwnerWithCache(owner string) (uuid.UUID, error) {
	if v, ok := c.ownerUsrUIDMap.Load(owner); ok {
		return v.(uuid.UUID), nil
	}
	userUID, err := c.getUserUIDByOwner(owner)
	if err != nil {
		return uuid.Nil, err
	}
	c.ownerUsrUIDMap.Store(owner, userUID)
	return userUID, nil
}

func (c *Cockroach) getUserUIDByOwner(owner string) (uuid.UUID, error) {
	var user struct {
		UID uuid.UUID `gorm:"column:userUid;type:uuid"`
	}
	err := c.Localdb.Table(`"UserCr"`).Select(`"userUid"`).Where(`"crName" = ?`, owner).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return uuid.Nil, err
		}
		return uuid.Nil, fmt.Errorf("failed to get userUID: %v", err)
	}
	return user.UID, nil
}

func (c *Cockroach) getUserIDByOwner(owner string, withCache bool) (string, error) {
	if withCache {
		if v, ok := c.ownerUsrIDMap.Load(owner); ok {
			return v.(string), nil
		}
	}
	var (
		userUID uuid.UUID
		err     error
	)
	if withCache {
		userUID, err = c.getUserUIDByOwnerWithCache(owner)
	} else {
		userUID, err = c.getUserUIDByOwner(owner)
	}
	if err != nil {
		return "", err
	}
	userID, err := c.getUserIDByUID(userUID)
	if err != nil {
		return "", err
	}
	c.ownerUsrIDMap.Store(owner, userID)
	return userID, nil
}

func (c *Cockroach) GetWorkspace(namespaces ...string) ([]types.Workspace, error) {
	if len(namespaces) == 0 {
		return nil, fmt.Errorf("empty namespaces")
	}
	var workspaces []types.Workspace
	if err := c.Localdb.Where("id IN ?", namespaces).Find(&workspaces).Error; err != nil {
		return nil, fmt.Errorf("failed to get workspaces: %v", err)
	}
	return workspaces, nil
}

func checkOps(ops *types.UserQueryOpts) error {
	if ops.Owner == "" && ops.UID == uuid.Nil && ops.ID == "" {
		return fmt.Errorf("empty query opts")
	}
	return nil
}

func (c *Cockroach) GetAccount(ops *types.UserQueryOpts) (*types.Account, error) {
	return c.getAccount(ops)
}

func (c *Cockroach) GetAccountWithCredits(userUID uuid.UUID) (*types.UsableBalanceWithCredits, error) {
	ctx := context.Background()
	result := &types.UsableBalanceWithCredits{
		UserUID: userUID,
	}
	err := c.DB.WithContext(ctx).Raw(`
        SELECT 
            a.balance,
            a.deduction_balance,
            a.create_region_id,
            COALESCE((
                SELECT SUM(c.amount - c.used_amount)
                FROM "Credits" c
                WHERE c.user_uid = a."userUid"
                AND c.status = 'active'
                AND (c.expire_at IS NULL OR c.expire_at > CURRENT_TIMESTAMP)
                AND (c.start_at IS NULL OR c.start_at <= CURRENT_TIMESTAMP)
            ), 0) as usable_credits
        FROM "Account" a
        WHERE a."userUid" = ?
        LIMIT 1
    `, userUID).Scan(result).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, err // Return gorm.ErrRecordNotFound values if no account found
		}
		return nil, fmt.Errorf("failed to query account with credits: %w", err)
	}
	return result, nil
}

func (c *Cockroach) GetAvailableCredits(ops *types.UserQueryOpts) ([]types.Credits, error) {
	userUID, err := c.GetUserUID(ops)
	if err != nil {
		return nil, fmt.Errorf("failed to get user uid: %v", err)
	}
	var credits []types.Credits
	err = c.DB.Model(&types.Credits{}).Where(
		`user_uid = ? 
		AND (expire_at IS NULL OR expire_at > CURRENT_TIMESTAMP)
		AND (start_at IS NULL OR start_at <= CURRENT_TIMESTAMP)
		AND status != 'expired'`, userUID).Find(&credits).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to get credits: %v", err)
	}
	return credits, nil
}

func (c *Cockroach) SetAccountCreateLocalRegion(account *types.Account, region string) error {
	account.CreateRegionID = region
	return c.DB.Save(account).Error
}

func (c *Cockroach) GetTransfer(ops *types.GetTransfersReq) (*types.GetTransfersResp, error) {
	if ops.ID == "" {
		user, err := c.GetUser(ops.UserQueryOpts)
		if err != nil {
			return nil, fmt.Errorf("failed to get user uid: %v", err)
		}
		ops.UID = user.UID
		ops.ID = user.ID
	}
	page, pageSize := ops.Page, ops.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}

	start, end := ops.StartTime, ops.EndTime
	if end.IsZero() {
		end = time.Now().UTC()
	}

	fmt.Printf("start: %v, end: %v\n", start, end)
	var (
		transfers []types.Transfer
		count     int64
	)

	err := c.performTransferQuery(ops, pageSize, (page-1)*pageSize, start, end, &transfers, &count)
	if err != nil {
		return nil, err
	}

	resp := types.GetTransfersResp{
		Transfers: transfers,
		LimitResp: types.LimitResp{
			Total:     count,
			TotalPage: (count + int64(pageSize) - 1) / int64(pageSize),
		}}
	return &resp, nil
}

func (c *Cockroach) performTransferQuery(ops *types.GetTransfersReq, limit, offset int, start, end time.Time, transfers *[]types.Transfer, count *int64) error {
	var err error
	query := c.DB.Model(&types.Transfer{}).Limit(limit).Offset(offset).
		Where("created_at BETWEEN ? AND ?", start, end)
	countQuery := c.DB.Model(&types.Transfer{}).
		Where("created_at BETWEEN ? AND ?", start, end)

	userCondition := "1 = 1"
	args := []interface{}{}
	if ops.TransferID != "" {
		query = c.DB.Where(types.Transfer{ID: ops.TransferID})
	} else {
		switch ops.Type {
		case types.TypeTransferIn:
			userCondition = `"toUserUid" = ? OR "toUserId" = ?`
			args = append(args, ops.UID, ops.ID)
		case types.TypeTransferOut:
			userCondition = `"fromUserUid" = ? OR "fromUserId" = ?`
			args = append(args, ops.UID, ops.ID)
		default:
			userCondition = `"fromUserUid" = ? OR "fromUserId" = ? OR "toUserUid" = ? OR "toUserId" = ?`
			args = append(args, ops.UID, ops.ID, ops.UID, ops.ID)
		}
	}

	query = query.Where(userCondition, args...)
	countQuery = countQuery.Where(userCondition, args...)

	query = query.Order("created_at DESC")
	err = query.Find(transfers).Error
	if err != nil {
		return fmt.Errorf("failed to get transfer: %v", err)
	}

	if ops.TransferID == "" {
		err = countQuery.Count(count).Error
		if err != nil {
			return fmt.Errorf("failed to get transfer count: %v", err)
		}
	} else {
		*count = 1
	}

	return nil
}

func (c *Cockroach) getAccount(ops *types.UserQueryOpts) (*types.Account, error) {
	var err error
	if ops.UID == uuid.Nil {
		ops.UID, err = c.GetUserUID(ops)
		if err != nil {
			return nil, fmt.Errorf("failed to get user uid: %v", err)
		}
		if ops.UID == uuid.Nil {
			return nil, fmt.Errorf("user record not found with query opts: %v", ops)
		}
	}
	var account types.Account
	if err := c.DB.Where(types.Account{UserUID: ops.UID}).First(&account).Error; err != nil {
		if ops.IgnoreEmpty && errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &account, nil
}

func (c *Cockroach) GetUserOauthProvider(ops *types.UserQueryOpts) ([]types.OauthProvider, error) {
	if ops.UID == uuid.Nil {
		userUID, err := c.GetUserUID(ops)
		if err != nil {
			return nil, fmt.Errorf("failed to get user uid: %v", err)
		}
		ops.UID = userUID
	}
	var provider []types.OauthProvider
	if err := c.DB.Where(types.OauthProvider{UserUID: ops.UID}).Find(&provider).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get user oauth provider: %v", err)
	}
	return provider, nil
}

func (c *Cockroach) AddDeductionBalanceWithCredits(ops *types.UserQueryOpts, deductionAmount int64, orderIDs []string) error {
	err := RetryTransaction(3, 2*time.Second, c.DB, func(tx *gorm.DB) error {
		userUID, dErr := c.GetUserUID(ops)
		if dErr != nil {
			return fmt.Errorf("failed to get user uid: %v", dErr)
		}
		var credits []types.Credits
		if dErr = c.DB.Where("user_uid = ? AND expire_at > ? AND status = ?", userUID, time.Now().UTC(), types.CreditsStatusActive).Order("expire_at ASC").Find(&credits).Error; dErr != nil {
			return fmt.Errorf("failed to get credits: %v", dErr)
		}
		now := time.Now().UTC()
		accountTransactionID := uuid.New()
		accountTransaction := types.AccountTransaction{
			ID:            accountTransactionID,
			RegionUID:     c.LocalRegion.UID,
			Type:          "RESOURCE_BILLING",
			UserUID:       userUID,
			CreatedAt:     now,
			UpdatedAt:     now,
			BillingIDList: orderIDs,
		}
		var updateCredits []types.Credits
		var updateCreditsIDs []string
		//var creditTransactions []types.CreditsTransaction
		var creditUsedAmountAll int64
		for i := range credits {
			creditAmt := credits[i].Amount - credits[i].UsedAmount
			if creditAmt > 0 && deductionAmount > 0 {
				usedAmount := int64(0)
				if creditAmt > deductionAmount {
					credits[i].UsedAmount += deductionAmount
					usedAmount = deductionAmount
				} else {
					credits[i].UsedAmount = credits[i].Amount
					credits[i].Status = types.CreditsStatusUsedUp
					usedAmount = creditAmt
				}
				creditUsedAmountAll += usedAmount
				deductionAmount -= usedAmount
				//creditTransactions = append(creditTransactions, types.CreditsTransaction{
				//	ID:                   uuid.New(),
				//	UserUID:              userUID,
				//	RegionUID:            c.LocalRegion.UID,
				//	AccountTransactionID: &accountTransactionID,
				//	CreditsID:            credits[i].ID,
				//	UsedAmount:           usedAmount,
				//	CreatedAt:            now,
				//	Reason:               types.CreditsRecordReasonResourceAccountTransaction,
				//})
				credits[i].UpdatedAt = now
				updateCredits = append(updateCredits, credits[i])
				updateCreditsIDs = append(updateCreditsIDs, credits[i].ID.String())
			}
		}
		if len(updateCredits) > 0 {
			for _, credit := range updateCredits {
				if dErr = tx.Save(&credit).Error; dErr != nil {
					return fmt.Errorf("failed to update credits: %v", dErr)
				}
			}
			accountTransaction.DeductionCredit = creditUsedAmountAll
			accountTransaction.CreditIDList = updateCreditsIDs
		}
		if deductionAmount > 0 {
			if dErr = c.updateBalance(tx, ops, deductionAmount, true, true); dErr != nil {
				return fmt.Errorf("failed to update balance: %v", dErr)
			}
			accountTransaction.DeductionBalance = deductionAmount
		} else {
			accountTransaction.DeductionBalance = 0
		}
		//if dErr = tx.Create(&accountTransaction).Error; dErr != nil {
		//	return fmt.Errorf("failed to create account transaction: %v", dErr)
		//}
		//if len(creditTransactions) > 0 {
		//	if dErr = tx.Create(&creditTransactions).Error; dErr != nil {
		//		return fmt.Errorf("failed to create credit transactions: %v", dErr)
		//	}
		//}
		return nil
	})
	return err
}

func RetryTransaction(retryCount int, interval time.Duration, db *gorm.DB, f func(tx *gorm.DB) error) error {
	var err error
	for i := 0; i < retryCount; i++ {
		err = db.Transaction(f)
		if err == nil {
			return nil
		}
		logrus.Errorf("failed to execute transaction: %v, retrying %d", err, i+1)
		time.Sleep(interval)
	}
	return err
}

func (c *Cockroach) CreateCredits(credits *types.Credits) error {
	return c.DB.Create(credits).Error
}

func CreateCredits(db *gorm.DB, credits *types.Credits) error {
	if credits.ID == uuid.Nil {
		credits.ID = uuid.New()
	}
	if credits.CreatedAt.IsZero() {
		credits.CreatedAt = time.Now()
	}
	if credits.ExpireAt.IsZero() {
		credits.ExpireAt = time.Now().AddDate(0, 1, 0)
	}
	if credits.Status == "" {
		credits.Status = types.CreditsStatusActive
	}
	return db.Create(credits).Error
}

func (c *Cockroach) updateBalance(tx *gorm.DB, ops *types.UserQueryOpts, amount int64, isDeduction, add bool) error {
	return c.updateBalanceRaw(tx, ops, amount, isDeduction, add, false)
}

func (c *Cockroach) updateBalanceRaw(tx *gorm.DB, ops *types.UserQueryOpts, amount int64, isDeduction, add bool, isActive bool) error {
	if amount == 0 {
		return nil
	}
	userUID, err := c.GetUserUID(ops)
	if err != nil {
		return fmt.Errorf("failed to get user uid: %v", err)
	}
	return c.updateWithAccount(userUID, isDeduction, add, isActive, amount, tx)
}

func AddDeductionAccount(tx *gorm.DB, userUID uuid.UUID, amount int64) error {
	return tx.Model(&types.Account{}).Where(`"userUid" = ?`, userUID).Updates(map[string]interface{}{
		`"deduction_balance"`: gorm.Expr("deduction_balance + ?", amount),
	}).Error
}

func (c *Cockroach) updateWithAccount(userUID uuid.UUID, isDeduction, add, isActive bool, amount int64, db *gorm.DB) error {
	exprs := map[string]interface{}{}
	control := "-"
	if add {
		control = "+"
	}
	if isDeduction {
		exprs["deduction_balance"] = gorm.Expr("deduction_balance "+control+" ?", amount)
	} else {
		exprs["balance"] = gorm.Expr("balance "+control+" ?", amount)
	}
	if isActive {
		exprs[`"activityBonus"`] = gorm.Expr(`"activityBonus" + ?`, amount)
	}
	exprs["updated_at"] = gorm.Expr("CURRENT_TIMESTAMP")
	result := db.Model(&types.Account{}).Where(`"userUid" = ?`, userUID).Updates(exprs)
	return HandleUpdateResult(result, types.Account{}.TableName())
}

func HandleUpdateResult(result *gorm.DB, entityName string) error {
	if result.Error != nil {
		return fmt.Errorf("failed to update %s: %w", entityName, result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("no %s updated", entityName)
	}
	return nil
}

func (c *Cockroach) AddBalance(ops *types.UserQueryOpts, amount int64) error {
	return c.DB.Transaction(func(tx *gorm.DB) error {
		return c.updateBalance(tx, ops, amount, false, true)
	})
}

func (c *Cockroach) AddRewardBalance(ops *types.UserQueryOpts, amount int64, db *gorm.DB) error {
	return db.Transaction(func(tx *gorm.DB) error {
		return c.updateBalance(tx, ops, amount, false, true)
	})
}

func (c *Cockroach) ReduceBalance(ops *types.UserQueryOpts, amount int64) error {
	return c.DB.Transaction(func(tx *gorm.DB) error {
		return c.updateBalance(tx, ops, amount, false, false)
	})
}

func (c *Cockroach) ReduceDeductionBalance(ops *types.UserQueryOpts, amount int64) error {
	return c.DB.Transaction(func(tx *gorm.DB) error {
		return c.updateBalance(tx, ops, amount, false, false)
	})
}

func (c *Cockroach) AddDeductionBalance(ops *types.UserQueryOpts, amount int64) error {
	return c.DB.Transaction(func(tx *gorm.DB) error {
		return c.updateBalance(tx, ops, amount, true, true)
	})
}

func (c *Cockroach) AddDeductionBalanceWithDB(ops *types.UserQueryOpts, amount int64, tx *gorm.DB) error {
	return c.updateBalance(tx, ops, amount, true, true)
}

func (c *Cockroach) AddDeductionBalanceWithFunc(ops *types.UserQueryOpts, amount int64, preDo, postDo func() error) error {
	return c.DB.Transaction(func(tx *gorm.DB) error {
		if err := preDo(); err != nil {
			return err
		}
		if err := c.updateBalance(tx, ops, amount, true, true); err != nil {
			return err
		}
		return postDo()
	})
}

func (c *Cockroach) CreateAccount(ops *types.UserQueryOpts, account *types.Account) (*types.Account, error) {
	if ops.UID == uuid.Nil {
		userUID, err := c.GetUserUID(ops)
		if err != nil {
			return nil, fmt.Errorf("failed to get user uid: %v", err)
		}
		ops.UID = userUID
	}
	account.UserUID = ops.UID
	if account.EncryptBalance == "" || account.EncryptDeductionBalance == "" {
		return nil, fmt.Errorf("empty encrypt balance")
	}

	if err := c.DB.FirstOrCreate(account).Error; err != nil {
		return nil, fmt.Errorf("failed to create account: %w", err)
	}

	return account, nil
}

func (c *Cockroach) PaymentWithFunc(payment *types.Payment, preDo, postDo func(tx *gorm.DB) error) error {
	return c.paymentWithFunc(payment, true, preDo, postDo)
}

func (c *Cockroach) Payment(payment *types.Payment) error {
	return c.payment(payment, true)
}

func (c *Cockroach) SavePayment(payment *types.Payment) error {
	return c.payment(payment, false)
}

func (c *Cockroach) payment(payment *types.Payment, updateBalance bool) error {
	return c.paymentWithFunc(payment, updateBalance, nil, nil)
}

func (c *Cockroach) paymentWithFunc(payment *types.Payment, updateBalance bool, preDo, postDo func(db *gorm.DB) error) error {
	if payment.ID == "" {
		id, err := gonanoid.New(12)
		if err != nil {
			return fmt.Errorf("failed to generate payment id: %v", err)
		}
		payment.ID = id
	}
	if payment.CreatedAt.IsZero() {
		payment.CreatedAt = time.Now()
	}
	if payment.RegionUID == uuid.Nil {
		payment.RegionUID = c.LocalRegion.UID
	}
	if payment.UserUID == uuid.Nil {
		if payment.RegionUserOwner == "" {
			return fmt.Errorf("empty payment owner and user")
		}
		userUID, err := c.getUserUIDByOwnerWithCache(payment.RegionUserOwner)
		if err != nil {
			return fmt.Errorf("failed to get user uid: %v", err)
		}
		payment.UserUID = userUID
	}

	return c.DB.Transaction(func(tx *gorm.DB) error {
		if preDo != nil {
			if err := preDo(tx); err != nil {
				return fmt.Errorf("failed to preDo: %w", err)
			}
		}
		if err := tx.First(&types.Payment{ID: payment.ID}).Error; err == nil {
			return nil
		}
		if err := tx.Create(payment).Error; err != nil {
			return fmt.Errorf("failed to save payment: %w", err)
		}
		if updateBalance {
			if err := c.updateBalance(tx, &types.UserQueryOpts{UID: payment.UserUID}, payment.Amount+payment.Gift, false, true); err != nil {
				return fmt.Errorf("failed to add balance: %w", err)
			}
		}
		if postDo != nil {
			if err := postDo(tx); err != nil {
				return fmt.Errorf("failed to postDo: %w", err)
			}
		}
		return nil
	})
}

func (c *Cockroach) GlobalTransactionHandler(funcs ...func(tx *gorm.DB) error) error {
	return GlobalTransactionHandler(c.DB, funcs...)
}

func GlobalTransactionHandler(db *gorm.DB, funcs ...func(tx *gorm.DB) error) error {
	return db.Transaction(func(tx *gorm.DB) error {
		for _, f := range funcs {
			if err := f(tx); err != nil {
				return err
			}
		}
		return nil
	})
}

func (c *Cockroach) GetRegions() ([]types.Region, error) {
	var regions []types.Region
	if err := c.DB.Find(&regions).Error; err != nil {
		return nil, fmt.Errorf("failed to get regions: %v", err)
	}
	return regions, nil
}

func (c *Cockroach) GetLocalRegion() types.Region {
	if c.LocalRegion.Domain == "" {
		regions, err := c.GetRegions()
		if err == nil {
			for i := range regions {
				if regions[i].UID == c.LocalRegion.UID {
					c.LocalRegion = &regions[i]
					return *c.LocalRegion
				}
			}
		}
	}
	return *c.LocalRegion
}

func (c *Cockroach) GetPayment(ops *types.UserQueryOpts, startTime, endTime time.Time) ([]types.Payment, error) {
	userUID, err := c.GetUserUID(ops)
	if err != nil {
		return nil, fmt.Errorf("failed to get user uid: %v", err)
	}
	var payment []types.Payment
	if startTime != endTime {
		if err := c.DB.Where(types.Payment{PaymentRaw: types.PaymentRaw{UserUID: userUID}}).Where("created_at >= ? AND created_at <= ?", startTime, endTime).Find(&payment).Error; err != nil {
			return nil, fmt.Errorf("failed to get payment: %w", err)
		}
	} else {
		if err := c.DB.Where(types.Payment{PaymentRaw: types.PaymentRaw{UserUID: userUID}}).Find(&payment).Error; err != nil {
			return nil, fmt.Errorf("failed to get payment: %w", err)
		}
	}
	return payment, nil
}

func (c *Cockroach) GetPaymentWithID(paymentID string) (*types.Payment, error) {
	var payment types.Payment
	if err := c.DB.Where(types.Payment{ID: paymentID}).First(&payment).Error; err != nil {
		return nil, fmt.Errorf("failed to get payment: %w", err)
	}
	return &payment, nil
}

func (c *Cockroach) GetPaymentWithLimit(ops *types.UserQueryOpts, req types.LimitReq, invoiced *bool) ([]types.Payment, types.LimitResp, error) {
	var payment []types.Payment
	var total int64
	var limitResp types.LimitResp
	page, pageSize := req.Page, req.PageSize
	userUID, err := c.GetUserUID(ops)
	if err != nil {
		return nil, limitResp, fmt.Errorf("failed to get user uid: %v", err)
	}

	queryPayment := types.Payment{PaymentRaw: types.PaymentRaw{UserUID: userUID}}
	query := c.DB.Model(&types.Payment{}).Where(queryPayment)
	if invoiced != nil {
		query = query.Where("invoiced_at = ?", *invoiced)
	}
	if !req.StartTime.IsZero() {
		query = query.Where("created_at >= ?", req.StartTime)
	}
	if !req.EndTime.IsZero() {
		query = query.Where("created_at <= ?", req.EndTime)
	}
	if err := query.Count(&total).Error; err != nil {
		return nil, limitResp, fmt.Errorf("failed to get total count: %v", err)
	}
	totalPage := (total + int64(pageSize) - 1) / int64(pageSize)
	if err := query.Order("created_at DESC").
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Find(&payment).Error; err != nil {
		return nil, limitResp, fmt.Errorf("failed to get payment: %v", err)
	}
	limitResp = types.LimitResp{
		Total:     total,
		TotalPage: totalPage,
	}
	return payment, limitResp, nil
}

func (c *Cockroach) GetUnInvoicedPaymentListWithIDs(ids []string) ([]types.Payment, error) {
	var payment []types.Payment
	if err := c.DB.Where("id IN ?", ids).Where("invoiced_at = ?", false).Find(&payment).Error; err != nil {
		return nil, fmt.Errorf("failed to get payment: %w", err)
	}
	return payment, nil
}

func (c *Cockroach) SetPaymentInvoice(ops *types.UserQueryOpts, paymentIDList []string) error {
	userUID, err := c.GetUserUID(ops)
	if err != nil {
		return fmt.Errorf("failed to get user uid: %v", err)
	}
	if err := c.DB.Model(&types.Payment{}).Where(types.Payment{PaymentRaw: types.PaymentRaw{UserUID: userUID}}).Where("id IN ?", paymentIDList).Update("invoiced_at", true).Error; err != nil {
		return fmt.Errorf("failed to save payment: %v", err)
	}
	return nil
}

func (c *Cockroach) CreatePaymentOrder(order *types.PaymentOrder) error {
	return CreatePaymentOrder(c.DB, order)
}

func CreatePaymentOrder(tx *gorm.DB, order *types.PaymentOrder) error {
	if order.UserUID == uuid.Nil {
		return fmt.Errorf("empty user uid")
	}
	if order.ID == "" {
		id, err := gonanoid.New(12)
		if err != nil {
			return fmt.Errorf("failed to generate payment order id: %v", err)
		}
		order.ID = id
	}
	if order.Status == "" {
		order.Status = types.PaymentOrderStatusPending
	}
	if order.CreatedAt.IsZero() {
		order.CreatedAt = time.Now()
	}
	if err := tx.Create(order).Error; err != nil {
		return fmt.Errorf("failed to save payment order: %v", err)
	}
	return nil
}

func (c *Cockroach) SetPaymentOrderStatusWithTradeNo(status types.PaymentOrderStatus, tradeNo string) error {
	return SetPaymentOrderStatusWithTradeNo(c.DB, status, tradeNo)
}

func SetPaymentOrderStatusWithTradeNo(db *gorm.DB, status types.PaymentOrderStatus, tradeNo string) error {
	return db.Model(&types.PaymentOrder{}).Where(types.PaymentOrder{PaymentRaw: types.PaymentRaw{TradeNO: tradeNo}}).Update("status", status).Error
}

func (c *Cockroach) GetPaymentOrderWithTradeNo(tradeNo string) (*types.PaymentOrder, error) {
	if tradeNo == "" {
		return nil, fmt.Errorf("empty trade no")
	}
	var order types.PaymentOrder
	if err := c.DB.Model(&types.PaymentOrder{}).Where(types.PaymentOrder{PaymentRaw: types.PaymentRaw{TradeNO: tradeNo}}).Find(&order).Error; err != nil {
		return nil, fmt.Errorf("failed to get payment order: %v", err)
	}
	return &order, nil
}

func (c *Cockroach) GetAllCardInfo(ops *types.UserQueryOpts) ([]types.CardInfo, error) {
	userUID, err := c.GetUserUID(ops)
	if err != nil {
		return nil, fmt.Errorf("failed to get user uid: %v", err)
	}
	var cardInfos []types.CardInfo
	if err := c.DB.Where(types.CardInfo{UserUID: userUID}).Find(&cardInfos).Error; err != nil {
		return nil, err
	}
	return cardInfos, nil
}

func (c *Cockroach) GetSubscriptionPlanList() ([]types.SubscriptionPlan, error) {
	var plans []types.SubscriptionPlan
	if err := c.DB.Model(types.SubscriptionPlan{}).Find(&plans).Error; err != nil {
		return nil, fmt.Errorf("failed to get subscription plan: %v", err)
	}
	return plans, nil
}

func (c *Cockroach) SetSubscriptionPlanList(plans []types.SubscriptionPlan) error {
	return c.DB.Create(plans).Error
}

func (c *Cockroach) GetCardList(ops *types.UserQueryOpts) ([]types.CardInfo, error) {
	userUID, err := c.GetUserUID(ops)
	if err != nil {
		return nil, fmt.Errorf("failed to get user uid: %v", err)
	}
	var cards []types.CardInfo
	if err := c.DB.Where(types.CardInfo{UserUID: userUID}).Find(&cards).Error; err != nil {
		return nil, err
	}
	return cards, nil
}

func (c *Cockroach) DeleteCardInfo(id uuid.UUID, userUID uuid.UUID) error {
	if userUID == uuid.Nil || id == uuid.Nil {
		return fmt.Errorf("empty user uid or card id")
	}
	var card types.CardInfo
	if err := c.DB.Where(types.CardInfo{ID: id, UserUID: userUID}).First(&card).Error; err != nil {
		return fmt.Errorf("failed to get card info: %v", err)
	}
	if card.Default {
		return fmt.Errorf("can not delete default card")
	}
	return c.DB.Delete(&card).Error
}

func (c *Cockroach) SetDefaultCard(cardID uuid.UUID, userUID uuid.UUID) error {
	if userUID == uuid.Nil || cardID == uuid.Nil {
		return fmt.Errorf("empty user uid or card id")
	}
	var card types.CardInfo
	if err := c.DB.Where(types.CardInfo{ID: cardID, UserUID: userUID}).First(&card).Error; err != nil {
		return fmt.Errorf("failed to get card info: %v", err)
	}
	if card.Default {
		return nil
	}
	if err := c.DB.Model(&types.CardInfo{}).Where(types.CardInfo{UserUID: userUID}).Update("default", false).Error; err != nil {
		return fmt.Errorf("failed to update card info: %v", err)
	}
	return c.DB.Model(&types.CardInfo{}).Where(types.CardInfo{ID: cardID, UserUID: userUID}).Update("default", true).Error
}

func (c *Cockroach) GetSubscription(ops *types.UserQueryOpts) (*types.Subscription, error) {
	userUID, err := c.GetUserUID(ops)
	if err != nil {
		return nil, fmt.Errorf("failed to get user uid: %v", err)
	}
	var subscription types.Subscription
	if err := c.DB.Where(
		"user_uid", userUID,
	).Find(&subscription).Error; err != nil {
		return nil, err
	}
	return &subscription, nil
}

func (c *Cockroach) CreateSubscription(subscription *types.Subscription) error {
	if subscription.PlanID == uuid.Nil || subscription.PlanName == "" || subscription.UserUID == uuid.Nil || subscription.Status == "" {
		return fmt.Errorf("empty subscription info")
	}
	return c.DB.Save(subscription).Error
}

func CreateSubscriptionTransaction(db *gorm.DB, transaction *types.SubscriptionTransaction) error {
	if transaction.SubscriptionID == uuid.Nil {
		return fmt.Errorf("empty subscription id")
	}
	if transaction.CreatedAt.IsZero() {
		transaction.CreatedAt = time.Now()
	}
	return db.Create(transaction).Error
}

func GetActiveSubscriptionTransactionCount(db *gorm.DB, userUID uuid.UUID) (int64, error) {
	nulActiveStatus := []types.SubscriptionTransactionStatus{
		types.SubscriptionTransactionStatusCompleted,
		types.SubscriptionTransactionStatusFailed,
	}
	var count int64
	if err := db.Model(&types.SubscriptionTransaction{}).Where("user_uid = ? AND status NOT IN ?", userUID, nulActiveStatus).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (c *Cockroach) GetCardInfo(cardID, userUID uuid.UUID) (*types.CardInfo, error) {
	var cardInfo types.CardInfo
	if err := c.DB.Where(types.CardInfo{ID: cardID, UserUID: userUID}).First(&cardInfo).Error; err != nil {
		return nil, err
	}
	return &cardInfo, nil
}

func (c *Cockroach) SetCardInfo(info *types.CardInfo) (uuid.UUID, error) {
	return SetCardInfo(c.DB, info)
}

func SetCardInfo(db *gorm.DB, info *types.CardInfo) (uuid.UUID, error) {
	if info.ID == uuid.Nil {
		info.ID = uuid.New()
	}
	if info.CardToken == "" {
		return uuid.Nil, fmt.Errorf("empty card token")
	}
	if info.CreatedAt.IsZero() {
		info.CreatedAt = time.Now()
	}
	var count int64
	// 如果没有设置默认卡片，设置第一张卡片为默认卡片
	if err := db.Model(&types.CardInfo{}).Where(types.CardInfo{UserUID: info.UserUID}).Count(&count).Error; err != nil {
		return uuid.Nil, fmt.Errorf("failed to get card count: %v", err)
	}
	if count == 0 {
		info.Default = true
		return info.ID, db.Save(info).Error
	}
	cardInfo := types.CardInfo{}
	if err := db.Model(&types.CardInfo{}).Where(types.CardInfo{UserUID: info.UserUID, CardNo: info.CardNo, CardBrand: info.CardBrand}).First(&cardInfo).Error; err != nil {
		logrus.Errorf("failed to get card info: %v", err)
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return uuid.Nil, fmt.Errorf("failed to get card info: %v", err)
		}
		logrus.Infof("card info not found, create new card info")
		return info.ID, db.Save(info).Error
	}
	if cardInfo.CardToken != info.CardToken && info.CardToken != "" {
		err := db.Model(&types.CardInfo{}).Where(types.CardInfo{ID: cardInfo.ID}).Update("card_token", info.CardToken).Error
		if err != nil {
			return uuid.Nil, fmt.Errorf("failed to update card token: %v", err)
		}
	}
	logrus.Infof("card info found, update card info")
	return cardInfo.ID, nil
}

func (c *Cockroach) SetPaymentInvoiceWithDB(ops *types.UserQueryOpts, paymentIDList []string, DB *gorm.DB) error {
	userUID, err := c.GetUserUID(ops)
	if err != nil {
		return fmt.Errorf("failed to get user uid: %v", err)
	}
	if err := DB.Model(&types.Payment{}).Where(types.Payment{PaymentRaw: types.PaymentRaw{UserUID: userUID}}).Where("id IN ?", paymentIDList).Update("invoiced_at", true).Error; err != nil {
		return fmt.Errorf("failed to save payment: %v", err)
	}
	return nil
}

func (c *Cockroach) CreateInvoiceWithDB(i *types.Invoice, DB *gorm.DB) error {
	if i.ID == "" {
		id, err := gonanoid.New(12)
		if err != nil {
			return fmt.Errorf("failed to generate invoice id: %v", err)
		}
		i.ID = id
	}
	if i.CreatedAt.IsZero() {
		i.CreatedAt = time.Now()
	}
	if err := DB.Create(i).Error; err != nil {
		return fmt.Errorf("failed to save invoice: %v", err)
	}
	return nil
}

// create invoicePayments
func (c *Cockroach) CreateInvoicePaymentsWithDB(invoicePayments []types.InvoicePayment, DB *gorm.DB) error {
	if err := DB.Create(invoicePayments).Error; err != nil {
		return fmt.Errorf("failed to save invoice payments: %v", err)
	}
	return nil
}

// GetInvoiceWithID
func (c *Cockroach) GetInvoiceWithID(invoiceID string) (*types.Invoice, error) {
	var invoice types.Invoice
	if err := c.DB.Where(types.Invoice{ID: invoiceID}).First(&invoice).Error; err != nil {
		return nil, fmt.Errorf("failed to get invoice: %v", err)
	}
	return &invoice, nil
}

func (c *Cockroach) GetInvoice(userID string, req types.LimitReq) ([]types.Invoice, types.LimitResp, error) {
	var invoices []types.Invoice
	var total int64
	var limitResp types.LimitResp

	query := c.DB.Model(&types.Invoice{}).Where("user_id = ?", userID)

	if !req.StartTime.IsZero() {
		query = query.Where("created_at >= ?", req.StartTime)
	}
	if !req.EndTime.IsZero() {
		query = query.Where("created_at <= ?", req.EndTime)
	}

	if req.Page < 1 {
		req.Page = 1
	}
	if req.PageSize < 1 {
		req.PageSize = 10
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, limitResp, fmt.Errorf("failed to get total count: %v", err)
	}

	totalPage := (total + int64(req.PageSize) - 1) / int64(req.PageSize)

	if err := query.Limit(req.PageSize).
		Offset((req.Page - 1) * req.PageSize).
		Find(&invoices).Error; err != nil {
		return nil, limitResp, fmt.Errorf("failed to get invoices: %v", err)
	}

	limitResp = types.LimitResp{
		Total:     total,
		TotalPage: totalPage,
	}

	return invoices, limitResp, nil
}

func (c *Cockroach) GetInvoicePayments(invoiceID string) ([]types.InvoicePayment, error) {
	var invoicePayments []types.InvoicePayment
	query := c.DB.Model(&types.InvoicePayment{}).Where("invoice_id = ?", invoiceID)
	if err := query.Find(&invoicePayments).Error; err != nil {
		return nil, fmt.Errorf("failed to get invoice payments: %v", err)
	}

	return invoicePayments, nil
}

func (c *Cockroach) GetPaymentWithInvoice(invoiceID string) ([]types.Payment, error) {
	invoicePayments, err := c.GetInvoicePayments(invoiceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get invoice payments: %v", err)
	}
	var paymentIDs []string
	for _, invoicePayment := range invoicePayments {
		paymentIDs = append(paymentIDs, invoicePayment.PaymentID)
	}
	var payments []types.Payment
	if err := c.DB.Where("id IN ?", paymentIDs).Find(&payments).Error; err != nil {
		return nil, fmt.Errorf("failed to get payments: %v", err)
	}
	return payments, nil
}

func (c *Cockroach) SetInvoiceStatus(ids []string, stats string) error {
	if err := c.DB.Model(&types.Invoice{}).Where("id IN ?", ids).Update("status", stats).Error; err != nil {
		return fmt.Errorf("failed to update invoice status: %v", err)
	}
	return nil
}

// NewAccount create a new account
func (c *Cockroach) NewAccount(ops *types.UserQueryOpts) (*types.Account, error) {
	if ops.UID == uuid.Nil {
		userUID, err := c.GetUserUID(ops)
		if err != nil {
			return nil, err
		}
		ops.UID = userUID
	}
	account := &types.Account{
		UserUID:                 ops.UID,
		EncryptDeductionBalance: c.ZeroAccount.EncryptDeductionBalance,
		EncryptBalance:          c.ZeroAccount.EncryptBalance,
		Balance:                 c.ZeroAccount.Balance,
		DeductionBalance:        c.ZeroAccount.DeductionBalance,
		CreateRegionID:          c.LocalRegion.UID.String(),
		CreatedAt:               time.Now(),
		UpdatedAt:               time.Now(),
	}

	if err := c.DB.FirstOrCreate(account).Error; err != nil {
		return nil, fmt.Errorf("failed to create account: %w", err)
	}

	return account, nil
}

// NewAccountWithFreeSubscriptionPlan create a new account with free plan
func (c *Cockroach) NewAccountWithFreeSubscriptionPlan(ops *types.UserQueryOpts) (*types.Account, error) {
	if ops.UID == uuid.Nil {
		userUID, err := c.GetUserUID(ops)
		if err != nil {
			return nil, err
		}
		ops.UID = userUID
	}
	now := time.Now().UTC()
	account := &types.Account{
		UserUID:                 ops.UID,
		EncryptDeductionBalance: c.ZeroAccount.EncryptDeductionBalance,
		EncryptBalance:          c.ZeroAccount.EncryptBalance,
		Balance:                 0,
		DeductionBalance:        0,
		CreateRegionID:          c.LocalRegion.UID.String(),
		CreatedAt:               now,
	}
	// 1. create credits
	// 2. create account
	// 3. create subscription
	err := c.DB.Transaction(func(tx *gorm.DB) error {
		result := tx.Where(&types.Account{UserUID: ops.UID}).FirstOrCreate(account)
		if err := result.Error; err != nil {
			return fmt.Errorf("failed to create account: %w", err)
		}
		if result.RowsAffected == 0 {
			return nil
		}
		freePlan, err := c.GetSubscriptionPlan(types.FreeSubscriptionPlanName)
		if err != nil {
			return fmt.Errorf("failed to get free plan: %w", err)
		}
		userInfo := &types.UserInfo{}
		err = c.DB.Model(&types.UserInfo{}).Where(`"userUid" = ?`, ops.UID).Find(userInfo).Error
		if err != nil && err != gorm.ErrRecordNotFound {
			return fmt.Errorf("failed to get user info: %w", err)
		}
		githubDetection := true
		if userInfo.Config != nil {
			if userInfo.Config.Github.CreatedAt != "" {
				createdAt, err := time.Parse(time.RFC3339, userInfo.Config.Github.CreatedAt)
				if err != nil {
					return fmt.Errorf("failed to parse github created at: %w", err)
				}
				if time.Since(createdAt) < 7*24*time.Hour {
					githubDetection = false
				}
			}
		}
		if freePlan.GiftAmount > 0 && githubDetection {
			credits := &types.Credits{
				ID:         uuid.New(),
				UserUID:    ops.UID,
				Amount:     freePlan.GiftAmount,
				UsedAmount: 0,
				FromID:     freePlan.ID.String(),
				FromType:   types.CreditsFromTypeSubscription,
				ExpireAt:   now.AddDate(0, 1, 0),
				CreatedAt:  now,
				StartAt:    now,
				Status:     types.CreditsStatusActive,
			}
			creditsCount := int64(0)
			if err := c.DB.Model(&types.Credits{}).Where(&types.Credits{UserUID: ops.UID, FromID: credits.FromID, FromType: credits.FromType}).Count(&creditsCount).Error; err != nil {
				return fmt.Errorf("failed to create credits: %w", err)
			}
			if creditsCount == 0 {
				if err := tx.Create(credits).Error; err != nil {
					return fmt.Errorf("failed to create credits: %w", err)
				}
			}
		}
		userSubscription := types.Subscription{
			ID:            uuid.New(),
			UserUID:       ops.UID,
			PlanID:        freePlan.ID,
			PlanName:      freePlan.Name,
			Status:        types.SubscriptionStatusNormal,
			StartAt:       now,
			ExpireAt:      now.AddDate(0, 1, 0),
			NextCycleDate: now.AddDate(0, 1, 0),
		}
		subCount := int64(0)
		if err := c.DB.Model(&types.Subscription{}).Where(&types.Subscription{UserUID: ops.UID}).Count(&subCount).Error; err != nil {
			return fmt.Errorf("failed to create subscription: %w", err)
		}
		if subCount == 0 {
			if err := tx.Create(&userSubscription).Error; err != nil {
				return fmt.Errorf("failed to create subscription: %w", err)
			}
		}
		userKYC := &types.UserKYC{
			UserUID:   ops.UID,
			Status:    types.UserKYCStatusPending,
			CreatedAt: now,
			UpdatedAt: now,
			NextAt:    now.AddDate(0, 1, 0),
		}
		if !githubDetection {
			userKYC.Status = types.UserKYCStatusFailed
		}
		err = tx.Model(&types.UserKYC{}).Where(&types.UserKYC{UserUID: ops.UID}).FirstOrCreate(userKYC).Error
		if err != nil {
			return fmt.Errorf("failed to create user kyc: %w", err)
		}
		return nil
	})
	return account, err
}

func (c *Cockroach) GetSubscriptionPlan(planName string) (*types.SubscriptionPlan, error) {
	if planLoad, ok := c.subscriptionPlans.Load(planName); ok {
		return planLoad.(*types.SubscriptionPlan), nil
	}
	var plan types.SubscriptionPlan
	if err := c.DB.Where(types.SubscriptionPlan{Name: planName}).Find(&plan).Error; err != nil {
		return nil, fmt.Errorf("failed to get subscription plan: %v", err)
	}
	c.subscriptionPlans.Store(planName, &plan)
	return &plan, nil
}

const (
	BaseUnit           = 1_000_000
	MinBalance         = 10 * BaseUnit
	DefaultBaseBalance = 5 * BaseUnit
)

var (
	BaseBalance = int64(DefaultBaseBalance)
)

func (c *Cockroach) TransferAccount(from, to *types.UserQueryOpts, amount int64) error {
	return c.transferAccount(from, to, amount, false)
}

func (c *Cockroach) TransferAccountAll(from, to *types.UserQueryOpts) error {
	return c.transferAccount(from, to, 0, true)
}

var ErrInsufficientBalance = errors.New("insufficient balance")

func (c *Cockroach) transferAccount(from, to *types.UserQueryOpts, amount int64, transferAll bool) (err error) {
	if from.UID == uuid.Nil || from.ID == "" {
		userFrom, err := c.GetUser(from)
		if err != nil {
			return fmt.Errorf("failed to get user: %v", err)
		}
		from.UID = userFrom.UID
		from.ID = userFrom.ID
	}
	if to.UID == uuid.Nil || to.ID == "" {
		userTo, err := c.GetUser(to)
		if err != nil {
			return fmt.Errorf("failed to get user: %v", err)
		}
		to.UID = userTo.UID
		to.ID = userTo.ID
	}
	id, err := gonanoid.New(12)
	if err != nil {
		return fmt.Errorf("failed to generate transfer id: %w", err)
	}
	err = c.DB.Transaction(func(tx *gorm.DB) error {
		sender, err := c.GetAccount(&types.UserQueryOpts{UID: from.UID})
		if err != nil {
			return fmt.Errorf("failed to get sender account: %w", err)
		}
		if !transferAll {
			if sender.Balance < sender.DeductionBalance+amount+MinBalance+sender.ActivityBonus {
				return fmt.Errorf("insufficient balance in sender account, sender is %v, transfer amount %d, the transferable amount is: %d", sender, amount, sender.Balance-sender.DeductionBalance-MinBalance-sender.ActivityBonus)
			}
		} else {
			amount = sender.Balance - sender.DeductionBalance - c.ZeroAccount.Balance - sender.ActivityBonus
			if amount <= 0 {
				return ErrInsufficientBalance
			}
		}

		if err = c.updateBalance(tx, &types.UserQueryOpts{UID: from.UID}, -amount, false, true); err != nil {
			return fmt.Errorf("failed to update sender balance: %w", err)
		}
		if err = c.updateBalance(tx, &types.UserQueryOpts{UID: to.UID}, amount, false, true); err != nil {
			return fmt.Errorf("failed to update receiver balance: %w", err)
		}
		if err = c.DB.Create(&types.Transfer{
			ID:          id,
			FromUserUID: from.UID,
			FromUserID:  from.ID,
			ToUserUID:   to.UID,
			ToUserID:    to.ID,
			Amount:      amount,
		}).Error; err != nil {
			return fmt.Errorf("failed to create transfer record: %w", err)
		}
		return nil
	})

	return err
}

func (c *Cockroach) InitTables() error {
	err := CreateTableIfNotExist(c.DB, types.Account{}, types.AccountTransaction{}, types.Payment{}, types.Transfer{}, types.Region{}, types.Invoice{},
		types.InvoicePayment{}, types.Configs{}, types.Credits{}, types.CreditsTransaction{},
		types.CardInfo{}, types.PaymentOrder{},
		types.SubscriptionPlan{}, types.Subscription{}, types.SubscriptionTransaction{},
		types.AccountRegionUserTask{}, types.UserKYC{}, types.RegionConfig{}, types.Debt{}, types.DebtStatusRecord{}, types.DebtResumeDeductionBalanceTransaction{},
		types.UserTimeRangeTraffic{})
	if err != nil {
		return fmt.Errorf("failed to create table: %v", err)
	}

	// TODO: remove this after migration
	if !c.DB.Migrator().HasColumn(&types.Payment{}, `activityType`) {
		fmt.Println("add column activityType")
		tableName := types.Payment{}.TableName()
		err := c.DB.Exec(`ALTER TABLE "?" ADD COLUMN "activityType" TEXT;`, gorm.Expr(tableName)).Error
		if err != nil {
			return fmt.Errorf("failed to add column activityType: %v", err)
		}
	}
	if !c.DB.Migrator().HasColumn(&types.Credits{}, `updated_at`) {
		fmt.Println("add table `Credits` column updated_at")
		tableName := types.Credits{}.TableName()
		err := c.DB.Exec(`ALTER TABLE "?" ADD COLUMN "updated_at" TIMESTAMP(3) WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`, gorm.Expr(tableName)).Error
		if err != nil {
			return fmt.Errorf("failed to add column updated_at: %v", err)
		}
	}
	if !c.DB.Migrator().HasColumn(&types.Account{}, `updated_at`) {
		fmt.Println("add table `Account` column updated_at")
		tableName := types.Account{}.TableName()
		err := c.DB.Exec(`ALTER TABLE "?" ADD COLUMN "updated_at" TIMESTAMP(3) WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`, gorm.Expr(tableName)).Error
		if err != nil {
			return fmt.Errorf("failed to add column updated_at: %v", err)
		}
	}
	if !c.DB.Migrator().HasColumn(&types.AccountTransaction{}, "credit_id_list") {
		sqls := []string{
			`ALTER TABLE "AccountTransaction" ADD COLUMN IF NOT EXISTS "region" uuid;`,
			`ALTER TABLE "AccountTransaction" ADD COLUMN IF NOT EXISTS "deduction_credit" bigint;`,
			`ALTER TABLE "AccountTransaction" ADD COLUMN IF NOT EXISTS "billing_id_list" text[];`,
			`ALTER TABLE "AccountTransaction" ADD COLUMN IF NOT EXISTS "credit_id_list" text[];`,
		}
		for _, sql := range sqls {
			err := c.DB.Exec(sql).Error
			if err != nil {
				return fmt.Errorf("failed to add column credit_id_list: %v", err)
			}
		}
	}
	// alter table "CardInfo"
	//    drop constraint "CardInfo_card_token_key";
	//ALTER TABLE DROP CONSTRAINT, use DROP INDEX CASCADE instead
	if c.DB.Migrator().HasColumn(&types.CardInfo{}, "card_token") {
		// use DROP INDEX CASCADE instead
		//DROP INDEX CASCADE instead
		//sql := `DROP INDEX IF EXISTS "card_token_key" CASCADE;`
		err := c.DB.Exec(`DROP INDEX IF EXISTS "CardInfo_card_token_key" CASCADE`).Error
		if err != nil {
			return fmt.Errorf("failed to drop unique constraint: %v", err)
		}
	}

	if !c.DB.Migrator().HasColumn(&types.Payment{}, "card_uid") {
		sqls := []string{
			`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "card_uid" uuid;`,
			`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "type" text;`,
			`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "charge_source" text;`,
		}
		for _, sql := range sqls {
			err := c.DB.Exec(sql).Error
			if err != nil {
				return fmt.Errorf("failed to add column credit_id_list: %v", err)
			}
		}
	}
	return nil
}

func NewCockRoach(globalURI, localURI string) (*Cockroach, error) {
	dbLogger := logger.New(log.New(os.Stdout, "\r\n", log.LstdFlags), logger.Config{
		SlowThreshold:             200 * time.Millisecond,
		LogLevel:                  logger.Error,
		IgnoreRecordNotFoundError: true,
		Colorful:                  true,
	})
	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  globalURI,
		PreferSimpleProtocol: true,
	}), &gorm.Config{
		Logger:         dbLogger,
		PrepareStmt:    true,
		TranslateError: true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to open global url %s : %v", globalURI, err)
	}
	localdb, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  localURI,
		PreferSimpleProtocol: true,
	}), &gorm.Config{
		Logger:         dbLogger,
		PrepareStmt:    true,
		TranslateError: true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to open local url %s : %v", localURI, err)
	}
	baseBalance, err := crypto.DecryptInt64(os.Getenv(EnvBaseBalance))
	if err == nil {
		BaseBalance = baseBalance
	}
	newEncryptBalance, err := crypto.EncryptInt64(BaseBalance)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt zero value")
	}
	newEncryptDeductionBalance, err := crypto.EncryptInt64(0)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt zero value")
	}
	cockroach := &Cockroach{DB: db, Localdb: localdb, ZeroAccount: &types.Account{EncryptBalance: *newEncryptBalance, EncryptDeductionBalance: *newEncryptDeductionBalance, Balance: baseBalance, DeductionBalance: 0}}
	cockroach.ownerUsrUIDMap = &sync.Map{}
	cockroach.ownerUsrIDMap = &sync.Map{}
	cockroach.subscriptionPlans = &sync.Map{}
	//TODO region with local
	localRegionStr := os.Getenv(EnvLocalRegion)
	if localRegionStr != "" {
		cockroach.LocalRegion = &types.Region{
			UID: uuid.MustParse(localRegionStr),
		}
	} else {
		return nil, fmt.Errorf("empty local region")
	}
	return cockroach, nil
}

func CreateTableIfNotExist(db *gorm.DB, tables ...interface{}) error {
	for i := range tables {
		table := tables[i]
		if !db.Migrator().HasTable(table) {
			if err := db.AutoMigrate(table); err != nil {
				return fmt.Errorf("failed to auto migrate table: %v", err)
			}
		}
	}
	return nil
}

// Close db connection
func (c *Cockroach) Close() error {
	db, err := c.DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get db: %w", err)
	}
	if err := db.Close(); err != nil {
		return fmt.Errorf("failed to close db: %w", err)
	}
	db, err = c.Localdb.DB()
	if err != nil {
		return fmt.Errorf("failed to get localdb: %w", err)
	}
	return db.Close()
}

func (c *Cockroach) GetGlobalDB() *gorm.DB {
	return c.DB
}

func (c *Cockroach) GetLocalDB() *gorm.DB {
	return c.Localdb
}

// RetryableTransaction wraps a GORM transaction and retries on CockroachDB retryable errors (SQLSTATE 40001)
func RetryableTransaction(db *gorm.DB, maxRetries int, fn func(tx *gorm.DB) error) error {
	var err error

	for attempt := 0; attempt <= maxRetries; attempt++ {
		err = db.Transaction(fn)
		if err == nil {
			return nil // success
		}

		if isCockroachRetryableError(err) {
			time.Sleep(backoffDuration(attempt))
			continue // retry
		} else {
			return err // not retryable, exit
		}
	}

	return err // retried max times, still failed
}

func isCockroachRetryableError(err error) bool {
	// Check for SQLSTATE 40001 or known Cockroach error strings
	return strings.Contains(err.Error(), "SQLSTATE 40001") ||
		strings.Contains(err.Error(), "restart transaction")
}

func backoffDuration(retry int) time.Duration {
	base := 50 * time.Millisecond
	max := 1 * time.Second

	wait := base * time.Duration(1<<retry) // exponential backoff
	if wait > max {
		wait = max
	}
	return wait
}

func (c *Cockroach) GetGiftCodeWithCode(code string) (*types.GiftCode, error) {
	var giftCode types.GiftCode
	if err := c.DB.Where(&types.GiftCode{Code: code}).First(&giftCode).Error; err != nil {
		return nil, fmt.Errorf("failed to get gift code: %w", err)
	}
	return &giftCode, nil
}

func (c *Cockroach) UseGiftCode(giftCode *types.GiftCode, userID string) error {
	return c.DB.Transaction(func(tx *gorm.DB) error {
		var lockedGiftCode types.GiftCode
		// Lock the gift code record for update
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE", Options: "NOWAIT"}).
			Where(&types.GiftCode{ID: giftCode.ID}).First(&lockedGiftCode).Error; err != nil {
			return fmt.Errorf("failed to lock gift code: %w", err)
		}

		if lockedGiftCode.Used {
			return fmt.Errorf("gift code has already been used")
		}

		ops := &types.UserQueryOpts{ID: userID}
		// Update the user's balance
		if err := c.updateBalance(tx, ops, giftCode.CreditAmount, false, true); err != nil {
			return fmt.Errorf("failed to update user balance: %w", err)
		}

		message := "created by use gift code"
		// Create an AccountTransaction record
		accountTransaction := &types.AccountTransaction{
			ID:               uuid.New(),
			Type:             "GiftCode",
			UserUID:          ops.UID,
			DeductionBalance: 0,
			Balance:          giftCode.CreditAmount,
			Message:          &message,
			CreatedAt:        time.Now(),
			UpdatedAt:        time.Now(),
			BillingID:        giftCode.ID,
		}
		if err := tx.Create(accountTransaction).Error; err != nil {
			return fmt.Errorf("failed to create account transaction: %w", err)
		}

		// Mark the gift code as used
		giftCode.Used = true
		giftCode.UsedBy = ops.UID
		giftCode.UsedAt = time.Now()
		if err := tx.Save(giftCode).Error; err != nil {
			return fmt.Errorf("failed to update gift code: %w", err)
		}

		return nil
	})
}

func (c *Cockroach) GetUserRealNameInfoByUserID(userID string) (*types.UserRealNameInfo, error) {
	// get user info
	userUID, err := c.getUserUIDByID(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user uid: %v", err)
	}
	// get user realname info
	var userRealNameInfo types.UserRealNameInfo
	if err := c.DB.Where(&types.UserRealNameInfo{UserUID: userUID}).First(&userRealNameInfo).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, gorm.ErrRecordNotFound
		}
		return nil, fmt.Errorf("failed to get user real name info: %w", err)
	}
	return &userRealNameInfo, nil
}

func (c *Cockroach) GetEnterpriseRealNameInfoByUserID(userID string) (*types.EnterpriseRealNameInfo, error) {
	// get user info
	userUID, err := c.getUserUIDByID(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %v", err)
	}

	// get user realname info
	var enterpriseRealNameInfo types.EnterpriseRealNameInfo
	if err := c.DB.Where(&types.EnterpriseRealNameInfo{UserUID: userUID}).First(&enterpriseRealNameInfo).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, gorm.ErrRecordNotFound
		}
		return nil, fmt.Errorf("failed to get enterprise real name info: %w", err)
	}
	return &enterpriseRealNameInfo, nil
}
