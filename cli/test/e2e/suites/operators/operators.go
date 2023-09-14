/*
Copyright 2023 cuisongliu@qq.com.

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

package operators

import (
	"github.com/labring/sealos/test/e2e/testhelper/cmd"
	"github.com/labring/sealos/test/e2e/testhelper/settings"
)

type FakeClient struct {
	Image        FakeImageInterface
	CRI          FakeCRIInterface
	Cluster      FakeClusterInterface
	Cert         FakeCertInterface
	Inspect      FakeInspectInterface
	CmdInterface cmd.Interface
}

func NewFakeClient(clusterName string) *FakeClient {
	if clusterName == "" {
		clusterName = "default"
	}
	localCmd := cmd.NewSealosCmd(settings.E2EConfig.SealosBinPath, &cmd.LocalCmd{})
	return &FakeClient{
		Image:        NewFakeImage(localCmd),
		CRI:          newCRIClient(localCmd),
		Cluster:      newClusterClient(localCmd, clusterName),
		Cert:         newCertClient(localCmd, clusterName),
		Inspect:      newInspectClient(localCmd),
		CmdInterface: localCmd.Executor,
	}
}
