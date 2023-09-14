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

import "fmt"

var _ FakeInterface = &fakeEtcdClient{}

type fakeEtcdClient struct {
	*fakeClient
	etcd []string
}

func (f *fakeEtcdClient) Verify() error {
	err := f.cmd.AsyncExec("kubectl", "get", "pods", "-A", "--kubeconfig", "/etc/kubernetes/admin.conf")
	if err != nil {
		return err
	}
	if len(f.etcd) == 0 {
		if f.ClusterConfiguration.Etcd.Local == nil {
			return fmt.Errorf("etcd is empty when local etcd")
		}
	} else {
		if f.ClusterConfiguration.Etcd.External == nil {
			return fmt.Errorf("etcd is empty when external etcd")
		}
		if len(f.ClusterConfiguration.Etcd.External.Endpoints) != len(f.etcd) {
			return fmt.Errorf("etcd endpoints not match, expect %v, got %v", f.etcd, f.ClusterConfiguration.Etcd.External.Endpoints)
		}
		for i, v := range f.ClusterConfiguration.Etcd.External.Endpoints {
			if v != f.etcd[i] {
				return fmt.Errorf("etcd endpoints not match, expect %v, got %v", f.etcd, f.ClusterConfiguration.Etcd.External.Endpoints)
			}
		}
	}
	return nil
}
