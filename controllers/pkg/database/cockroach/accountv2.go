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
	"fmt"
	"os"
	"time"

	"gorm.io/driver/postgres"

	"github.com/labring/sealos/controllers/pkg/crypto"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/labring/sealos/controllers/pkg/types"
)

type Cockroach struct {
	DB          *gorm.DB
	LocalRegion *types.Region
	ZeroAccount types.Account
	activities  types.Activities
	//TODO need init
	defaultRechargeDiscount types.RechargeDiscount
}

const (
	LocalRegion = "LOCAL_REGION"
)

func (g *Cockroach) GetUser(ops types.UserQueryOpts) (*types.RegionUser, error) {
	if err := checkOps(ops); err != nil {
		return nil, err
	}
	query := &types.RegionUser{
		RegionUID: g.LocalRegion.UID,
		ID:        ops.Owner,
	}
	if ops.UID != uuid.Nil {
		query.UID = ops.UID
	}
	var user types.RegionUser
	if err := g.DB.Where(query).First(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}

func checkOps(ops types.UserQueryOpts) error {
	if ops.Owner == "" && ops.UID == uuid.Nil {
		return fmt.Errorf("empty query opts")
	}
	return nil
}

func (g *Cockroach) GetAccount(ops types.UserQueryOpts) (*types.Account, error) {
	if ops.UID == uuid.Nil {
		user, err := g.GetUser(ops)
		if err != nil {
			return nil, fmt.Errorf("failed to get user: %v", err)
		}
		ops.UID = user.UID
	}
	var account types.Account
	if err := g.DB.Where(types.Account{UserUID: ops.UID}).First(&account).Error; err != nil {
		return nil, fmt.Errorf("failed to get account: %w", err)
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

func (g *Cockroach) updateBalance(tx *gorm.DB, ops types.UserQueryOpts, amount int64, isDeduction bool) error {
	if ops.UID == uuid.Nil {
		user, err := g.GetUser(ops)
		if err != nil {
			return fmt.Errorf("failed to get user: %v", err)
		}
		ops.UID = user.UID
	}
	var account types.Account
	//TODO update UserUid = ?
	if err := tx.Where(&types.Account{UserUID: ops.UID}).First(&account).Error; err != nil {
		return fmt.Errorf("failed to get account: %w", err)
	}

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

	currentBalance += amount

	newEncryptBalance, err := crypto.EncryptInt64(currentBalance)
	if err != nil {
		return fmt.Errorf("failed to encrypt balance: %v", err)
	}
	if isDeduction {
		account.EncryptDeductionBalance = *newEncryptBalance
	} else {
		account.EncryptBalance = *newEncryptBalance
	}

	if err := tx.Save(&account).Error; err != nil {
		return fmt.Errorf("failed to update account balance: %w", err)
	}
	return nil
}

func (g *Cockroach) AddBalance(ops types.UserQueryOpts, amount int64) error {
	return g.DB.Transaction(func(tx *gorm.DB) error {
		return g.updateBalance(tx, ops, amount, false)
	})
}

func (g *Cockroach) AddDeductionBalance(ops types.UserQueryOpts, amount int64) error {
	return g.DB.Transaction(func(tx *gorm.DB) error {
		return g.updateBalance(tx, ops, amount, true)
	})
}

func (g *Cockroach) CreateAccount(ops types.UserQueryOpts, account *types.Account) (*types.Account, error) {
	if ops.UID == uuid.Nil {
		user, err := g.GetUser(ops)
		if err != nil {
			return nil, fmt.Errorf("failed to get user: %v", err)
		}
		ops.UID = user.UID
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

// NewAccount create a new account
func (g *Cockroach) NewAccount(ops types.UserQueryOpts) (*types.Account, error) {
	if ops.UID == uuid.Nil {
		user, err := g.GetUser(ops)
		if err != nil {
			return nil, fmt.Errorf("failed to get user: %v", err)
		}
		ops.UID = user.UID
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

func (g *Cockroach) GetUserAccountRechargeDiscount(ops types.UserQueryOpts) (*types.RechargeDiscount, error) {
	userID := ops.UID
	if userID == uuid.Nil {
		user, err := g.GetUser(ops)
		if err != nil {
			return nil, fmt.Errorf("failed to get user %v: %v", ops, err)
		}
		userID = user.UID
	}
	var userActivities []types.UserActivity
	if err := g.DB.Table("UserActivities").Where(types.UserActivity{
		UserID: userID,
	}).Find(userActivities).Error; err != nil {
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
			return nil, fmt.Errorf("failed to get user %s phase: %v", ops, err)
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
	BaseUnit   = 1_000_000
	MinBalance = 10 * BaseUnit
)

func (g *Cockroach) TransferAccount(from, to types.UserQueryOpts, amount int64) error {
	if from.UID == uuid.Nil {
		fromUser, err := g.GetUser(from)
		if err != nil {
			return fmt.Errorf("failed to get user: %v", err)
		}
		from.UID = fromUser.UID
	}
	if to.UID == uuid.Nil {
		toUser, err := g.GetUser(to)
		if err != nil {
			return fmt.Errorf("failed to get user: %v", err)
		}
		to.UID = toUser.UID
	}
	err := g.DB.Transaction(func(tx *gorm.DB) error {
		sender, err := g.GetAccount(types.UserQueryOpts{UID: from.UID})
		if err != nil {
			return fmt.Errorf("failed to get sender account: %w", err)
		}
		if sender.Balance < sender.DeductionBalance+amount+MinBalance+sender.ActivityBonus {
			return fmt.Errorf("insufficient balance in sender account, the transferable amount is: %d", sender.Balance-sender.DeductionBalance-MinBalance-sender.ActivityBonus)
		}

		if err = g.updateBalance(tx, types.UserQueryOpts{UID: from.UID}, -amount, false); err != nil {
			return fmt.Errorf("failed to update sender balance: %w", err)
		}
		if err = g.updateBalance(tx, types.UserQueryOpts{UID: to.UID}, amount, false); err != nil {
			return fmt.Errorf("failed to update receiver balance: %w", err)
		}
		return nil
	})

	return err
}

func NewCockRoach(url string) (*Cockroach, error) {
	db, err := gorm.Open(postgres.Open(url), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to open url %s : %v", url, err)
	}
	newEncryptBalance, err := crypto.EncryptInt64(5 * BaseUnit)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt zero value")
	}
	newEncryptDeductionBalance, err := crypto.EncryptInt64(0)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt zero value")
	}
	if !db.Migrator().HasTable(types.Account{}) {
		if err := db.AutoMigrate(types.Account{}); err != nil {
			return nil, fmt.Errorf("failed to auto migrate account: %v", err)
		}
	}
	//TODO region with local
	localRegionStr := os.Getenv(LocalRegion)
	if localRegionStr == "" {
		return nil, fmt.Errorf("empty local region, please check env: LOCAL_REGION")
	}
	localRegion := &types.Region{
		UID: uuid.MustParse(localRegionStr),
	}
	return &Cockroach{DB: db, ZeroAccount: types.Account{EncryptBalance: *newEncryptBalance, EncryptDeductionBalance: *newEncryptDeductionBalance, Balance: 0, DeductionBalance: 5}, LocalRegion: localRegion}, nil
}

// Close db connection
func (g *Cockroach) Close() error {
	db, err := g.DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get db: %w", err)
	}
	return db.Close()
}
