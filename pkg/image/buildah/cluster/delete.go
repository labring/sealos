/*
Copyright 2022 sealos.

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

package cluster

import (
	bb "github.com/labring/sealos/pkg/image/buildah/cluster/buildah"

	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/pkg/errors"
)

func (c *Service) Delete(name string) error {
	infos, err := c.List()
	if err != nil {
		return errors.Wrapf(err, "delete get containers")
	}
	logger.Debug("current container names is: %v", name)
	for _, info := range infos {
		if info.Containername == name {
			// umount
			err := bb.UMount(name)
			if err != nil {
				return errors.Wrapf(err, "when delete container unmount fail")
			}
			// rm
			err = bb.RM(name)
			if err != nil {
				return errors.Wrapf(err, "when delete container rm fail")
			}
		}
	}
	return nil
}
