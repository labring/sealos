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

package controllers

import (
	"testing"

	"github.com/labring/sealos/controllers/pkg/database"

	"github.com/labring/sealos/controllers/pkg/database/cockroach"
	"github.com/labring/sealos/controllers/pkg/types"
)

var (
	testV2GlobalDBURI = ""
	testV2LocalDBURI  = ""
)

func TestAccountV2_CreateAccount(t *testing.T) {
	account, err := database.NewAccountV2(testV2GlobalDBURI, testV2LocalDBURI)
	if err != nil {
		t.Errorf("failed to new account : %v", err)
	}
	defer func() {
		if err := account.Close(); err != nil {
			t.Errorf("failed close connection: %v", err)
		}
	}()
	aa, err := account.NewAccount(&types.UserQueryOpts{Owner: "eoxwhh80"})
	if err != nil {
		t.Errorf("failed to create account: %v", err)
	}
	t.Logf("success create account: %v", aa)

	aa, err = account.NewAccount(&types.UserQueryOpts{Owner: "1ycieb5b"})
	if err != nil {
		t.Errorf("failed to create account: %v", err)
	}
	t.Logf("success create account: %v", aa)
}

func TestAccountV2_GetAccount(t *testing.T) {
	account, err := database.NewAccountV2(testV2GlobalDBURI, testV2LocalDBURI)
	if err != nil {
		t.Errorf("failed to new account : %v", err)
	}
	defer func() {
		if err := account.Close(); err != nil {
			t.Errorf("failed close connection: %v", err)
		}
	}()
	aa, err := account.GetAccount(&types.UserQueryOpts{Owner: "zzxns1si"})
	if err != nil {
		t.Errorf("failed to get account: %v", err)
	}
	t.Logf("success create account: %+v", aa)

	//aa, err = account.GetAccount(&types.UserQueryOpts{Owner: "1ycieb5b"})
	//if err != nil {
	//	t.Errorf("failed to get account: %v", err)
	//}
	//t.Logf("success create account: %+v", aa)
}

func TestAccountV2_GetUser(t *testing.T) {
	account, err := database.NewAccountV2(testV2GlobalDBURI, testV2LocalDBURI)
	if err != nil {
		t.Errorf("failed to new account : %v", err)
	}
	defer func() {
		if err := account.Close(); err != nil {
			t.Errorf("failed close connection: %v", err)
		}
	}()
	user, err := account.GetUserCr(&types.UserQueryOpts{Owner: "eoxwhh80"})
	if err != nil {
		t.Errorf("failed to get user: %v", err)
	}
	t.Logf("success get user: %v", user)
}

func TestAccountV2_TransferAccount(t *testing.T) {
	account, err := database.NewAccountV2(testV2GlobalDBURI, testV2LocalDBURI)
	if err != nil {
		t.Errorf("failed to new account : %v", err)
	}
	defer func() {
		if err := account.Close(); err != nil {
			t.Errorf("failed close connection: %v", err)
		}
	}()
	err = account.TransferAccount(&types.UserQueryOpts{Owner: "eoxwhh80"}, &types.UserQueryOpts{Owner: "1ycieb5b"}, 85*cockroach.BaseUnit)
	if err != nil {
		t.Errorf("failed to transfer account: %v", err)
	}
	aa, err := account.GetAccount(&types.UserQueryOpts{Owner: "eoxwhh80"})
	if err != nil {
		t.Errorf("failed to get eoxwhh80 account: %v", err)
	}
	t.Logf("success create eoxwhh80 account: %+v", aa)

	aa, err = account.GetAccount(&types.UserQueryOpts{Owner: "1ycieb5b"})
	if err != nil {
		t.Errorf("failed to get 1ycieb5b account: %v", err)
	}
	t.Logf("success create 1ycieb5b account: %+v", aa)
}

func TestAccountV2_AddBalance(t *testing.T) {
	account, err := database.NewAccountV2(testV2GlobalDBURI, testV2LocalDBURI)
	if err != nil {
		t.Fatalf("failed to new account : %v", err)
	}
	defer func() {
		if err := account.Close(); err != nil {
			t.Errorf("failed close connection: %v", err)
		}
	}()
	//err = account.AddBalance(&types.UserQueryOpts{Owner: "zzxns1si"}, 100*cockroach.BaseUnit)
	//if err != nil {
	//	t.Errorf("failed to add balance: %v", err)
	//}
	//err = account.AddDeductionBalance(&types.UserQueryOpts{Owner: "zzxns1si"}, 999*cockroach.BaseUnit)
	//if err != nil {
	//	t.Fatalf("failed to add deduction balance: %v", err)
	//}
	aa, err := account.GetAccount(&types.UserQueryOpts{Owner: "zzxns1si"})
	if err != nil {
		t.Fatalf("failed to get account: %v", err)
	}
	t.Logf("success create DeductionBalance: %+v", aa.DeductionBalance/cockroach.BaseUnit)

	t.Logf("success create Balance: %+v", aa.Balance/cockroach.BaseUnit)
	t.Logf("success create accountbalance: %+v", (aa.Balance-aa.DeductionBalance)/cockroach.BaseUnit)
}
