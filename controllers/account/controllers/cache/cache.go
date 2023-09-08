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

package cache

import (
	"context"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	corev1 "k8s.io/api/core/v1"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

func SetupCache(mgr ctrl.Manager) error {
	account := &accountv1.Account{}
	accountNameFunc := func(obj client.Object) []string {
		return []string{obj.(*accountv1.Account).Name}
	}

	ns := &corev1.Namespace{}
	nsNameFunc := func(obj client.Object) []string {
		return []string{obj.(*corev1.Namespace).Name}
	}

	if err := mgr.GetFieldIndexer().IndexField(context.TODO(), ns, "name", nsNameFunc); err != nil {
		return err
	}
	return mgr.GetFieldIndexer().IndexField(context.TODO(), account, "name", accountNameFunc)
}
