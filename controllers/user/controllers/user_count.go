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
	"errors"
	"fmt"
	"net/http"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/labring/sealos/controllers/user/pkg/usercount"
	toolscache "k8s.io/client-go/tools/cache"
	ctrl "sigs.k8s.io/controller-runtime"
)

type userCountRunnable struct {
	counter             *usercount.Counter
	handlerRegistration toolscache.ResourceEventHandlerRegistration
}

func (r *userCountRunnable) Start(ctx context.Context) error {
	if !toolscache.WaitForCacheSync(ctx.Done(), r.handlerRegistration.HasSynced) {
		if ctx.Err() != nil {
			return nil
		}
		return errors.New("user count event handler failed to sync")
	}
	r.counter.MarkInitialized()
	<-ctx.Done()
	return nil
}

func (r *userCountRunnable) NeedLeaderElection() bool {
	return false
}

func SetupUserCount(mgr ctrl.Manager) (*usercount.Counter, error) {
	counter := usercount.NewCounter()
	informer, err := mgr.GetCache().GetInformer(context.Background(), &userv1.User{})
	if err != nil {
		return nil, fmt.Errorf("get user informer: %w", err)
	}
	registration, err := informer.AddEventHandler(toolscache.ResourceEventHandlerFuncs{
		AddFunc:    counter.Add,
		UpdateFunc: counter.Update,
		DeleteFunc: counter.Delete,
	})
	if err != nil {
		return nil, fmt.Errorf("add user count event handler: %w", err)
	}

	if err := mgr.Add(&userCountRunnable{
		counter:             counter,
		handlerRegistration: registration,
	}); err != nil {
		return nil, fmt.Errorf("add user count runnable: %w", err)
	}
	if err := mgr.AddReadyzCheck("user-count-cache", func(_ *http.Request) error {
		if !counter.Initialized() {
			return errors.New("user count cache is not initialized")
		}
		return nil
	}); err != nil {
		return nil, fmt.Errorf("add user count readiness check: %w", err)
	}
	return counter, nil
}
