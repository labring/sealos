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
	"time"

	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	licensepkg "github.com/labring/sealos/controllers/pkg/license"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const DefaultUserLimit = 1

var (
	activeFlag      atomic.Uint32
	initializedFlag atomic.Uint32
	userLimit       atomic.Int64
)

func Initialized() bool {
	return initializedFlag.Load() == 1
}

func HasActiveLicense() bool {
	return activeFlag.Load() == 1
}

func AllowNewUser(currentCount int) bool {
	if !Initialized() {
		return false
	}
	limit := UserLimit()
	if limit < 0 {
		return true
	}
	return currentCount < limit
}

func UserLimit() int {
	return int(userLimit.Load())
}

func LimitMessage() string {
	if HasActiveLicense() {
		return "license active: user limit reached"
	}
	return "license inactive: user limit reached"
}

func SetActive(active bool) {
	if active {
		activeFlag.Store(1)
	} else {
		activeFlag.Store(0)
	}
	initializedFlag.Store(1)
}

func SetUserLimit(limit int) {
	userLimit.Store(int64(limit))
	initializedFlag.Store(1)
}

func SetState(active bool, limit int) {
	SetActive(active)
	SetUserLimit(limit)
}

func Refresh(ctx context.Context, reader client.Reader) error {
	licenseList := &licensev1.LicenseList{}
	if err := reader.List(ctx, licenseList); err != nil {
		return err
	}
	var selected *licensev1.License
	for i := range licenseList.Items {
		license := &licenseList.Items[i]
		if license.Status.Phase != licensev1.LicenseStatusPhaseActive {
			continue
		}
		if selected == nil || licenseTimestamp(license).After(licenseTimestamp(selected)) {
			selected = license
		}
	}
	if selected == nil {
		SetState(false, DefaultUserLimit)
		return nil
	}
	claims, err := licensepkg.GetClaimsFromLicense(selected)
	if err != nil {
		SetState(false, DefaultUserLimit)
		return err
	}
	clusterData := &licensepkg.ClusterClaimData{}
	if err := claims.Data.SwitchToClusterData(clusterData); err != nil {
		SetState(false, DefaultUserLimit)
		return err
	}
	SetState(true, clusterData.UserCount)
	return nil
}

func licenseTimestamp(license *licensev1.License) time.Time {
	if !license.Status.ActivationTime.IsZero() {
		return license.Status.ActivationTime.Time
	}
	return license.CreationTimestamp.Time
}
