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

package licensegate

import (
	"context"
	"sync/atomic"

	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const DefaultUserLimit = 1

var (
	activeFlag      uint32
	initializedFlag uint32
)

func Initialized() bool {
	return atomic.LoadUint32(&initializedFlag) == 1
}

func HasActiveLicense() bool {
	return atomic.LoadUint32(&activeFlag) == 1
}

func AllowNewUser(currentCount int) bool {
	if HasActiveLicense() {
		return true
	}
	if !Initialized() {
		return false
	}
	return currentCount < DefaultUserLimit
}

func SetActive(active bool) {
	if active {
		atomic.StoreUint32(&activeFlag, 1)
	} else {
		atomic.StoreUint32(&activeFlag, 0)
	}
	atomic.StoreUint32(&initializedFlag, 1)
}

func Refresh(ctx context.Context, reader client.Reader) error {
	licenseList := &licensev1.LicenseList{}
	if err := reader.List(ctx, licenseList); err != nil {
		return err
	}
	hasActive := false
	for i := range licenseList.Items {
		if licenseList.Items[i].Status.Phase == licensev1.LicenseStatusPhaseActive {
			hasActive = true
			break
		}
	}
	SetActive(hasActive)
	return nil
}
