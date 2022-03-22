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

package store

import (
	"github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/archive"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/logger"
	"path"
)

func (s *store) dir(p *v1beta1.Resource,src string,clean bool) error {
	if clean{
		defer func() {
			if err := file.CleanFiles(src); err != nil {
				logger.Warn("failed to clean file: %s", err.Error())
			}
		}()
	}
	oldPath:=p.Status.Path
	if oldPath!=""{
		defer func() {
			if err := file.CleanFiles(oldPath); err != nil {
				logger.Warn("failed to clean file: %s", err.Error())
			}
		}()
	}
	arch := archive.NewArchive(false, false)
	digest, _, err := arch.Digest(src)
	if err != nil {
		return err
	}
	digestDir := path.Join(contants.ResourcePath(), digest.String())
	err = file.RecursionCopy(src, digestDir)
	if err != nil {
		return err
	}
	err = s.saveMetadata(p, digestDir)
	if err != nil {
		return err
	}

	size,err:=file.GetFilesSize([]string{digestDir})
	if err != nil {
		return err
	}

	p.Status.Path = digestDir
	p.Status.Id = digest.String()
	p.Status.Size =size

	return s.saveResourceFiles(p)
}
