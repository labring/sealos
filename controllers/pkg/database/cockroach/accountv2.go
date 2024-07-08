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
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"gorm.io/gorm/logger"

	gonanoid "github.com/matoous/go-nanoid/v2"

	"gorm.io/driver/postgres"

	"github.com/labring/sealos/controllers/pkg/crypto"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/labring/sealos/controllers/pkg/types"
)

type Cockroach struct {
	DB          *gorm.DB
	Localdb     *gorm.DB
	LocalRegion *types.Region
	ZeroAccount *types.Account
	activities  types.Activities
	//TODO need init
	defaultRechargeDiscount types.RechargeDiscount
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
			return nil, fmt.Errorf("failed to get user: %v", err)
		}
		queryUser.UID = userCr.UserUID
	}
	var user types.User
	if err := c.DB.Where(queryUser).First(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to get user: %v", err)
	}
	return &user, nil
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
	query := c.DB.Limit(limit).Offset(offset).
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
			userCondition = `"toUserUid" = ? AND "toUserId" = ?`
			args = append(args, ops.UID, ops.ID)
		case types.TypeTransferOut:
			userCondition = `"fromUserUid" = ? AND "fromUserId" = ?`
			args = append(args, ops.UID, ops.ID)
		default:
			userCondition = `("fromUserUid" = ? AND "fromUserId" = ?) OR ("toUserUid" = ? AND "toUserId" = ?)`
			args = append(args, ops.UID, ops.ID, ops.UID, ops.ID)
		}
	}

	query = query.Where(userCondition, args...)
	countQuery = countQuery.Where(userCondition, args...)

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
		return nil, fmt.Errorf("failed to search account from db: %w", err)
	}
	balance, err := crypto.DecryptInt64(account.EncryptBalance)
	if err != nil {
		return nil, fmt.Errorf("failed to descrypt balance: %v", err)
	}
	deductionBalance, err := crypto.DecryptInt64(account.EncryptDeductionBalance)
	if err != nil {
		return nil, fmt.Errorf("failed to descrypt deduction balance: %v", err)
	}
	account.Balance = balance
	account.DeductionBalance = deductionBalance
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
	if ops.UID == uuid.Nil {
		user, err := c.GetUserCr(ops)
		if err != nil {
			return fmt.Errorf("failed to get user: %v", err)
		}
		ops.UID = user.UserUID
	}
	var account types.Account
	//TODO update UserUid = ?
	if err := tx.Where(&types.Account{UserUID: ops.UID}).First(&account).Error; err != nil {
		return fmt.Errorf("failed to get account: %w", err)
	}

	if err := c.updateWithAccount(isDeduction, add, &account, amount); err != nil {
		return err
	}
	if err := tx.Save(&account).Error; err != nil {
		return fmt.Errorf("failed to update account balance: %w", err)
	}
	return nil
}

func (c *Cockroach) updateWithAccount(isDeduction bool, add bool, account *types.Account, amount int64) error {
	var fieldToUpdate string
	if isDeduction {
		fieldToUpdate = account.EncryptDeductionBalance
	} else {
		fieldToUpdate = account.EncryptBalance
	}

	currentBalance, err := crypto.DecryptInt64(fieldToUpdate)
	if err != nil {
		return fmt.Errorf("failed to decrypt balance: %w", err)
	}

	if add {
		currentBalance += amount
	} else {
		currentBalance -= amount
	}

	newEncryptBalance, err := crypto.EncryptInt64(currentBalance)
	if err != nil {
		return fmt.Errorf("failed to encrypt balance: %v", err)
	}
	if isDeduction {
		account.EncryptDeductionBalance = *newEncryptBalance
		account.DeductionBalance = currentBalance
	} else {
		account.EncryptBalance = *newEncryptBalance
		account.Balance = currentBalance
	}

	return nil
}

