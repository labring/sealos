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
	"github.com/pkg/errors"

	"github.com/labring/sealos/pkg/utils/exec"
	fileutil "github.com/labring/sealos/pkg/utils/file"
)

func initBuildah() (bool, error) {
	err := buildahPolicySync()
	if err != nil {
		return false, errors.New("create policy.json failed")
	}
	err = buildahStorageSync()
	if err != nil {
		return false, errors.New("create storage config failed")
	}
	err = buildahRegistrySync()
	if err != nil {
		return false, errors.New("create registry config failed")
	}
	_, ok := exec.CheckCmdIsExist("buildah")
	return ok, nil
}

func buildahPolicySync() error {
	policyJSONPath := "/etc/containers/policy.json"
	data := `{
    "default": [
	{
	    "type": "insecureAcceptAnything"
	}
    ],
    "transports":
	{
	    "docker-daemon":
		{
		    "": [{"type":"insecureAcceptAnything"}]
		}
	}
}`
	if !fileutil.IsExist(policyJSONPath) {
		return fileutil.WriteFile(policyJSONPath, []byte(data))
	}
	return nil
}

func buildahStorageSync() error {
	storagePath := "/var/lib/containers/storage"
	if err := fileutil.MkDirs(storagePath); err != nil {
		return errors.Wrap(err, "mkdir buildah storage failed")
	}
	data := `[storage]
# Default Storage Driver, Must be set for proper operation.
driver = "overlay"
# Temporary storage location
runroot = "/run/containers/storage"
# Primary Read/Write location of container storage
# When changing the graphroot location on an SELINUX system, you must
# ensure  the labeling matches the default locations labels with the
# following commands:
# semanage fcontext -a -e /var/lib/containers/storage /NEWSTORAGEPATH
# restorecon -R -v /NEWSTORAGEPATH
graphroot = "/var/lib/containers/storage"`
	storageEtcPath := "/etc/containers/storage.conf"
	if !fileutil.IsExist(storageEtcPath) {
		return fileutil.WriteFile(storageEtcPath, []byte(data))
	}
	return nil
}

func buildahRegistrySync() error {
	registryPath := "/etc/containers/registries.conf"
	data := `unqualified-search-registries = ["docker.io"]

[[registry]]
prefix = "docker.io/labring"
location = "docker.io/labring"
`
	if !fileutil.IsExist(registryPath) {
		return fileutil.WriteFile(registryPath, []byte(data))
	}
	return nil
}
