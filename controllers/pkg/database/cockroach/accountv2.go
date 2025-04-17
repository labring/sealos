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
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"time"

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
	DB            *gorm.DB
	Localdb       *gorm.DB
	LocalRegion   *types.Region
	ZeroAccount   *types.Account
	accountConfig *types.AccountConfig
	tasks         map[uuid.UUID]types.Task
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
		userCr, err := c.GetUserCr(ops)
		if err != nil {
			return nil, fmt.Errorf("failed to get user cr: %v", err)
		}
		queryUser.UID = userCr.UserUID
	}
	var user types.User
	if err := c.DB.Where(queryUser).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func cloneMap(m map[int64]float64) map[int64]float64 {
	newMap := make(map[int64]float64, len(m))
	for k, v := range m {
		newMap[k] = v
	}
	return newMap
}

func (c *Cockroach) GetUserRechargeDiscount(ops *types.UserQueryOpts) (types.UserRechargeDiscount, error) {
	if ops.UID == uuid.Nil {
		user, err := c.GetUser(ops)
		if err != nil {
			return types.UserRechargeDiscount{}, fmt.Errorf("failed to get user cr: %v", err)
		}
		ops.UID = user.UID
	}
	cfg, err := c.GetAccountConfig()
	if err != nil {
		return types.UserRechargeDiscount{}, fmt.Errorf("failed to get account config: %v", err)
	}
	isFirstRecharge, err := c.IsNullRecharge(ops)
	if err != nil {
		return types.UserRechargeDiscount{}, fmt.Errorf("failed to check is null recharge: %v", err)
	}
	defaultSteps, firstRechargeSteps := cfg.DefaultDiscountSteps, cloneMap(cfg.FirstRechargeDiscountSteps)
	if !isFirstRecharge && firstRechargeSteps != nil {
		payments, err := c.getFirstRechargePayments(ops)
		if err != nil {
			return types.UserRechargeDiscount{}, fmt.Errorf("failed to get first recharge payments: %v", err)
		}
		if len(payments) == 0 {
			firstRechargeSteps = map[int64]float64{}
		} else {
			for i := range payments {
				delete(firstRechargeSteps, payments[i].Amount/BaseUnit)
			}
		}
	}
	return types.UserRechargeDiscount{
		DefaultSteps:       defaultSteps,
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
		user, err := c.GetUser(ops)
		if err != nil {
			return false, fmt.Errorf("failed to get user: %v", err)
		}
		ops.UID = user.UID
	}
	var count int64
	if err := c.DB.Model(&types.Payment{}).Where(&types.Payment{PaymentRaw: types.PaymentRaw{UserUID: ops.UID}}).
		Count(&count).Error; err != nil {
		return false, fmt.Errorf("failed to get payment count: %v", err)
	}
	return count == 0, nil
}

