package cockroach

import (
	"os"
	"testing"

	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/types"
	"gorm.io/gorm"
)

func TestAccountV2_CreateAccount(t *testing.T) {
	account, err := NewAccountV2(os.Getenv("DB_URL"))
	if err != nil {
		t.Errorf("failed to new account : %v", err)
	}
	defer func() {
		if err := account.Close(); err != nil {
			t.Errorf("failed close connection: %v", err)
		}
	}()
	aa, err := account.CreateAccount(database.UserQueryOpts{Owner: "eoxwhh80"})
	if err != nil {
		t.Errorf("failed to create account: %v", err)
	}
	t.Logf("success create account: %v", aa)

	aa, err = account.CreateAccount(database.UserQueryOpts{Owner: "1ycieb5b"})
	if err != nil {
		t.Errorf("failed to create account: %v", err)
	}
	t.Logf("success create account: %v", aa)
}

func TestAccountV2_GetAccount(t *testing.T) {
	account, err := NewAccountV2(os.Getenv("DB_URL"))
	if err != nil {
		t.Errorf("failed to new account : %v", err)
	}
	defer func() {
		if err := account.Close(); err != nil {
			t.Errorf("failed close connection: %v", err)
		}
	}()
	aa, err := account.GetAccount(database.UserQueryOpts{Owner: "eoxwhh80"})
	if err != nil {
		t.Errorf("failed to get account: %v", err)
	}
	t.Logf("success create account: %+v", aa)

	aa, err = account.GetAccount(database.UserQueryOpts{Owner: "1ycieb5b"})
	if err != nil {
		t.Errorf("failed to get account: %v", err)
	}
	t.Logf("success create account: %+v", aa)
}

func TestAccountV2_GetUser(t *testing.T) {
	account, err := NewAccountV2(os.Getenv("DB_URL"))
	if err != nil {
		t.Errorf("failed to new account : %v", err)
	}
	defer func() {
		if err := account.Close(); err != nil {
			t.Errorf("failed close connection: %v", err)
		}
	}()
	user, err := account.GetUser(database.UserQueryOpts{Owner: "eoxwhh80"})
	if err != nil {
		t.Errorf("failed to get user: %v", err)
	}
	t.Logf("success get user: %v", user)
}

func TestAccountV2_TransferAccount(t *testing.T) {
	account, err := NewAccountV2(os.Getenv("DB_URL"))
	if err != nil {
		t.Errorf("failed to new account : %v", err)
	}
	defer func() {
		if err := account.Close(); err != nil {
			t.Errorf("failed close connection: %v", err)
		}
	}()
	err = account.TransferAccount(database.UserQueryOpts{Owner: "eoxwhh80"}, database.UserQueryOpts{Owner: "1ycieb5b"}, 85*BaseUnit)
	if err != nil {
		t.Errorf("failed to transfer account: %v", err)
	}
	aa, err := account.GetAccount(database.UserQueryOpts{Owner: "eoxwhh80"})
	if err != nil {
		t.Errorf("failed to get eoxwhh80 account: %v", err)
	}
	t.Logf("success create eoxwhh80 account: %+v", aa)

	aa, err = account.GetAccount(database.UserQueryOpts{Owner: "1ycieb5b"})
	if err != nil {
		t.Errorf("failed to get 1ycieb5b account: %v", err)
	}
	t.Logf("success create 1ycieb5b account: %+v", aa)
}

func TestAccountV2_AddBalance(t *testing.T) {
	account, err := NewAccountV2(os.Getenv("DB_URL"))
	if err != nil {
		t.Errorf("failed to new account : %v", err)
	}
	defer func() {
		if err := account.Close(); err != nil {
			t.Errorf("failed close connection: %v", err)
		}
	}()
	err = account.AddBalance(database.UserQueryOpts{Owner: "eoxwhh80"}, 100*BaseUnit)
	if err != nil {
		t.Errorf("failed to add balance: %v", err)
	}
	//err = account.AddDeductionBalance(database.UserQueryOpts{Owner: "eoxwhh80"}, 99*BaseUnit)
	//if err != nil {
	//	t.Errorf("failed to add deduction balance: %v", err)
	//}
	aa, err := account.GetAccount(database.UserQueryOpts{Owner: "eoxwhh80"})
	if err != nil {
		t.Errorf("failed to get account: %v", err)
	}
	t.Logf("success create account: %+v", aa)
}

func TestAccountV2_AddDeductionBalance(t *testing.T) {
	type fields struct {
		db                      *gorm.DB
		localRegion             *types.Region
		activities              types.Activities
		defaultRechargeDiscount types.RechargeDiscount
	}
	type args struct {
		ops    database.UserQueryOpts
		amount int64
	}
	tests := []struct {
		name    string
		fields  fields
		args    args
		wantErr bool
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			g := &AccountV2{
				db:                      tt.fields.db,
				localRegion:             tt.fields.localRegion,
				activities:              tt.fields.activities,
				defaultRechargeDiscount: tt.fields.defaultRechargeDiscount,
			}
			if err := g.AddDeductionBalance(tt.args.ops, tt.args.amount); (err != nil) != tt.wantErr {
				t.Errorf("AddDeductionBalance() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
