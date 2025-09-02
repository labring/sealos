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
)

var _ FakeInterface = &fakeServiceCIDRClient{}

type fakeServiceCIDRClient struct {
	*fakeClient
	//10.96.0.0/22
	data string
}

func (f *fakeServiceCIDRClient) Verify() error {
	if f.ClusterConfiguration.Networking.ServiceSubnet != f.data {
		return fmt.Errorf("cluster config service subnet %s not match %s", f.ClusterConfiguration.Networking.ServiceSubnet, f.data)
	}
	return nil
}
