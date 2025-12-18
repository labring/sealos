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
	"time"

	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	licenseutil "github.com/labring/sealos/controllers/license/internal/util/license"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/util/retry"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type LicenseActivator struct {
	client.Client
}

func (r *LicenseActivator) updateStatus(
	ctx context.Context,
	nn types.NamespacedName,
	status *licensev1.LicenseStatus,
) error {
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		original := &licensev1.License{}
		if err := r.Get(ctx, nn, original); err != nil {
			return err
		}
		original.Status = *status
		return r.Client.Status().Update(ctx, original)
	})
}

func (r *LicenseActivator) Active(ctx context.Context, license *licensev1.License) error {
	exp, err := licenseutil.GetLicenseExpireTime(license)
	if err != nil {
		return err
	}
	updateStatus := &license.Status
	updateStatus.Phase = licensev1.LicenseStatusPhaseActive
	updateStatus.Reason = "License activated successfully"
	updateStatus.ExpirationTime = metav1.NewTime(exp)
	updateStatus.ActivationTime = metav1.NewTime(time.Now())

	return r.updateStatus(ctx, client.ObjectKeyFromObject(license), updateStatus)
}
