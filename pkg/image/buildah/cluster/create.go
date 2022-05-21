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
	"github.com/labring/sealos/pkg/image/types"
	"github.com/pkg/errors"
)

func (c *ClusterService) Create(name string, image string) (*types.ClusterManifest, error) {
	// delete
	err := c.Delete(name)
	if err != nil {
		return nil, errors.Wrapf(err, "create delete container fail")
	}
	// from
	err = bb.From(name, image)
	if err != nil {
		return nil, errors.Wrapf(err, "create from fail")
	}
	// mount
	err = bb.Mount(name)
	if err != nil {
		return nil, errors.Wrapf(err, "create mount fail")
	}

	return c.Inspect(name)
}
