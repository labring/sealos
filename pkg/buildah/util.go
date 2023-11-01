// Copyright © 2023 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package buildah

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/containers/common/libimage"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/template"
	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/pkg/utils/file"
)

const templateSuffix = ".tmpl"

func PreloadIfTarFile(images []string, transport string) ([]string, error) {
	r, err := getRuntime(nil)
	if err != nil {
		return nil, err
	}
	var ret []string
	for i := range images {
		if file.IsTarFile(images[i]) {
			ref := FormatReferenceWithTransportName(transport, images[i])
			names, err := r.PullOrLoadImages(getContext(), []string{ref}, libimage.CopyOptions{})
			if err != nil {
				return nil, err
			}
			ret = append(ret, names...)
		} else {
			ret = append(ret, images[i])
		}
	}
	return ret, nil
}

func RenderTemplatesWithEnv(filePaths string, envs map[string]string) error {
	var (
		renderEtc       = filepath.Join(filePaths, constants.EtcDirName)
		renderScripts   = filepath.Join(filePaths, constants.ScriptsDirName)
		renderManifests = filepath.Join(filePaths, constants.ManifestsDirName)
	)

	for _, dir := range []string{renderEtc, renderScripts, renderManifests} {
		logger.Debug("render env dir: %s", dir)
		if !file.IsExist(dir) {
			logger.Debug("Directory %s does not exist, skipping", dir)
			continue
		}

		if err := filepath.Walk(dir, func(path string, info os.FileInfo, errIn error) error {
			if errIn != nil {
				return errIn
			}
			if info.IsDir() || !strings.HasSuffix(info.Name(), templateSuffix) {
				return nil
			}

			fileName := strings.TrimSuffix(path, templateSuffix)
			if file.IsExist(fileName) {
				if err := os.Remove(fileName); err != nil {
					logger.Warn("failed to remove existing file [%s]: %v", fileName, err)
				}
			}

			writer, err := os.OpenFile(fileName, os.O_CREATE|os.O_RDWR, os.ModePerm)
			if err != nil {
				return fmt.Errorf("failed to open file [%s] for rendering: %v", path, err)
			}
			defer writer.Close()

			body, err := file.ReadAll(path)
			if err != nil {
				return err
			}

			t, isOk, err := template.TryParse(string(body))
			if isOk {
				if err != nil {
					return fmt.Errorf("failed to create template: %s %v", path, err)
				}
				if err := t.Execute(writer, envs); err != nil {
					return fmt.Errorf("failed to render env template: %s %v", path, err)
				}
			} else {
				return errors.New("parse template failed")
			}

			return nil
		}); err != nil {
			return fmt.Errorf("failed to render templates in directory %s: %v", dir, err)
		}
	}

	return nil
}
