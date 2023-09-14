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
	"strings"
)

var _ FakeInterface = &fakeCgroupClient{}

type fakeCgroupClient struct {
	*fakeClient
	data string
}

func (f *fakeCgroupClient) Verify() error {
	ctlBin := fmt.Sprintf("/var/lib/sealos/data/%s/rootfs/opt/sealctl", f.clusterName)
	cgroup, err := f.cmd.Exec(ctlBin, "cri", "cgroup-driver", "--short")
	if err != nil {
		return err
	}
	if strings.TrimSpace(string(cgroup)) != f.data {
		return fmt.Errorf("cgroup driver %s not match %s from sealctl", strings.TrimSpace(string(cgroup)), f.data)
	}

	if f.KubeletConfiguration.CgroupDriver != f.data {
		return fmt.Errorf("kubelet config cgroup driver %s not match %s", f.KubeletConfiguration.CgroupDriver, f.data)
	}

	return nil
}
