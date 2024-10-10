/*
Copyright 2023.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package controllers

import (
	"context"
	"encoding/json"
	"os"
	"testing"

	ctrl "sigs.k8s.io/controller-runtime"

	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/database/cockroach"
	"github.com/labring/sealos/controllers/pkg/database/mongo"
)

func TestAccountReconciler_BillingCVM(t *testing.T) {
	dbCtx := context.Background()
	cvmDBClient, err := mongo.NewMongoInterface(dbCtx, os.Getenv(database.CVMMongoURI))
	if err != nil {
		t.Fatalf("unable to connect to mongo: %v", err)
	}
	defer func() {
		if cvmDBClient != nil {
			err := cvmDBClient.Disconnect(dbCtx)
			if err != nil {
				t.Errorf("unable to disconnect from mongo: %v", err)
			}
		}
	}()
	v2Account, err := cockroach.NewCockRoach(os.Getenv(database.GlobalCockroachURI), os.Getenv(database.LocalCockroachURI))
	if err != nil {
		t.Fatalf("unable to connect to cockroach: %v", err)
	}
	defer func() {
		err := v2Account.Close()
		if err != nil {
			t.Errorf("unable to disconnect from cockroach: %v", err)
		}
	}()
	DBClient, err := mongo.NewMongoInterface(dbCtx, os.Getenv(database.MongoURI))
	if err != nil {
		t.Fatalf("unable to connect to mongo: %v", err)
	}
	defer func() {
		err := DBClient.Disconnect(dbCtx)
		if err != nil {
			t.Errorf("unable to disconnect from mongo: %v", err)
		}
	}()

	r := &AccountReconciler{
		AccountV2:   v2Account,
		DBClient:    DBClient,
		CVMDBClient: cvmDBClient,
		Logger:      ctrl.Log.WithName("controllers").WithName("AccountReconciler"),
	}
	if err := r.BillingCVM(); err != nil {
		t.Errorf("AccountReconciler.BillingCVM() error = %v", err)
	}
}

func TestAccountV2_GetAccountConfig(t *testing.T) {
	os.Setenv("LOCAL_REGION", "")
	v2Account, err := cockroach.NewCockRoach("", "")
	if err != nil {
		t.Fatalf("unable to connect to cockroach: %v", err)
	}
	defer func() {
		err := v2Account.Close()
		if err != nil {
			t.Errorf("unable to disconnect from cockroach: %v", err)
		}
	}()
	err = v2Account.InitTables()
	if err != nil {
		t.Fatalf("unable to init tables: %v", err)
	}

	//if err = v2Account.InsertAccountConfig(&types.AccountConfig{
	//	TaskProcessRegion: "192.160.0.55.nip.io",
	//	FirstRechargeDiscountSteps: map[int64]float64{
	//		8: 100, 32: 100, 128: 100, 256: 100, 512: 100, 1024: 100,
	//	},
	//	DefaultDiscountSteps: map[int64]float64{
	//		//128,256,512,1024,2048,4096; 10,15,20,25,30,35
	//		128: 10, 256: 15, 512: 20, 1024: 25, 2048: 30, 4096: 35,
	//	},
	//}); err != nil {
	//	t.Fatalf("unable to insert account config: %v", err)
	//}

	aa, err := v2Account.GetAccountConfig()
	if err != nil {
		t.Fatalf("failed to get account config: %v", err)
	}

	data, err := json.MarshalIndent(aa, "", "  ")
	if err != nil {
		t.Fatalf("failed to marshal account config: %v", err)
	}
	t.Logf("success get account config:\n%s", string(data))
}
