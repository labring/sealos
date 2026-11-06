// Copyright 2026 labring.
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

package cache

import (
	"context"
	"fmt"
	"net/http"

	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	corev1 "k8s.io/api/core/v1"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
)

// SetupReadiness checks the informers without blocking probe requests or requiring leadership.
func SetupReadiness(mgr ctrl.Manager) error {
	checks := map[string]func() bool{}
	for name, object := range map[string]client.Object{"licenses": &licensev1.License{}, "nodes": &corev1.Node{}} {
		informer, err := mgr.GetCache().GetInformer(context.Background(), object)
		if err != nil {
			return fmt.Errorf("register %s readiness informer: %w", name, err)
		}
		checks[name] = informer.HasSynced
	}
	return mgr.AddReadyzCheck("cache-sync", cacheReady(checks))
}

func cacheReady(checks map[string]func() bool) healthz.Checker {
	return func(_ *http.Request) error {
		for name, synced := range checks {
			if !synced() {
				return fmt.Errorf("%s cache has not synced", name)
			}
		}
		return nil
	}
}