func (c *Cockroach) AddBalance(ops *types.UserQueryOpts, amount int64) error {
	return c.DB.Transaction(func(tx *gorm.DB) error {
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

func (c *Cockroach) CreateErrorAccountCreate(account *types.Account, owner, errorMsg string) error {
	accountErrSave := &types.ErrorAccountCreate{
		Account:         *account,
		UserCr:          owner,
		ErrorTime:       time.Now().UTC(),
		Message:         errorMsg,
		RegionUserOwner: owner,
		RegionUID:       c.LocalRegion.UID,
	}
	if err := c.DB.FirstOrCreate(accountErrSave, types.ErrorAccountCreate{UserCr: owner}).Error; err != nil {
		return fmt.Errorf("failed to create error account create error msg: %w", err)
	}
	return nil
}

func (c *Cockroach) CreateErrorPaymentCreate(payment types.Payment, errorMsg string) error {
	if err := c.DB.Create(&types.ErrorPaymentCreate{
		PaymentRaw: payment.PaymentRaw, Message: errorMsg, CreateTime: time.Now().UTC()}).Error; err != nil {
		return fmt.Errorf("failed to create error payment create error msg: %w", err)
	}
	return nil
}

// TransferAccountV1 account indicates the CRD value of the original account
func (c *Cockroach) TransferAccountV1(owner string, account *types.Account) (*types.Account, error) {
	//transfer := &types.TransferAccountV1{}
	//// if existed, it indicates that the system has been migrated
	//err := g.DB.Where(&types.TransferAccountV1{RegionUID: g.LocalRegion.UID, RegionUserOwner: owner}).First(transfer).Error
	//if err == nil {
	//	return nil, nil
	//}
	//if !errors.Is(err, gorm.ErrRecordNotFound) {
	//	return nil, fmt.Errorf("failed to get transfer account: %w", err)
	//}

	if _, err := os.Stat(filepath.Join(transferAccountV1, c.LocalRegion.UID.String(), owner)); err == nil {
		return nil, nil
	} else if !os.IsNotExist(err) {
		return nil, fmt.Errorf("failed to get transfer account: %v", err)
	}

	// if not existed, it indicates that the system has not been migrated

	query := &types.UserQueryOpts{Owner: owner, IgnoreEmpty: true}
	accountV2, err := c.GetAccount(query)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if err = c.saveNullUserRecord(types.NullUserRecord{
				CrName:   owner,
				RegionID: c.LocalRegion.UID.String(),
			}); err != nil {
				return nil, fmt.Errorf("failed to save null user record: %v", err)
			}
			//nullUser := &types.NullUserRecord{
			//	CrName:   owner,
			//	RegionID: g.LocalRegion.UID.String(),
			//}
			//if err := g.DB.FirstOrCreate(nullUser, types.NullUserRecord{CrName: owner, RegionID: g.LocalRegion.UID.String()}).Error; err != nil {
			//	return nil, fmt.Errorf("failed to create null user record: %v", err)
			//}
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get account: %v", err)
	}
	transfer := types.TransferAccountV1{
		RegionUID:       c.LocalRegion.UID,
		RegionUserOwner: owner,
	}
	if accountV2 == nil {
		accountV2 = &types.Account{
			UserUID:                 query.UID,
			ActivityBonus:           account.ActivityBonus,
			EncryptDeductionBalance: account.EncryptDeductionBalance,
			EncryptBalance:          account.EncryptBalance,
			Balance:                 account.Balance,
			DeductionBalance:        account.DeductionBalance,
			CreateRegionID:          c.LocalRegion.UID.String(),
			//TODO need init
			CreatedAt: account.CreatedAt,
		}
		if err := c.DB.FirstOrCreate(accountV2).Error; err != nil {
			return nil, fmt.Errorf("failed to create account: %w", err)
		}
	} else {
		if accountV2.CreatedAt.After(account.CreatedAt) {
			accountV2.CreatedAt = account.CreatedAt
		}
		if err := c.updateWithAccount(true, true, accountV2, account.DeductionBalance); err != nil {
			return nil, fmt.Errorf("failed to update account DeductionBalance: %v", err)
		}
		if err := c.updateWithAccount(false, true, accountV2, account.Balance); err != nil {
			return nil, fmt.Errorf("failed to update account Balance: %v", err)
		}
		if err := c.DB.Save(accountV2).Error; err != nil {
			return nil, fmt.Errorf("failed to save account: %v", err)
		}
		transfer.Exist = true
	}

	transfer.Account = *accountV2
	//if err := g.DB.Save(&transfer).Error; err != nil {
	//	return fmt.Errorf("failed to save transfer account: %v", err)
	//}
	if err := c.saveTransferAccountV1(transfer); err != nil {
		return nil, fmt.Errorf("failed to save transfer account: %v", err)
	}
	return accountV2, err
}

var (
	transferV1toV2    = "transferv1tov2"
	transferAccountV1 = filepath.Join(transferV1toV2, "transfer_account_v1")
	transferV1Exist   = filepath.Join(transferV1toV2, "transfer_account_v1_exist")
	nullUserRecord    = filepath.Join(transferV1toV2, "null_user_record")
)

func (c *Cockroach) saveTransferAccountV1(transfer types.TransferAccountV1) error {
	name := transfer.RegionUserOwner
	savePath := filepath.Join(transferAccountV1, transfer.RegionUID.String(), name)
	file, err := os.Create(savePath)
	if err != nil {
		return fmt.Errorf("failed to create file: %v", err)
	}
	defer file.Close()
	if !transfer.Exist {
		return nil
	}
	saveExistPath := filepath.Join(transferV1Exist, transfer.RegionUID.String(), name)
	existFile, err := os.Create(saveExistPath)
	if err != nil {
		return fmt.Errorf("failed to create file: %v", err)
	}
	return existFile.Close()
}

func (c *Cockroach) saveNullUserRecord(nullUser types.NullUserRecord) error {
	savePath := filepath.Join(nullUserRecord, nullUser.RegionID, nullUser.CrName)
	file, err := os.Create(savePath)
	if err != nil {
		if errors.Is(err, os.ErrExist) {
			return nil
		}
		return fmt.Errorf("failed to create file: %v", err)
	}
	return file.Close()
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

func (c *Cockroach) SetPaymentInvoice(ops *types.UserQueryOpts, paymentIDList []string) error {
	userUID, err := c.GetUserUID(ops)
	if err != nil {
		return fmt.Errorf("failed to get user uid: %v", err)
	}
	var payment []types.Payment
	if err := c.DB.Where(types.Payment{PaymentRaw: types.PaymentRaw{UserUID: userUID}}).Where("id IN ?", paymentIDList).Find(&payment).Error; err != nil {
		return fmt.Errorf("failed to get payment: %w", err)
	}
	for i := range payment {
		payment[i].InvoicedAt = true
		if err := c.DB.Save(&payment[i]).Error; err != nil {
			return fmt.Errorf("failed to save payment: %v", err)
		}
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

func (c *Cockroach) GetUserAccountRechargeDiscount(ops *types.UserQueryOpts) (*types.RechargeDiscount, error) {
	userID := ops.UID
	if userID == uuid.Nil {
		user, err := c.GetUserCr(ops)
		if err != nil {
			return nil, fmt.Errorf("failed to get user %v: %v", ops, err)
		}
		userID = user.UserUID
	}
	var userActivities []types.UserActivity
	if !c.DB.Migrator().HasTable("UserActivities") {
		return &c.defaultRechargeDiscount, nil
	}
	if err := c.DB.Table("UserActivities").Where(types.UserActivity{
		UserID: userID,
	}).Find(userActivities).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return &c.defaultRechargeDiscount, nil
		}
		return nil, fmt.Errorf("failed to get user activities: %w", err)
	}
	if len(userActivities) == 0 {
		return &c.defaultRechargeDiscount, nil
	}
	for _, activity := range userActivities {
		currentPhase := activity.CurrentPhase
		var userPhase types.UserPhase
		err := c.DB.Table("UserPhase").Where(types.UserPhase{
			UserActivityID: activity.UserID,
			Name:           currentPhase,
		}).First(&userPhase).Error
		if err != nil {
			return nil, fmt.Errorf("failed to get user %v phase: %v", ops, err)
		}
		for _, phase := range c.activities[activity.Name].Phases {
			if phase.ID == userPhase.ID {
				limitTime, err := time.ParseDuration(phase.RechargeDiscount.LimitDuration)
				if err != nil {
					return nil, fmt.Errorf("failed to get limitTime %s: %v", phase.RechargeDiscount.LimitDuration, err)
				}
				if userPhase.RechargeNums >= phase.RechargeDiscount.LimitTimes || userPhase.EndTime.Add(limitTime).After(time.Now()) {
					return &c.defaultRechargeDiscount, nil
				}
				return &phase.RechargeDiscount.RechargeDiscount, nil
			}
		}
	}
	return &c.defaultRechargeDiscount, nil
}

const (
	BaseUnit           = 1_000_000
	MinBalance         = 10 * BaseUnit
	DefaultBaseBalance = 5 * BaseUnit
)

var (
	BaseBalance        = int64(DefaultBaseBalance)
	EncryptBaseBalance string
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
			amount = sender.Balance - sender.DeductionBalance - c.ZeroAccount.Balance
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
	return CreateTableIfNotExist(c.DB, types.Account{}, types.ErrorAccountCreate{}, types.ErrorPaymentCreate{}, types.Payment{}, types.Transfer{}, types.Region{})
}

func NewCockRoach(globalURI, localURI string) (*Cockroach, error) {
	dbLogger := logger.New(log.New(os.Stdout, "\r\n", log.LstdFlags), logger.Config{
		SlowThreshold:             200 * time.Millisecond,
		LogLevel:                  logger.Error,
		IgnoreRecordNotFoundError: true,
		Colorful:                  true,
	})
	db, err := gorm.Open(postgres.Open(globalURI), &gorm.Config{
		Logger: dbLogger,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to open global url %s : %v", globalURI, err)
	}
	localdb, err := gorm.Open(postgres.Open(localURI), &gorm.Config{
		Logger: dbLogger,
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
