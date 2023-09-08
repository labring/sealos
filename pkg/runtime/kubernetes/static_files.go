// Copyright © 2021 Alibaba Group Holding Ltd.
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
	"fmt"
	"path/filepath"

	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/utils/logger"
)

const (
	auditPolicyYml       = "audit-policy.yml"
	copyFileToDirCommand = "mkdir -p %s && cp -f %s %s"
)

// StaticFile :static file should not be template, will never be changed while initialization.
type StaticFile struct {
	DestinationDir string
	Name           string
}

// MasterStaticFiles Put static files here, can be moved to all master nodes before kubeadm execution
var MasterStaticFiles = []*StaticFile{
	{
		DestinationDir: "/etc/kubernetes",
		Name:           auditPolicyYml,
	},
}

func (k *KubeadmRuntime) CopyStaticFilesToMasters() error {
	return k.copyStaticFiles(k.getMasterIPAndPortList())
}

func (k *KubeadmRuntime) copyStaticFiles(nodes []string) error {
	logger.Info("start to copy static files to masters")
	for _, file := range MasterStaticFiles {
		staticFilePath := filepath.Join(k.pathResolver.RootFSStaticsPath(), file.Name)
		cmdLinkStatic := fmt.Sprintf(copyFileToDirCommand, file.DestinationDir, staticFilePath, filepath.Join(file.DestinationDir, file.Name))
		eg, _ := errgroup.WithContext(context.Background())
		for _, host := range nodes {
			host := host
			eg.Go(func() error {
				err := k.sshCmdAsync(host, cmdLinkStatic)
				if err != nil {
					return fmt.Errorf("failed to copy static file to %s: %s", host, err.Error())
				}
				return nil
			})
		}
		if err := eg.Wait(); err != nil {
			return err
		}
	}
	return nil
}
