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
	"os"
	"time"

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

func (g *Cockroach) GetUser(ops *types.UserQueryOpts) (*types.RegionUserCr, error) {
	if err := checkOps(ops); err != nil {
		return nil, err
	}
	query := &types.RegionUserCr{
		CrName: ops.Owner,
	}
	if ops.UID != uuid.Nil {
		query.UserUID = ops.UID
	}
	var user types.RegionUserCr
	if err := g.Localdb.Where(query).First(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}

func checkOps(ops *types.UserQueryOpts) error {
	if ops.Owner == "" && ops.UID == uuid.Nil {
		return fmt.Errorf("empty query opts")
	}
	return nil
}

func (g *Cockroach) GetAccount(ops *types.UserQueryOpts) (*types.Account, error) {
	return g.getAccount(ops)
}

func (g *Cockroach) getAccount(ops *types.UserQueryOpts) (*types.Account, error) {
	if ops.UID == uuid.Nil {
		user, err := g.GetUser(ops)
		if err != nil {
			return nil, fmt.Errorf("failed to get user: %v", err)
		}
		ops.UID = user.UserUID
	}
	var account types.Account
	if err := g.DB.Where(types.Account{UserUID: ops.UID}).First(&account).Error; err != nil {
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

func (g *Cockroach) updateBalance(tx *gorm.DB, ops *types.UserQueryOpts, amount int64, isDeduction, add bool) error {
	if ops.UID == uuid.Nil {
		user, err := g.GetUser(ops)
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

	if err := g.updateWithAccount(isDeduction, add, &account, amount); err != nil {
		return err
	}
	if err := tx.Save(&account).Error; err != nil {
		return fmt.Errorf("failed to update account balance: %w", err)
	}
	return nil
}

func (g *Cockroach) updateWithAccount(isDeduction bool, add bool, account *types.Account, amount int64) error {
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

func (g *Cockroach) AddBalance(ops *types.UserQueryOpts, amount int64) error {
	return g.DB.Transaction(func(tx *gorm.DB) error {
		return g.updateBalance(tx, ops, amount, false, true)
	})
}

func (g *Cockroach) ReduceBalance(ops *types.UserQueryOpts, amount int64) error {
	return g.DB.Transaction(func(tx *gorm.DB) error {
		return g.updateBalance(tx, ops, amount, false, false)
	})
}

func (g *Cockroach) ReduceDeductionBalance(ops *types.UserQueryOpts, amount int64) error {
	return g.DB.Transaction(func(tx *gorm.DB) error {
		return g.updateBalance(tx, ops, amount, false, false)
	})
}

func (g *Cockroach) AddDeductionBalance(ops *types.UserQueryOpts, amount int64) error {
	return g.DB.Transaction(func(tx *gorm.DB) error {
		return g.updateBalance(tx, ops, amount, true, true)
	})
}

func (g *Cockroach) CreateAccount(ops *types.UserQueryOpts, account *types.Account) (*types.Account, error) {
	if ops.UID == uuid.Nil {
		user, err := g.GetUser(ops)
		if err != nil {
			return nil, fmt.Errorf("failed to get user: %v", err)
		}
		ops.UID = user.UserUID
	}
	account.UserUID = ops.UID
	if account.EncryptBalance == "" || account.EncryptDeductionBalance == "" {
		return nil, fmt.Errorf("empty encrypt balance")
	}

	if err := g.DB.FirstOrCreate(account).Error; err != nil {
		return nil, fmt.Errorf("failed to create account: %w", err)
	}

	return account, nil
}

func (g *Cockroach) CreateErrorAccountCreate(account *types.Account, owner, errorMsg string) error {
	if err := g.DB.Create(&types.ErrorAccountCreate{
		Account:         *account,
		Message:         errorMsg,
		RegionUserOwner: owner,
		RegionUID:       g.LocalRegion.UID,
	}).Error; err != nil {
		return fmt.Errorf("failed to create error account create error msg: %w", err)
	}
	return nil
}

func (g *Cockroach) CreateErrorPaymentCreate(payment types.Payment, errorMsg string) error {
	if err := g.DB.Create(&types.ErrorPaymentCreate{
		PaymentRaw: payment.PaymentRaw, Message: errorMsg, CreateTime: time.Now().UTC()}).Error; err != nil {
		return fmt.Errorf("failed to create error payment create error msg: %w", err)
	}
	return nil
}

// TransferAccountV1 account indicates the CRD value of the original account
func (g *Cockroach) TransferAccountV1(owner string, account *types.Account) (*types.Account, error) {
	transfer := &types.TransferAccountV1{}
	// if existed, it indicates that the system has been migrated
	err := g.DB.Where(&types.TransferAccountV1{RegionUID: g.LocalRegion.UID, RegionUserOwner: owner}).First(transfer).Error
	if err == nil {
		return nil, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to get transfer account: %w", err)
	}
	// if not existed, it indicates that the system has not been migrated

	query := &types.UserQueryOpts{Owner: owner, IgnoreEmpty: true}
	accountV2, err := g.GetAccount(query)
	if err != nil {
		return nil, fmt.Errorf("failed to get account: %v", err)
	}
	err = g.DB.Transaction(func(tx *gorm.DB) error {
		if accountV2 == nil {
			accountV2 = &types.Account{
				UserUID:                 query.UID,
				ActivityBonus:           account.ActivityBonus,
				EncryptDeductionBalance: account.EncryptDeductionBalance,
				EncryptBalance:          account.EncryptBalance,
				Balance:                 account.Balance,
				DeductionBalance:        account.DeductionBalance,
				//TODO need init
				CreatedAt: account.CreatedAt,
			}
			if err := g.DB.FirstOrCreate(accountV2).Error; err != nil {
				return fmt.Errorf("failed to create account: %w", err)
			}
		} else {
			if accountV2.CreatedAt.After(account.CreatedAt) {
				accountV2.CreatedAt = account.CreatedAt
			}
			if err := g.updateWithAccount(true, true, accountV2, account.DeductionBalance); err != nil {
				return fmt.Errorf("failed to update account DeductionBalance: %v", err)
			}
			if err := g.updateWithAccount(false, true, accountV2, account.Balance); err != nil {
				return fmt.Errorf("failed to update account Balance: %v", err)
			}
			if err := g.DB.Save(accountV2).Error; err != nil {
				return fmt.Errorf("failed to save account: %v", err)
			}
		}
		if err := g.DB.Save(&types.TransferAccountV1{
			RegionUID:       g.LocalRegion.UID,
			RegionUserOwner: owner,
			Account:         *accountV2,
		}).Error; err != nil {
			return fmt.Errorf("failed to save transfer account: %v", err)
		}
		return nil
	})
	return accountV2, err
}

func (g *Cockroach) Payment(payment *types.Payment) error {
	return g.payment(payment, true)
}

func (g *Cockroach) SavePayment(payment *types.Payment) error {
	return g.payment(payment, false)
}

func (g *Cockroach) payment(payment *types.Payment, updateBalance bool) error {
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
		payment.RegionUID = g.LocalRegion.UID
	}
	if payment.UserUID == uuid.Nil {
		if payment.RegionUserOwner == "" {
			return fmt.Errorf("empty payment owner and user")
		}
		user, err := g.GetUser(&types.UserQueryOpts{Owner: payment.RegionUserOwner})
		if err != nil {
			return fmt.Errorf("failed to get user: %v", err)
		}
		payment.UserUID = user.UserUID
	}

	return g.DB.Transaction(func(tx *gorm.DB) error {
		if err := g.DB.First(&types.Payment{ID: payment.ID}).Error; err == nil {
			return nil
		}
		if err := g.DB.Create(payment).Error; err != nil {
			return fmt.Errorf("failed to save payment: %w", err)
		}
		if updateBalance {
			if err := g.AddBalance(&types.UserQueryOpts{UID: payment.UserUID}, payment.Amount+payment.Gift); err != nil {
				return fmt.Errorf("failed to add balance: %w", err)
			}
		}
		return nil
	})
}

// NewAccount create a new account
func (g *Cockroach) NewAccount(ops *types.UserQueryOpts) (*types.Account, error) {
	if ops.UID == uuid.Nil {
		user, err := g.GetUser(ops)
		if err != nil {
			return nil, fmt.Errorf("failed to get user: %v", err)
		}
		ops.UID = user.UserUID
	}
	account := &types.Account{
		UserUID:                 ops.UID,
		EncryptDeductionBalance: g.ZeroAccount.EncryptDeductionBalance,
		EncryptBalance:          g.ZeroAccount.EncryptBalance,
		Balance:                 g.ZeroAccount.Balance,
		DeductionBalance:        g.ZeroAccount.DeductionBalance,
		CreatedAt:               time.Now(),
	}

	if err := g.DB.FirstOrCreate(account).Error; err != nil {
		return nil, fmt.Errorf("failed to create account: %w", err)
	}

	return account, nil
}

func (g *Cockroach) GetUserAccountRechargeDiscount(ops *types.UserQueryOpts) (*types.RechargeDiscount, error) {
	userID := ops.UID
	if userID == uuid.Nil {
		user, err := g.GetUser(ops)
		if err != nil {
			return nil, fmt.Errorf("failed to get user %v: %v", ops, err)
		}
		userID = user.UserUID
	}
	var userActivities []types.UserActivity
	if !g.DB.Migrator().HasTable("UserActivities") {
		return &g.defaultRechargeDiscount, nil
	}
	if err := g.DB.Table("UserActivities").Where(types.UserActivity{
		UserID: userID,
	}).Find(userActivities).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return &g.defaultRechargeDiscount, nil
		}
		return nil, fmt.Errorf("failed to get user activities: %w", err)
	}
	if len(userActivities) == 0 {
		return &g.defaultRechargeDiscount, nil
	}
	for _, activity := range userActivities {
		currentPhase := activity.CurrentPhase
		var userPhase types.UserPhase
		err := g.DB.Table("UserPhase").Where(types.UserPhase{
			UserActivityID: activity.UserID,
			Name:           currentPhase,
		}).First(&userPhase).Error
		if err != nil {
			return nil, fmt.Errorf("failed to get user %v phase: %v", ops, err)
		}
		for _, phase := range g.activities[activity.Name].Phases {
			if phase.ID == userPhase.ID {
				limitTime, err := time.ParseDuration(phase.RechargeDiscount.LimitDuration)
				if err != nil {
					return nil, fmt.Errorf("failed to get limitTime %s: %v", phase.RechargeDiscount.LimitDuration, err)
				}
				if userPhase.RechargeNums >= phase.RechargeDiscount.LimitTimes || userPhase.EndTime.Add(limitTime).After(time.Now()) {
					return &g.defaultRechargeDiscount, nil
				}
				return &phase.RechargeDiscount.RechargeDiscount, nil
			}
		}
	}
	return &g.defaultRechargeDiscount, nil
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

func (g *Cockroach) TransferAccount(from, to *types.UserQueryOpts, amount int64) error {
	if from.UID == uuid.Nil {
		fromUser, err := g.GetUser(from)
		if err != nil {
			return fmt.Errorf("failed to get user: %v", err)
		}
		from.UID = fromUser.UserUID
	}
	if to.UID == uuid.Nil {
		toUser, err := g.GetUser(to)
		if err != nil {
			return fmt.Errorf("failed to get user: %v", err)
		}
		to.UID = toUser.UserUID
	}
	err := g.DB.Transaction(func(tx *gorm.DB) error {
		sender, err := g.GetAccount(&types.UserQueryOpts{UID: from.UID})
		if err != nil {
			return fmt.Errorf("failed to get sender account: %w", err)
		}
		if sender.Balance < sender.DeductionBalance+amount+MinBalance+sender.ActivityBonus {
			return fmt.Errorf("insufficient balance in sender account, the transferable amount is: %d", sender.Balance-sender.DeductionBalance-MinBalance-sender.ActivityBonus)
		}

		if err = g.updateBalance(tx, &types.UserQueryOpts{UID: from.UID}, -amount, false, true); err != nil {
			return fmt.Errorf("failed to update sender balance: %w", err)
		}
		if err = g.updateBalance(tx, &types.UserQueryOpts{UID: to.UID}, amount, false, true); err != nil {
			return fmt.Errorf("failed to update receiver balance: %w", err)
		}
		return nil
	})

	return err
}

type Config struct {
	URI         string
	BaseBalance int64
	LocalRegion *types.Region
}

func NewCockRoach(globalURI, localURI string) (*Cockroach, error) {
	db, err := gorm.Open(postgres.Open(globalURI), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to open url %s : %v", globalURI, err)
	}
	localdb, err := gorm.Open(postgres.Open(localURI), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to open url %s : %v", localURI, err)
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
	if err := CreateTableIfNotExist(db, types.Account{}, types.TransferAccountV1{}, types.ErrorAccountCreate{}, types.ErrorPaymentCreate{}, types.Payment{}); err != nil {
		return nil, err
	}
	cockroach := &Cockroach{DB: db, Localdb: localdb, ZeroAccount: &types.Account{EncryptBalance: *newEncryptBalance, EncryptDeductionBalance: *newEncryptDeductionBalance, Balance: baseBalance, DeductionBalance: 0}}
	//TODO region with local
	localRegionStr := os.Getenv(EnvLocalRegion)
	if localRegionStr != "" {
		cockroach.LocalRegion = &types.Region{
			UID: uuid.MustParse(localRegionStr),
		}
	} else {
		fmt.Printf("empty local region \n")
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
func (g *Cockroach) Close() error {
	db, err := g.DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get db: %w", err)
	}
	if err := db.Close(); err != nil {
		return fmt.Errorf("failed to close db: %w", err)
	}
	db, err = g.Localdb.DB()
	if err != nil {
		return fmt.Errorf("failed to get localdb: %w", err)
	}
	return db.Close()
}
