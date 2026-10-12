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

package kubernetes

import (
	"context"

	"github.com/labring/sealos/pkg/ssh"
)

func (k *KubeadmRuntime) SetMaintenanceContext(ctx context.Context) {
	if ctx == nil || !k.cluster.IsStandaloneControlPlane() {
		return
	}
	k.maintenanceContext = ctx
	k.execer = ssh.WithContext(ctx, k.execer)
	k.remoteUtil = ssh.NewRemoteFromSSH(k.cluster.Name, k.execer)
}

func (k *KubeadmRuntime) lifecycleContext() context.Context {
	if k.maintenanceContext != nil {
		return k.maintenanceContext
	}
	return context.Background()
}
