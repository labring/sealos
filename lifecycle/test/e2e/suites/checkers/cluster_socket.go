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

var _ FakeInterface = &fakeSocketClient{}

type fakeSocketClient struct {
	*fakeClient
	data string
}

func (c *fakeSocketClient) Verify() error {
	ctlBin := fmt.Sprintf("/var/lib/sealos/data/%s/rootfs/opt/sealctl", c.clusterName)
	socket, err := c.cmd.Exec(ctlBin, "cri", "socket")
	if err != nil {
		return err
	}
	if strings.TrimSpace(string(socket)) != c.data {
		return fmt.Errorf("cri socket %s not match %s from sealctl", strings.TrimSpace(string(socket)), c.data)
	}

	if c.InitConfiguration.NodeRegistration.CRISocket != fmt.Sprintf("unix://%s", c.data) {
		return fmt.Errorf("init config cri socket %s not match %s", c.InitConfiguration.NodeRegistration.CRISocket, c.data)
	}
	return nil
}
