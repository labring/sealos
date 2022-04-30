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
	"github.com/labring/sealos/pkg/utils/exec"
	fileutil "github.com/labring/sealos/pkg/utils/file"
	"github.com/pkg/errors"
)

func checkBuildah() error {
	_, ok := exec.CheckCmdIsExist("buildah")
	if ok {
		if err := buildahPolicySync(); err != nil {
			return err
		}
		return buildahStorageSync()
	}
	return errors.New("buildah not found in host")
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
