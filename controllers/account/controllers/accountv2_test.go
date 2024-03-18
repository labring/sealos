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
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/labring/sealos/controllers/pkg/database"

	"github.com/labring/sealos/controllers/pkg/database/mongo"

	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/controllers/pkg/database/cockroach"
	"github.com/labring/sealos/controllers/pkg/utils/logger"

	"sigs.k8s.io/controller-runtime/pkg/client"

	"k8s.io/client-go/tools/clientcmd"

	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"

	"github.com/labring/sealos/controllers/pkg/types"
)

var (
	testV2GlobalDBURI = ""
	testV2LocalDBURI  = ""
)

type testConfig struct {
	RegionID      string
	V1dbURI       string
	V2GlobalDBURI string
	V2LocalDBURI  string
	Kubeconfig    string
}

var RegionsConfig = []testConfig{}

func mkdirs(dirs ...string) error {
	for _, dir := range dirs {
		err := os.MkdirAll(dir, 0755)
		if err != nil {
			return err
		}
	}
	return nil
}

func TestAccount_V1ToV2(t *testing.T) {
	for i := range RegionsConfig {
		os.Unsetenv("LOCAL_REGION")
		err := os.Setenv("LOCAL_REGION", RegionsConfig[i].RegionID)
		if err != nil {
			t.Fatalf("failed to set env: %v", err)
		}
		err = mkdirs(filepath.Join("transferv1tov2", "null_user_record", RegionsConfig[i].RegionID),
			filepath.Join("transferv1tov2", "transfer_account_v1", RegionsConfig[i].RegionID),
			filepath.Join("transferv1tov2", "transfer_account_v1_exist", RegionsConfig[i].RegionID))
		if err != nil {
			t.Fatalf("failed to create dir: %v", err)
		}
		scheme := runtime.NewScheme()
		utilruntime.Must(accountv1.AddToScheme(scheme))
		config, err := clientcmd.BuildConfigFromFlags("", RegionsConfig[i].Kubeconfig)
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
		t.Logf("success get region account len: %d, startTime: %s", len(accounts.Items), time.Now().UTC().Format("2006-01-02 15:04:05"))
		accountItf, err := database.NewAccountV2(RegionsConfig[i].V2GlobalDBURI, RegionsConfig[i].V2LocalDBURI)
		if err != nil {
			t.Fatalf("failed to new account : %v", err)
		}
		defer func() {
			if err := accountItf.Close(); err != nil {
				t.Errorf("failed close connection: %v", err)
			}
		}()
		wg, ctx := errgroup.WithContext(context.Background())
		wg.SetLimit(100)
		for _, a := range accounts.Items {
			account := a
			wg.Go(func() error {
				createAccount := &types.Account{
					EncryptBalance:          *account.Status.EncryptBalance,
					EncryptDeductionBalance: *account.Status.EncryptDeductionBalance,
					Balance:                 account.Status.Balance,
					DeductionBalance:        account.Status.DeductionBalance,
					CreatedAt:               account.CreationTimestamp.Time,
					CreateRegionID:          RegionsConfig[i].RegionID,
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
				//t.Logf("success create account %s", account.Name)
				return nil
			})
		}
		if err := wg.Wait(); err != nil {
			t.Fatalf("failed to create account: %v", err)
		}
	}
}

func TestConvertPayment_V1ToV2(t *testing.T) {
	for i := range RegionsConfig {
		os.Unsetenv("LOCAL_REGION")
		err := os.Setenv("LOCAL_REGION", RegionsConfig[i].RegionID)
		if err != nil {
			t.Fatalf("failed to set env: %v", err)
		}
		accountV2, err := database.NewAccountV2(RegionsConfig[i].V2GlobalDBURI, RegionsConfig[i].V2LocalDBURI)
		if err != nil {
			t.Fatalf("failed to new account : %v", err)
		}
		defer func() {
			if err := accountV2.Close(); err != nil {
				t.Errorf("failed close connection: %v", err)
			}
		}()
		accountV1, err := mongo.NewMongoInterface(context.Background(), RegionsConfig[i].V1dbURI)
		if err != nil {
			t.Fatalf("failed to new account : %v", err)
		}
		defer func() {
			if err := accountV1.Disconnect(context.Background()); err != nil {
				t.Errorf("failed close connection: %v", err)
			}
		}()
		billings, err := accountV1.GetAllPayment()
		if err != nil {
			t.Fatalf("failed to get billing: %v", err)
		}
		eg := errgroup.Group{}
		eg.SetLimit(100)

		for i := range billings {
			bill := billings[i]
			eg.Go(func() error {
				payment := types.Payment{
					ID: bill.OrderID,
					PaymentRaw: types.PaymentRaw{
						CreatedAt:       bill.Time,
						Amount:          bill.Payment.Amount,
						RegionUserOwner: bill.Owner,
						Method:          bill.Payment.Method,
						CodeURL:         bill.Payment.CodeURL,
						TradeNO:         bill.Payment.TradeNO,
						Gift:            bill.Amount - bill.Payment.Amount,
					},
				}
				err = accountV2.SavePayment(&payment)
				if err != nil {
					//logger.Error("failed to create payment %s: %v", payment.CrName, err)
					if err2 := accountV2.CreateErrorPaymentCreate(payment, err.Error()); err2 != nil {
						logger.Error("failed to create err msg %s: %v", payment.ID, err2)
					}
				}
				//logger.Info("success get payment %s", bill)
				return nil
			})
		}
		if err := eg.Wait(); err != nil {
			t.Fatalf("failed to wait create payment: %v", err)
			return
		}
	}
	t.Logf("success convert payment")
}

//func TestAccountConvert(t *testing.T) {
//	scheme := runtime.NewScheme()
//	utilruntime.Must(accountv1.AddToScheme(scheme))
//	config, err := clientcmd.BuildConfigFromFlags("", testConfig)
//	if err != nil {
//		t.Fatalf("Error building kubeconfig: %v\n", err)
//	}
//	clt, err := client.New(config, client.Options{Scheme: scheme})
//	if err != nil {
//		t.Fatalf("failed to new client: %v", err)
//	}
//	accounts := &accountv1.AccountList{}
//	err = clt.List(context.Background(), accounts)
//	if err != nil {
//		t.Fatalf("failed to get account: %v", err)
//	}
//	for _, a := range accounts.Items {
//		account := a
//		if account.Status.EncryptBalance != nil || account.Status.EncryptDeductionBalance != nil {
//			if account.Status.EncryptBalance != nil && account.Status.EncryptDeductionBalance != nil {
//				continue
//			}
//			t.Logf("account %s already convert", account.Name)
//			continue
//		}
//		accountCopy := &accountv1.Account{}
//		err = json.Unmarshal([]byte(account.Annotations[v1.LastAppliedConfigAnnotation]), accountCopy)
//		if err != nil {
//			t.Fatalf("failed to unmarshal account %s: %v", account.Name, err)
//		}
//		account.Status = accountCopy.Status
//		err = clt.Status().Update(context.Background(), &account)
//		if err != nil {
//			t.Fatalf("failed to update account %s: %v", account.Name, err)
//		}
//		t.Logf("success updata status account %s: %+v", account.Name, account.Status)
//	}
//}

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
