// Copyright © 2023 sealos.
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

package api

import (
	"fmt"
	"time"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
)

const AccountBalanceYaml = `
apiVersion: account.sealos.io/v1
kind: AccountBalance
metadata:
  name: ${name}
  namespace: ${namespace}
`

func GetAccountBalance(namespace string, name string) (*accountv1.AccountBalance, error) {
	gvr := accountv1.GroupVersion.WithResource("accountbalances")
	var accountbalance accountv1.AccountBalance
	if err := baseapi.GetObject(namespace, name, gvr, &accountbalance); err != nil {
		return nil, err
	}
	return &accountbalance, nil
}

func EnsureAccountBalanceCreate(namespace string, name string, times int) (*accountv1.AccountBalance, error) {
	time.Sleep(time.Second)
	for i := 1; i <= times; i++ {
		accountBalance, err := GetAccountBalance(namespace, name)
		if err != nil {
			time.Sleep(time.Second)
			continue
		}
		if accountBalance.Spec.Amount > 0 {
			return accountBalance, nil
		}
		time.Sleep(time.Second)
	}
	return nil, fmt.Errorf("accountbalance get fail")
}