func (c *Cockroach) getFirstRechargePayments(ops *types.UserQueryOpts) ([]types.Payment, error) {
	if ops.UID == uuid.Nil {
		user, err := c.GetUser(ops)
		if err != nil {
			return nil, fmt.Errorf("failed to get user: %v", err)
		}
		ops.UID = user.UID
	}
	var payments []types.Payment
	if err := c.DB.Model(&types.Payment{}).Where(&types.Payment{PaymentRaw: types.PaymentRaw{UserUID: ops.UID}}).Where(`"activityType" = ?`, types.ActivityTypeFirstRecharge).
		Find(&payments).Error; err != nil {
		return nil, fmt.Errorf("failed to get payment count: %v", err)
	}
	return payments, nil
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
		user, err := c.GetUser(ops)
		if err != nil {
			return nil, fmt.Errorf("failed to get user: %v", err)
		}
		ops.UID = user.UID
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

func (c *Cockroach) GetUserUID(ops *types.UserQueryOpts) (uuid.UUID, error) {
	if ops.UID != uuid.Nil {
		return ops.UID, nil
	}
	if ops.ID != "" {
		var user types.User
		if err := c.DB.Where(&types.User{ID: ops.ID}).First(&user).Error; err != nil {
			return uuid.Nil, fmt.Errorf("failed to get user: %v", err)
		}
		return user.UID, nil
	}
	userCr, err := c.GetUserCr(ops)
	if err != nil {
		return uuid.Nil, err
	}
	return userCr.UserUID, nil
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
	if ops.UID == uuid.Nil {
		user, err := c.GetUserCr(ops)
		if err != nil {
			return nil, err
		}
		ops.UID = user.UserUID
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
		user, err := c.GetUserCr(ops)
		if err != nil {
			return nil, fmt.Errorf("failed to get user: %v", err)
		}
		ops.UID = user.UserUID
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

func (c *Cockroach) updateBalance(tx *gorm.DB, ops *types.UserQueryOpts, amount int64, isDeduction, add bool) error {
	return c.updateBalanceRaw(tx, ops, amount, isDeduction, add, false)
}

func (c *Cockroach) updateBalanceRaw(tx *gorm.DB, ops *types.UserQueryOpts, amount int64, isDeduction, add bool, isActive bool) error {
	if ops.UID == uuid.Nil {
		user, err := c.GetUserCr(ops)
		if err != nil {
			return fmt.Errorf("failed to get user: %v", err)
		}
		ops.UID = user.UserUID
	}
	return c.updateWithAccount(ops.UID, isDeduction, add, isActive, amount, tx)
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
		user, err := c.GetUserCr(ops)
		if err != nil {
			return nil, fmt.Errorf("failed to get user: %v", err)
		}
		ops.UID = user.UserUID
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

func (c *Cockroach) Payment(payment *types.Payment) error {
	return c.payment(payment, true)
}

func (c *Cockroach) SavePayment(payment *types.Payment) error {
	return c.payment(payment, false)
}

func (c *Cockroach) payment(payment *types.Payment, updateBalance bool) error {
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
		user, err := c.GetUserCr(&types.UserQueryOpts{Owner: payment.RegionUserOwner})
		if err != nil {
			return fmt.Errorf("failed to get user: %v", err)
		}
		payment.UserUID = user.UserUID
	}

	return c.DB.Transaction(func(tx *gorm.DB) error {
		if err := c.DB.First(&types.Payment{ID: payment.ID}).Error; err == nil {
			return nil
		}
		if err := c.DB.Create(payment).Error; err != nil {
			return fmt.Errorf("failed to save payment: %w", err)
		}
		if updateBalance {
			if err := c.AddBalance(&types.UserQueryOpts{UID: payment.UserUID}, payment.Amount+payment.Gift); err != nil {
				return fmt.Errorf("failed to add balance: %w", err)
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

func (c *Cockroach) GetUnInvoicedPaymentListWithIds(ids []string) ([]types.Payment, error) {
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
		user, err := c.GetUserCr(ops)
		if err != nil {
			return nil, err
		}
		ops.UID = user.UserUID
	}
	account := &types.Account{
		UserUID:                 ops.UID,
		EncryptDeductionBalance: c.ZeroAccount.EncryptDeductionBalance,
		EncryptBalance:          c.ZeroAccount.EncryptBalance,
		Balance:                 c.ZeroAccount.Balance,
		DeductionBalance:        c.ZeroAccount.DeductionBalance,
		CreateRegionID:          c.LocalRegion.UID.String(),
		CreatedAt:               time.Now(),
	}

	if err := c.DB.FirstOrCreate(account).Error; err != nil {
		return nil, fmt.Errorf("failed to create account: %w", err)
	}

	return account, nil
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
	err := CreateTableIfNotExist(c.DB, types.Account{}, types.Payment{}, types.Transfer{}, types.Region{}, types.Invoice{}, types.InvoicePayment{}, types.Configs{})
	if err != nil {
		return fmt.Errorf("failed to create table: %v", err)
	}

	// TODO: remove this after migration
	if !c.DB.Migrator().HasColumn(&types.Payment{}, `activityType`) {
		//if err := c.DB.Migrator().AddColumn(&types.Payment{PaymentRaw: types.PaymentRaw{}}, `PaymentRaw."activityType"`); err != nil {
		//	return fmt.Errorf("failed to add column activityType: %v", err)
		//}
		fmt.Println("add column activityType")
		tableName := types.Payment{}.TableName()
		err := c.DB.Exec(`ALTER TABLE "?" ADD COLUMN "activityType" TEXT;`, gorm.Expr(tableName)).Error
		if err != nil {
			return fmt.Errorf("failed to add column activityType: %v", err)
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
	ops := &types.UserQueryOpts{ID: userID}
	user, err := c.GetUserCr(ops)

	if err != nil {
		return nil, fmt.Errorf("failed to get user: %v", err)
	}

	// get user realname info
	var userRealNameInfo types.UserRealNameInfo
	if err := c.DB.Where(&types.UserRealNameInfo{UserUID: user.UserUID}).First(&userRealNameInfo).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, gorm.ErrRecordNotFound
		}
		return nil, fmt.Errorf("failed to get user real name info: %w", err)
	}
	return &userRealNameInfo, nil
}

func (c *Cockroach) GetEnterpriseRealNameInfoByUserID(userID string) (*types.EnterpriseRealNameInfo, error) {
	// get user info
	ops := &types.UserQueryOpts{ID: userID}
	user, err := c.GetUserCr(ops)

	if err != nil {
		return nil, fmt.Errorf("failed to get user: %v", err)
	}

	// get user realname info
	var enterpriseRealNameInfo types.EnterpriseRealNameInfo
	if err := c.DB.Where(&types.EnterpriseRealNameInfo{UserUID: user.UserUID}).First(&enterpriseRealNameInfo).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, gorm.ErrRecordNotFound
		}
		return nil, fmt.Errorf("failed to get enterprise real name info: %w", err)
	}
	return &enterpriseRealNameInfo, nil
}
