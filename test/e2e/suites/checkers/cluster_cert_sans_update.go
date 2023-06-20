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

	"k8s.io/apimachinery/pkg/util/sets"
)

var _ FakeInterface = &fakeCertSansUpdateClient{}

type fakeCertSansUpdateClient struct {
	*fakeClient
	data string
}

func (f *fakeCertSansUpdateClient) Verify() error {
	if f.UpdateConfiguration == nil {
		return nil
	}
	if f.data != "" {
		if !sets.NewString(f.UpdateConfiguration.ClusterConfiguration.APIServer.CertSANs...).Has(f.data) {
			return fmt.Errorf("cert SANs not match %s", f.data)
		}
	}
	return nil
}
