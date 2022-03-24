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

package filesystem

import (
	"github.com/fanux/sealos/pkg/filesystem/image"
	"github.com/fanux/sealos/pkg/filesystem/rootfs"
	img "github.com/fanux/sealos/pkg/image"
)

// NewImageMounter :mount and unmount cloud image.
func NewImageMounter() (image.Interface, error) {
	is, err := img.NewImageService()
	if err != nil {
		return nil, err
	}
	return image.NewBuildahImage(is)
}

// NewRootfsMounter :according to the Metadata file content to determine what kind of Filesystem will be load.
func NewRootfsMounter() (rootfs.Interface, error) {
	is, err := img.NewImageService()
	if err != nil {
		return nil, err
	}
	return rootfs.NewDefaultRootfs(is)
}
