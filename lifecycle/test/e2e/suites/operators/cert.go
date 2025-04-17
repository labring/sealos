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
)

func newCertClient(sealosCmd *cmd.SealosCmd, clusterName string) FakeCertInterface {
	return &fakeCertClient{
		SealosCmd:   sealosCmd,
		clusterName: clusterName,
	}
}

var _ FakeCertInterface = &fakeCertClient{}

type fakeCertClient struct {
	//cmd.Interface
	*cmd.SealosCmd
	clusterName string
}

func (c *fakeCertClient) AddDomain(domain string) error {
	return c.SealosCmd.Cert(&cmd.CertOptions{
		Cluster: c.clusterName,
		AltName: []string{domain},
	})
}
