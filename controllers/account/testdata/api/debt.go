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
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
)

const DebtYaml = `
apiVersion: account.sealos.io/v1
kind: Debt
metadata:
  name: ${name}
  namespace: ${namespace}
spec:
  userName: metering-test
`

func GetDebt(namespace string, name string) (*accountv1.Debt, error) {
	gvr := accountv1.GroupVersion.WithResource("debts")
	var debt accountv1.Debt
	if err := baseapi.GetObject(namespace, name, gvr, &debt); err != nil {
		return nil, err
	}
	return &debt, nil
}
