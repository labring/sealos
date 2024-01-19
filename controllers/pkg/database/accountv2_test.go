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

package database

import (
	"context"
	"encoding/json"
	"os"
	"testing"

	"github.com/labring/sealos/controllers/pkg/utils/logger"

	"github.com/labring/sealos/controllers/pkg/database/cockroach"

	"golang.org/x/sync/errgroup"

	v1 "k8s.io/api/core/v1"

	"sigs.k8s.io/controller-runtime/pkg/client"

	"k8s.io/client-go/tools/clientcmd"

	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"

	"github.com/labring/sealos/controllers/pkg/types"
)

var (
	testConfig = ""
	testDBURI  = ""
)

func init() {
	testConfig = os.Getenv("KUBECONFIG")
	testDBURI = os.Getenv("DB_URI")
	os.Setenv("LOCAL_REGION", "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx")
}

func TestAccount_V1ToV2(t *testing.T) {
	scheme := runtime.NewScheme()
	utilruntime.Must(accountv1.AddToScheme(scheme))
	config, err := clientcmd.BuildConfigFromFlags("", testConfig)
	if err != nil {
		t.Fatalf("Error building kubeconfig: %v\n", err)
	}
	clt, err := client.New(config, client.Options{Scheme: scheme})
	if err != nil {
		t.Fatalf("failed to new client: %v", err)
	}
	accounts := &accountv1.AccountList{}
	err = clt.List(context.Background(), accounts)
	if err != nil {
		t.Fatalf("failed to get account: %v", err)
	}
	//TODO need init
	accountItf, err := NewAccountV2(testDBURI)
	if err != nil {
		t.Fatalf("failed to new account : %v", err)
	}
	defer func() {
		if err := accountItf.Close(); err != nil {
			t.Errorf("failed close connection: %v", err)
		}
	}()
	wg, ctx := errgroup.WithContext(context.Background())
	for _, a := range accounts.Items {
		account := a
		wg.Go(func() error {
			createAccount := &types.Account{
				EncryptBalance:          *account.Status.EncryptBalance,
				EncryptDeductionBalance: *account.Status.EncryptDeductionBalance,
				Balance:                 account.Status.Balance,
				DeductionBalance:        account.Status.DeductionBalance,
				CreatedAt:               account.CreationTimestamp.Time,
				ActivityBonus:           account.Status.ActivityBonus,
			}
			_, err := accountItf.TransferAccountV1(account.Name, createAccount)
			if err != nil {
				logger.Error("failed to create account %s: %v", account.Name, err)
				if err = accountItf.CreateErrorAccountCreate(createAccount, account.Name, err.Error()); err != nil {
					logger.Error("failed to create err msg %s: %v", account.Name, err)
					ctx.Done()
				}
				return err
			}
			t.Logf("success create account %s", account.Name)
			return nil
		})
	}
	if err := wg.Wait(); err != nil {
		t.Fatalf("failed to create account: %v", err)
	}
}

func TestAccountConvert(t *testing.T) {
	scheme := runtime.NewScheme()
	utilruntime.Must(accountv1.AddToScheme(scheme))
	config, err := clientcmd.BuildConfigFromFlags("", testConfig)
	if err != nil {
		t.Fatalf("Error building kubeconfig: %v\n", err)
	}
	clt, err := client.New(config, client.Options{Scheme: scheme})
	if err != nil {
		t.Fatalf("failed to new client: %v", err)
	}
	accounts := &accountv1.AccountList{}
	err = clt.List(context.Background(), accounts)
	if err != nil {
		t.Fatalf("failed to get account: %v", err)
	}
	for _, a := range accounts.Items {
		account := a
		if account.Status.EncryptBalance != nil || account.Status.EncryptDeductionBalance != nil {
			if account.Status.EncryptBalance != nil && account.Status.EncryptDeductionBalance != nil {
				continue
			}
			t.Logf("account %s already convert", account.Name)
			continue
		}
		accountCopy := &accountv1.Account{}
		err = json.Unmarshal([]byte(account.Annotations[v1.LastAppliedConfigAnnotation]), accountCopy)
		if err != nil {
			t.Fatalf("failed to unmarshal account %s: %v", account.Name, err)
		}
		account.Status = accountCopy.Status
		err = clt.Status().Update(context.Background(), &account)
		if err != nil {
			t.Fatalf("failed to update account %s: %v", account.Name, err)
		}
		t.Logf("success updata status account %s: %+v", account.Name, account.Status)
	}
}

func TestAccountV2_CreateAccount(t *testing.T) {
	account, err := NewAccountV2(testDBURI)
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
	account, err := NewAccountV2(testDBURI)
	if err != nil {
		t.Errorf("failed to new account : %v", err)
	}
	defer func() {
		if err := account.Close(); err != nil {
			t.Errorf("failed close connection: %v", err)
		}
	}()
	aa, err := account.GetAccount(&types.UserQueryOpts{Owner: "eoxwhh80"})
	if err != nil {
		t.Errorf("failed to get account: %v", err)
	}
	t.Logf("success create account: %+v", aa)

	aa, err = account.GetAccount(&types.UserQueryOpts{Owner: "1ycieb5b"})
	if err != nil {
		t.Errorf("failed to get account: %v", err)
	}
	t.Logf("success create account: %+v", aa)
}

func TestAccountV2_GetUser(t *testing.T) {
	account, err := NewAccountV2(testDBURI)
	if err != nil {
		t.Errorf("failed to new account : %v", err)
	}
	defer func() {
		if err := account.Close(); err != nil {
			t.Errorf("failed close connection: %v", err)
		}
	}()
	user, err := account.GetUser(&types.UserQueryOpts{Owner: "eoxwhh80"})
	if err != nil {
		t.Errorf("failed to get user: %v", err)
	}
	t.Logf("success get user: %v", user)
}

func TestAccountV2_TransferAccount(t *testing.T) {
	account, err := NewAccountV2(testDBURI)
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
	account, err := NewAccountV2(testDBURI)
	if err != nil {
		t.Errorf("failed to new account : %v", err)
	}
	defer func() {
		if err := account.Close(); err != nil {
			t.Errorf("failed close connection: %v", err)
		}
	}()
	err = account.AddBalance(&types.UserQueryOpts{Owner: "eoxwhh80"}, 100*cockroach.BaseUnit)
	if err != nil {
		t.Errorf("failed to add balance: %v", err)
	}
	//err = account.AddDeductionBalance(database.UserQueryOpts{Owner: "eoxwhh80"}, 99*BaseUnit)
	//if err != nil {
	//	t.Errorf("failed to add deduction balance: %v", err)
	//}
	aa, err := account.GetAccount(&types.UserQueryOpts{Owner: "eoxwhh80"})
	if err != nil {
		t.Errorf("failed to get account: %v", err)
	}
	t.Logf("success create account: %+v", aa)
}
