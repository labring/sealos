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

package cert

import (
	"fmt"

	"github.com/labring/sealos/test/e2e/suites/cluster"

	"github.com/labring/sealos/test/e2e/testhelper/settings"

	"k8s.io/apimachinery/pkg/util/sets"
	"k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm"

	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/test/e2e/testhelper"
	"github.com/labring/sealos/test/e2e/testhelper/cmd"
)

// Interface defines the interface for executing commands
type Interface interface {
	Cert(domain string) error
	Verify(domain string) error
}

func NewCertClient() Interface {
	return &fakeCertClient{
		SealosCmd:  cmd.NewSealosCmd(settings.E2EConfig.SealosBinPath, &cmd.LocalCmd{}),
		cInterface: cluster.NewFakeClient(),
	}
}

type fakeCertClient struct {
	//cmd.Interface
	*cmd.SealosCmd
	cInterface cluster.Interface
	kubeadm.ClusterConfiguration
}

func (c *fakeCertClient) Cert(domain string) error {
	return c.SealosCmd.Cert(&cmd.CertOptions{
		Cluster: "",
		AltName: []string{domain},
	})
}

func (c *fakeCertClient) Verify(domain string) error {
	if err := c.cInterface.Verify(); err != nil {
		return err
	}
	logger.Info("verify cluster info")
	initFile := "/root/.sealos/default/etc/kubeadm-update.yaml"
	if !testhelper.IsFileExist(initFile) {
		return fmt.Errorf("file %s not exist", initFile)
	}
	if err := testhelper.UnmarshalYamlFile(initFile, c); err != nil {
		return err
	}

	if !sets.NewString(c.ClusterConfiguration.APIServer.CertSANs...).Has(domain) {
		return fmt.Errorf("cert SANs not match %s", domain)
	}
	return nil
}
