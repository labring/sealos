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
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
)

type TestConfig struct {
	RegionID      string
	V2GlobalDBURI string
	V2LocalDBURI  string
}

var testConfig = TestConfig{}

func TestCockroach_GetUserOauthProvider(t *testing.T) {
	os.Setenv("LOCAL_REGION", testConfig.RegionID)
	ck, err := NewCockRoach(testConfig.V2GlobalDBURI, testConfig.V2LocalDBURI)
	if err != nil {
		t.Errorf("NewCockRoach() error = %v", err)
		return
	}
	defer ck.Close()

	provider, err := ck.GetUserOauthProvider(&types.UserQueryOpts{
		Owner: "xxx",
	})
	if err != nil {
		t.Errorf("GetUserOauthProvider() error = %v", err)
		return
	}
	t.Logf("provider: %+v", provider)
}

func TestCockroach_GetAccountWithWorkspace(t *testing.T) {
	ck, err := NewCockRoach(os.Getenv("GLOBAL_COCKROACH_URI"), os.Getenv("LOCAL_COCKROACH_URI"))
	if err != nil {
		t.Errorf("NewCockRoach() error = %v", err)
		return
	}
	defer ck.Close()

	account, err := ck.GetAccountWithWorkspace("ns-1c6gn6e0")

	if err != nil {
		t.Errorf("GetAccountWithWorkspace() error = %v", err)
		return
	}
	t.Logf("account: %+v", account)
}

func TestCockroach_InitTables(t *testing.T) {
	os.Setenv("LOCAL_REGION", "")
	ck, err := NewCockRoach("", "")
	if err != nil {
		t.Errorf("NewCockRoach() error = %v", err)
		return
	}
	defer ck.Close()

	//uid, err := uuid.Parse("9477dc81-de9a-48b0-b88e-5b3ec6c33a54")
	//if err != nil {
	//	t.Fatalf("uuid.Parse() error = %v", err)
	//}
	//-2.77
	ops := &types.UserQueryOpts{
		//UID: uid,
		//ID: "9F5NY4_lbS",
		Owner:       "6it2bra2",
		IgnoreEmpty: true,
	}

	userUID, err := ck.GetUser(ops)
	if err != nil {
		t.Fatalf("GetUserUID() error = %v", err)
	}
	t.Logf("userUID: %+v", userUID)

	//err = ck.InitTables()
	//if err != nil {
	//	t.Errorf("InitTables() error = %v", err)
	//	return
	//}
	//
	//
	//err = ck.CreateCredits(&types.Credits{
	//	UserUID:  uid,
	//	Amount:   100000000,
	//	ExpireAt: time.Now().UTC().Add(10 * 365 * 24 * time.Hour),
	//	StartAt:  time.Now().UTC(),
	//	Status:   types.CreditsStatusActive,
	//})
	//if err != nil {
	//	t.Fatalf("CreateCredits() error = %v", err)
	//}
	//
	//err = ck.AddDeductionBalanceWithCredits(ops, 10_000000, []string{"order1", "order2"})
	//if err != nil {
	//	t.Fatalf("AddDeductionBalanceWithCredits() error = %v", err)
	//}
}

func TestCockroach_CreateCorporate(t *testing.T) {
	os.Setenv("LOCAL_REGION", "")
	ck, err := NewCockRoach("/", "")
	if err != nil {
		t.Errorf("NewCockRoach() error = %v", err)
		return
	}
	defer ck.Close()

	cor := &types.Corporate{
		UserUID:             "66EqYNUnLr",
		ReceiptSerialNumber: uuid.New().String(),
		PayerName:           "payerName",
		PaymentAmount:       1_000_000,
		GiftAmount:          1_000_000,
	}
	err = ck.CreateCorporate(cor)
	if err != nil {
		t.Errorf("CreateCorporate() error = %v", err)
	}
	t.Logf("cor: %+v", cor)
}
