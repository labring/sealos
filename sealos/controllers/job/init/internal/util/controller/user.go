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

	"github.com/labring/sealos/controllers/job/init/internal/util/common"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"

	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// pre-defined user info in kubernetes

const (
	DefaultAdminUserName = "admin"
)

var (
	scheme = runtime.NewScheme()
)

func init() {
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))
	utilruntime.Must(userv1.AddToScheme(scheme))
}

func newKubernetesClient() (client.Client, error) {
	c, err := client.New(ctrl.GetConfigOrDie(), client.Options{Scheme: scheme})
	if err != nil {
		return nil, err
	}
	return c, nil
}

func newAdminUser(ctx context.Context, c client.Client) (*userv1.User, error) {
	var u = &userv1.User{}
	u.SetName(DefaultAdminUserName)
	if err := c.Get(ctx, client.ObjectKeyFromObject(u), u); client.IgnoreNotFound(err) != nil {
		return nil, err
	}
	if u.Labels == nil {
		u.SetLabels(map[string]string{"uid": common.AdminUID().String(), "updateTime": "T2301-01T00-00-00"})
	} else if u.Labels["uid"] == "" {
		u.Labels["uid"] = common.AdminUID().String()
		u.Labels["updateTime"] = "T2301-01T00-00-00"
	}
	return u, nil
}

func PresetAdminUser(ctx context.Context) error {
	c, err := newKubernetesClient()
	if err != nil {
		return err
	}
	adminUser, err := newAdminUser(ctx, c)
	if err != nil {
		return err
	}
	_, err = ctrl.CreateOrUpdate(ctx, c, adminUser, func() error {
		return nil
	})
	return err
}
