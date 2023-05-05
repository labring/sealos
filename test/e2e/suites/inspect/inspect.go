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

package inspect

import (
	"fmt"

	"github.com/labring/sealos/test/e2e/testhelper/settings"

	"github.com/labring/sealos/test/e2e/testhelper/cmd"
)

type Interface interface {
	LocalImage(name string) error
	RemoteImage(name string) error
	DockerArchiveImage(name string) error
	OCIArchiveImage(name string) error
	ImageID(id string) error
}

type fakeClient struct {
	*cmd.SealosCmd
}

func NewInspectClient() Interface {
	return &fakeClient{
		SealosCmd: cmd.NewSealosCmd(settings.E2EConfig.SealosBinPath, &cmd.LocalCmd{}),
	}
}

func (c *fakeClient) LocalImage(name string) error {
	return c.SealosCmd.ImageInspect(name)
}

func (c *fakeClient) RemoteImage(name string) error {
	return c.SealosCmd.ImageInspect(fmt.Sprintf("docker://%s", name))
}

func (c *fakeClient) DockerArchiveImage(name string) error {
	return c.SealosCmd.ImageInspect(fmt.Sprintf("docker-archive://%s", name))
}

func (c *fakeClient) OCIArchiveImage(name string) error {
	return c.SealosCmd.ImageInspect(fmt.Sprintf("oci-archive://%s", name))
}

func (c *fakeClient) ImageID(id string) error {
	return c.SealosCmd.ImageInspect(id)
}
