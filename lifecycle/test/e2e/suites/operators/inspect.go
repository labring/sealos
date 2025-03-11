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
	"fmt"

	"github.com/labring/sealos/test/e2e/testhelper/cmd"
)

type fakeInspectClient struct {
	*cmd.SealosCmd
}

func newInspectClient(sealosCmd *cmd.SealosCmd) FakeInspectInterface {
	return &fakeInspectClient{
		SealosCmd: sealosCmd,
	}
}

func (c *fakeInspectClient) LocalImage(name string) error {
	return c.SealosCmd.ImageInspect(name)
}

func (c *fakeInspectClient) RemoteImage(name string) error {
	return c.SealosCmd.ImageInspect(fmt.Sprintf("docker://%s", name))
}

func (c *fakeInspectClient) DockerArchiveImage(name string) error {
	return c.SealosCmd.ImageInspect(fmt.Sprintf("docker-archive://%s", name))
}

func (c *fakeInspectClient) OCIArchiveImage(name string) error {
	return c.SealosCmd.ImageInspect(fmt.Sprintf("oci-archive://%s", name))
}

func (c *fakeInspectClient) ImageID(id string) error {
	return c.SealosCmd.ImageInspect(id)
}
