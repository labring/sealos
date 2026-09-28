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

package controller

import (
	"context"
	"testing"
	"time"

	"github.com/go-logr/logr"
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	notificationv1 "github.com/labring/sealos/controllers/pkg/notification/api/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestExpirationNotificationsAcrossLicenses(t *testing.T) {
	now := time.Now()
	for _, tc := range []struct {
		name         string
		oldExpired   bool
		renewalPhase licensev1.LicenseStatusPhase
		renewalDays  int
		deleting     bool
		wantUnread   bool
		wantExpired  bool
	}{
		{name: "renewal suppresses old warning", renewalPhase: licensev1.LicenseStatusPhaseActive, renewalDays: 180},
		{name: "renewal suppresses old expiration", oldExpired: true, renewalPhase: licensev1.LicenseStatusPhaseActive, renewalDays: 180},
		{name: "invalid renewal does not hide warning", renewalPhase: licensev1.LicenseStatusPhaseFailed, renewalDays: 180, wantUnread: true},
		{name: "deleting renewal does not hide warning", renewalPhase: licensev1.LicenseStatusPhaseActive, renewalDays: 180, deleting: true, wantUnread: true},
		{name: "real imminent expiration", renewalPhase: licensev1.LicenseStatusPhaseActive, renewalDays: 3, wantUnread: true},
		{name: "all expired", oldExpired: true, renewalPhase: licensev1.LicenseStatusPhaseExpired, renewalDays: -1, wantExpired: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			scheme := runtime.NewScheme()
			if err := licensev1.AddToScheme(scheme); err != nil {
				t.Fatal(err)
			}
			if err := notificationv1.AddToScheme(scheme); err != nil {
				t.Fatal(err)
			}
			old := &licensev1.License{ObjectMeta: metav1.ObjectMeta{Name: "default", Namespace: adminNamespace}}
			old.Status.Phase = licensev1.LicenseStatusPhaseActive
			old.Status.ExpirationTime = metav1.NewTime(now.Add(24 * time.Hour))
			if tc.oldExpired {
				old.Status.Phase = licensev1.LicenseStatusPhaseExpired
				old.Status.ExpirationTime = metav1.NewTime(now.Add(-48 * time.Hour))
			}
			renewal := old.DeepCopy()
			renewal.Name = "renewal"
			renewal.Status.Phase = tc.renewalPhase
			renewal.Status.ExpirationTime = metav1.NewTime(now.Add(time.Duration(tc.renewalDays) * 24 * time.Hour))
			if tc.deleting {
				renewal.DeletionTimestamp = &metav1.Time{Time: now}
				renewal.Finalizers = []string{"test"}
			}
			warning := &notificationv1.Notification{ObjectMeta: metav1.ObjectMeta{Name: licenseExpiringPrefix, Namespace: adminNamespace, Labels: map[string]string{readStatusLabel: falseStatus}}}
			expired := warning.DeepCopy()
			expired.Name = licenseExpiredPrefix
			c := fake.NewClientBuilder().WithScheme(scheme).WithObjects(old, renewal, warning, expired).Build()
			n := &LicenseNotifier{Client: c, Logger: logr.Discard()}
			// Repeated reconciles in either order must converge to the same cluster warning.
			for _, l := range []*licensev1.License{renewal, old, old, renewal} {
				if err := n.checkLicenseExpiration(context.Background(), l); err != nil {
					t.Fatal(err)
				}
				for name, want := range map[string]bool{licenseExpiringPrefix: tc.wantUnread, licenseExpiredPrefix: tc.wantExpired} {
					got := &notificationv1.Notification{}
					if err := c.Get(context.Background(), types.NamespacedName{Name: name, Namespace: adminNamespace}, got); err != nil {
						t.Fatal(err)
					}
					if isNotificationUnread(got) != want {
						t.Fatalf("after %s: %s unread=%v, want %v", l.Name, name, isNotificationUnread(got), want)
					}
				}
			}
		})
	}
}
