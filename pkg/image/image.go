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
	"errors"

	"github.com/fanux/sealos/pkg/image/binary"
	"github.com/fanux/sealos/pkg/image/types"
	"github.com/fanux/sealos/pkg/utils/exec"
)

func NewClusterService() (types.ClusterService, error) {
	if ok := checkBuildah(); ok {
		return binary.NewClusterService()
	}
	return nil, errors.New("not fount cluster runtime")
}

func NewRegistryService() (types.RegistryService, error) {
	if ok := checkBuildah(); ok {
		return binary.NewRegistryService()
	}
	return nil, errors.New("not fount registry runtime")
}

func NewImageService() (types.Service, error) {
	if ok := checkBuildah(); ok {
		return binary.NewImageService()
	}
	return nil, errors.New("not fount image runtime")
}

func checkBuildah() bool {
	_, ok := exec.CheckCmdIsExist("buildah")
	return ok
}
