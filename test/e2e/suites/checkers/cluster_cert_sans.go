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

package checkers

import (
	"fmt"

	"github.com/labring/sealos/test/e2e/testhelper/utils"

	"k8s.io/apimachinery/pkg/util/sets"
)

var _ FakeInterface = &fakeCertSansClient{}

type fakeCertSansClient struct {
	*fakeClient
	data string
}

func (f *fakeCertSansClient) Verify() error {
	if !sets.NewString(f.ClusterConfiguration.APIServer.CertSANs...).Has("127.0.0.1") {
		return fmt.Errorf("cert SANs not match %s", "127.0.0.1")
	}
	if !sets.NewString(f.ClusterConfiguration.APIServer.CertSANs...).Has("apiserver.cluster.local") {
		return fmt.Errorf("cert SANs not match %s", "apiserver.cluster.local")
	}
	if !sets.NewString(f.ClusterConfiguration.APIServer.CertSANs...).Has("10.103.97.2") {
		return fmt.Errorf("cert SANs not match %s", "10.103.97.2")
	}
	localIP := utils.GetLocalIpv4()
	if !sets.NewString(f.ClusterConfiguration.APIServer.CertSANs...).Has(localIP) {
		return fmt.Errorf("cert SANs not match %s", localIP)
	}
	if f.data != "" {
		if !sets.NewString(f.ClusterConfiguration.APIServer.CertSANs...).Has(f.data) {
			return fmt.Errorf("cert SANs not match %s", f.data)
		}
	}
	return nil
}
