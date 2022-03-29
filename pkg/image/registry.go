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

package image

import (
	"fmt"

	"github.com/fanux/sealos/pkg/utils/exec"
)

type defaultRegistryService struct {
}

func (*defaultRegistryService) Login(domain, username, passwd string) error {
	panic("implement me")
}
func (*defaultRegistryService) Logout(domain, username string) error {
	panic("implement me")
}
func (*defaultRegistryService) Pull(image string) error {
	return exec.CmdForPipe("bash", "-c", fmt.Sprintf("buildah pull %s", image))
}

func (*defaultRegistryService) Push(image string) error {
	panic("implement me")
}
func (*defaultRegistryService) Sync(localDir, imageName string) error {
	panic("implement me")
}

func NewDefaultRegistryService() (RegistryService, error) {
	return &defaultRegistryService{}, nil
}
