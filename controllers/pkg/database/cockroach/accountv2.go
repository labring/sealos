package cockroach

import (
	"fmt"
	"os"
	"time"

	"github.com/labring/sealos/controllers/pkg/database"

	"github.com/labring/sealos/controllers/pkg/crypto"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type AccountV2 struct {
	db *gorm.DB
	//TODO need init
	localRegion *types.Region
	newAccount  types.Account
	activities  types.Activities
	//TODO need init
	defaultRechargeDiscount types.RechargeDiscount
}

const (
	AccountTable = "Account"
	UserTable    = "user"

	LocalRegion = "LOCAL_REGION"
)

var _ = database.AccountV2(&AccountV2{})

func (g *AccountV2) GetUser(ops database.UserQueryOpts) (*types.RegionUser, error) {
	if err := checkOps(ops); err != nil {
		return nil, err
	}
	query := &types.RegionUser{
		RegionUID: g.localRegion.UID,
		ID:        ops.Owner,
	}
	if ops.UID != uuid.Nil {
		query.UID = ops.UID
	}
	var user types.RegionUser
	if err := g.db.Where(query).First(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}

func checkOps(ops database.UserQueryOpts) error {
	if ops.Owner == "" && ops.UID == uuid.Nil {
		return fmt.Errorf("empty query opts")
	}
	return nil
}

func (g *AccountV2) GetAccount(ops database.UserQueryOpts) (*types.Account, error) {
	if ops.UID == uuid.Nil {
		user, err := g.GetUser(ops)
		if err != nil {
			return nil, fmt.Errorf("failed to get user: %v", err)
		}
		ops.UID = user.UID
	}
	var account types.Account
	if err := g.db.Where(types.Account{UserUID: ops.UID}).First(&account).Error; err != nil {
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

func (g *AccountV2) updateBalance(tx *gorm.DB, ops database.UserQueryOpts, amount int64, isDeduction bool) error {
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

func (g *AccountV2) AddBalance(ops database.UserQueryOpts, amount int64) error {
	return g.db.Transaction(func(tx *gorm.DB) error {
		return g.updateBalance(tx, ops, amount, false)
	})
}

func (g *AccountV2) AddDeductionBalance(ops database.UserQueryOpts, amount int64) error {
	return g.db.Transaction(func(tx *gorm.DB) error {
		return g.updateBalance(tx, ops, amount, true)
	})
}

// CreateAccount 创建账户
func (g *AccountV2) CreateAccount(ops database.UserQueryOpts) (*types.Account, error) {
	if ops.UID == uuid.Nil {
		user, err := g.GetUser(ops)
		if err != nil {
			return nil, fmt.Errorf("failed to get user: %v", err)
		}
		ops.UID = user.UID
	}
	account := &types.Account{
		UserUID:                 ops.UID,
		EncryptDeductionBalance: g.newAccount.EncryptDeductionBalance,
		EncryptBalance:          g.newAccount.EncryptBalance,
		Balance:                 g.newAccount.Balance,
		DeductionBalance:        g.newAccount.DeductionBalance,
		CreatedAt:               time.Now(),
	}

	if err := g.db.FirstOrCreate(account).Error; err != nil {
		return nil, fmt.Errorf("failed to create account: %w", err)
	}

	return account, nil
}

func (g *AccountV2) GetUserAccountRechargeDiscount(ops database.UserQueryOpts) (*types.RechargeDiscount, error) {
	userID := ops.UID
	if userID == uuid.Nil {
		user, err := g.GetUser(ops)
		if err != nil {
			return nil, fmt.Errorf("failed to get user %v: %v", ops, err)
		}
		userID = user.UID
	}
	var userActivities []types.UserActivity
	if err := g.db.Table("UserActivities").Where(types.UserActivity{
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
		err := g.db.Table("UserPhase").Where(types.UserPhase{
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

func (g *AccountV2) TransferAccount(from, to database.UserQueryOpts, amount int64) error {
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
	err := g.db.Transaction(func(tx *gorm.DB) error {
		sender, err := g.GetAccount(database.UserQueryOpts{UID: from.UID})
		if err != nil {
			return fmt.Errorf("failed to get sender account: %w", err)
		}
		if sender.Balance < sender.DeductionBalance+amount+MinBalance+sender.ActivityBonus {
			return fmt.Errorf("insufficient balance in sender account, the transferable amount is: %d", sender.Balance-sender.DeductionBalance-MinBalance-sender.ActivityBonus)
		}

		if err = g.updateBalance(tx, database.UserQueryOpts{UID: from.UID}, -amount, false); err != nil {
			return fmt.Errorf("failed to update sender balance: %w", err)
		}
		if err = g.updateBalance(tx, database.UserQueryOpts{UID: to.UID}, amount, false); err != nil {
			return fmt.Errorf("failed to update receiver balance: %w", err)
		}
		return nil
	})

	return err
}

func NewAccountV2(url string) (database.AccountV2, error) {
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
	return &AccountV2{db: db, newAccount: types.Account{EncryptBalance: *newEncryptBalance, EncryptDeductionBalance: *newEncryptDeductionBalance, Balance: 0, DeductionBalance: 5}, localRegion: localRegion}, nil
}

// Close db connection
func (g *AccountV2) Close() error {
	db, err := g.db.DB()
	if err != nil {
		return fmt.Errorf("failed to get db: %w", err)
	}
	return db.Close()
}
