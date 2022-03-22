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
	"github.com/fanux/sealos/pkg/utils/collector"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/logger"
	"os"
	"path/filepath"
)

func (s *store) tarGz(p *v1beta1.Resource) error {
	newArchive := archive.NewArchive(true, true)

	tmpDir, err := file.MkTmpdir(contants.TmpPath())
	if err != nil {
		return err
	}

	err = collector.Download(p.Spec.Path, tmpDir)
	if err != nil {
		return err
	}

	tarFileAbs := filepath.Join(tmpDir, file.Filename(p.Spec.Path))
	tarFileAbsReadIO, err := os.Open(filepath.Clean(tarFileAbs))
	if err != nil {
		return err
	}
	defer func() {
		if err = tarFileAbsReadIO.Close(); err != nil {
			logger.Fatal("failed to close file")
		}
	}()

	_, err = newArchive.UnTarOrGzip(tarFileAbsReadIO, tmpDir)
	if err != nil {
		return err
	}
	err = file.CleanFiles(tarFileAbs)
	if err != nil {
		return err
	}
	return s.dir(p, tmpDir, true)
}
