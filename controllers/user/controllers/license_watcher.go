// Copyright © 2026 sealos.
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

	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	"github.com/labring/sealos/controllers/user/pkg/licensegate"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/tools/cache"
	ctrl "sigs.k8s.io/controller-runtime"
)

func SetupLicenseGate(mgr ctrl.Manager) error {
	logger := ctrl.Log.WithName("license-gate")
	reader := mgr.GetAPIReader()
	if err := licensegate.Refresh(context.Background(), reader); err != nil {
		logger.Error(err, "initial license gate refresh failed")
	}
	licenseMetadata := &metav1.PartialObjectMetadata{}
	licenseMetadata.SetGroupVersionKind(licensev1.GroupVersion.WithKind("License"))
	informer, err := mgr.GetCache().GetInformer(context.Background(), licenseMetadata)
	if err != nil {
		return err
	}
	if _, err := informer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc: func(obj any) {
			if err := licensegate.Refresh(context.Background(), reader); err != nil {
				logger.Error(err, "license gate refresh failed on add")
			}
		},
		UpdateFunc: func(oldObj, newObj any) {
			if err := licensegate.Refresh(context.Background(), reader); err != nil {
				logger.Error(err, "license gate refresh failed on update")
			}
		},
		DeleteFunc: func(obj any) {
			if err := licensegate.Refresh(context.Background(), reader); err != nil {
				logger.Error(err, "license gate refresh failed on delete")
			}
		},
	}); err != nil {
		return err
	}
	return nil
}
