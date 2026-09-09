/*
Copyright 2022 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package kubernetes

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/sync/errgroup"
)

// copyKubeAdminConfigCommand keeps the long-standing convenience contract for
// the node where the cluster is bootstrapped. Additional nodes deliberately do
// not receive this cluster-admin credential.
const copyKubeAdminConfigCommand = `rm -rf $HOME/.kube/config && mkdir -p $HOME/.kube && cp /etc/kubernetes/admin.conf $HOME/.kube/config`

func (k *KubeadmRuntime) copyMasterKubeConfig(host string) error {
	return k.sshCmdAsync(host, copyKubeAdminConfigCommand)
}

func (k *KubeadmRuntime) restartStaticPod(component string) error {
	containerQuery := fmt.Sprintf("crictl ps --state Running --name '^%s$' -o json", component)
	type crictlPS struct {
		Containers []struct {
			ID string `json:"id"`
		} `json:"containers"`
	}

	eg, _ := errgroup.WithContext(context.Background())
	for _, master := range k.getMasterIPAndPortList() {
		m := master
		eg.Go(func() error {
			containersJSON, err := k.sshCmdToString(m, containerQuery)
			if err != nil {
				return err
			}
			ps := &crictlPS{}
			if err = json.Unmarshal([]byte(containersJSON), ps); err != nil {
				return err
			}
			if len(ps.Containers) == 0 {
				return errors.New("not found static pod running")
			}

			// Kubelet restarts stopped containers and loads the updated certificates.
			// Removing the sandbox races with containers that kubelet is starting.
			for _, container := range ps.Containers {
				if container.ID == "" {
					return errors.New("static pod container has an empty ID")
				}
				containerID := "'" + strings.ReplaceAll(container.ID, "'", "'\\''") + "'"
				if err = k.sshCmdAsync(
					m,
					"crictl --timeout=30s stop --timeout=10 "+containerID,
				); err != nil {
					return err
				}
			}
			return nil
		})
	}
	return eg.Wait()
}
