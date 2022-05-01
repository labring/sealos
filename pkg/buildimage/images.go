// Copyright © 2021 Alibaba Group Holding Ltd.
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

package buildimage

import (
	"io/fs"
	"path/filepath"
	"strings"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/pkg/errors"

	"github.com/labring/sealos/pkg/buildimage/manifests"
	"github.com/labring/sealos/pkg/utils/file"
	strings2 "github.com/labring/sealos/pkg/utils/strings"
	"github.com/labring/sealos/pkg/utils/yaml"
)

func ParseYamlImages(srcPath string) ([]string, error) {
	if !file.IsExist(srcPath) {
		logger.Info("srcPath is empty", srcPath)
		return nil, nil
	}
	var images []string

	imageSearcher, err := manifests.NewManifests()
	if err != nil {
		return nil, err
	}

	err = filepath.Walk(srcPath, func(path string, f fs.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if f.IsDir() || !yaml.Matcher(f.Name()) {
			return nil
		}
		ima, err := imageSearcher.ListImages(path)

		if err != nil {
			return err
		}
		images = append(images, ima...)
		return nil
	})

	if err != nil {
		return nil, err
	}
	return FormatImages(images), nil
}

func FormatImages(images []string) (res []string) {
	for _, ima := range strings2.RemoveDuplicate(images) {
		if ima == "" {
			continue
		}
		if strings.HasPrefix(ima, "#") {
			continue
		}
		res = append(res, trimQuotes(strings.TrimSpace(ima)))
	}
	return
}

func trimQuotes(s string) string {
	if len(s) >= 2 {
		if c := s[len(s)-1]; s[0] == c && (c == '"' || c == '\'') {
			return s[1 : len(s)-1]
		}
	}
	return s
}

func LoadImages(imageDir string) ([]string, error) {
	var imageList []string
	if imageDir != "" && file.IsExist(imageDir) {
		paths, err := file.GetFiles(imageDir)
		if err != nil {
			return nil, errors.Wrap(err, "load image list files error")
		}
		for _, p := range paths {
			images, err := file.ReadLines(p)
			if err != nil {
				return nil, errors.Wrap(err, "load image list error")
			}
			imageList = append(imageList, images...)
		}
	}
	imageList = FormatImages(imageList)
	return imageList, nil
}
