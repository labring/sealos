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
	"context"

	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	accountutil "github.com/labring/sealos/controllers/license/internal/util/account"

	"sigs.k8s.io/controller-runtime/pkg/client"
)

type LicenseActivator struct {
	client.Client
}

func (a *LicenseActivator) Active(ctx context.Context, license *licensev1.License) error {
	// TODO mv to active function
	switch license.Spec.Type {
	case licensev1.AccountLicenseType:
		if err := accountutil.Recharge(ctx, a.Client, license); err != nil {
			return err
		}
	case licensev1.ClusterLicenseType:
		// TODO implement cluster license
	}
	return nil
}
