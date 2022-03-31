/*
Copyright 2022 cuisongliu@qq.com.

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

package binary

import (
	"fmt"

	"github.com/fanux/sealos/pkg/image/types"

	"github.com/fanux/sealos/pkg/utils/exec"
)

type RegistryService struct {
}

func (*RegistryService) Login(domain, username, passwd string) error {
	return exec.CmdForPipe("bash", "-c", fmt.Sprintf("buildah login --username %s --password %s %s", username, passwd, domain))
}
func (*RegistryService) Logout(domain string) error {
	return exec.CmdForPipe("bash", "-c", fmt.Sprintf("buildah logout %s", domain))
}
func (*RegistryService) Pull(image string) error {
	return exec.CmdForPipe("bash", "-c", fmt.Sprintf("buildah pull %s", image))
}

func (*RegistryService) Push(image string) error {
	return exec.CmdForPipe("bash", "-c", fmt.Sprintf("buildah push %s", image))
}
func (*RegistryService) Sync(localDir, imageName string) error {
	panic("implement me")
}

func NewRegistryService() (types.RegistryService, error) {
	return &RegistryService{}, nil
}
