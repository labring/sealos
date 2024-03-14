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

package controller

import (
	"fmt"
	"strings"

	claimsutil "github.com/labring/sealos/controllers/license/internal/util/claims"
	licenseutil "github.com/labring/sealos/controllers/license/internal/util/license"
	count "github.com/labring/sealos/controllers/pkg/account"
	database2 "github.com/labring/sealos/controllers/pkg/database"
	types2 "github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/controllers/pkg/utils/logger"

	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
)

type LicenseActivator struct {
	accountDB database2.AccountV2
}

func (l *LicenseActivator) Active(license *licensev1.License) error {
	// TODO mv to active function
	switch license.Spec.Type {
	case licensev1.AccountLicenseType:
		if err := l.Recharge(license); err != nil {
			return fmt.Errorf("recharge account failed: %w", err)
		}
	case licensev1.ClusterLicenseType:
		// TODO implement cluster license
	}
	return nil
}

func (l *LicenseActivator) Recharge(license *licensev1.License) error {
	claims, err := licenseutil.GetClaims(license)
	if err != nil {
		return err
	}

	var data = &claimsutil.AccountClaimData{}
	if err := claims.Data.SwitchToAccountData(data); err != nil {
		return err
	}
	owner := GetNameByNameSpace(license.Namespace)

	logger.Info("recharge account", "crName", owner, "amount", data.Amount)

	return l.accountDB.AddBalance(&types2.UserQueryOpts{Owner: owner}, data.Amount*count.CurrencyUnit)
}

func GetNameByNameSpace(ns string) string {
	return strings.TrimPrefix(ns, "ns-")
}
