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
	"path"
	"path/filepath"
	"strings"

	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/util/sets"

	"github.com/labring/sealos/pkg/buildimage/manifests"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	strutil "github.com/labring/sealos/pkg/utils/strings"
	"github.com/labring/sealos/pkg/utils/tmpl"
	"github.com/labring/sealos/pkg/utils/yaml"
)

func ParseYamlImages(dir string) ([]string, error) {
	if !file.IsExist(dir) {
		logger.Debug("path %s is not exists", dir)
		return nil, nil
	}
	list := sets.NewString()
	imageSearcher, err := manifests.NewManifests()
	if err != nil {
		return nil, err
	}

	err = filepath.Walk(dir, func(path string, f fs.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if f.IsDir() || (!yaml.Matcher(f.Name()) && !tmpl.Matcher(f.Name())) {
			return nil
		}
		ima, err := imageSearcher.ListImages(path)
		if err != nil {
			return err
		}
		list = list.Insert(ima...)
		return nil
	})

	if err != nil {
		return nil, err
	}
	return formalizeImages(list.List()), nil
}

func formalizeImages(images []string) (res []string) {
	for i := range images {
		img := strings.TrimSpace(images[i])
		if img == "" || strings.HasPrefix(img, "#") {
			continue
		}
		res = append(res, strutil.TrimQuotes(img))
	}
	return
}

func ParseShimImages(dir string) ([]string, error) {
	if dir == "" || !file.IsExist(dir) {
		return nil, nil
	}
	list := sets.NewString()
	paths, err := file.GetFiles(dir)
	if err != nil {
		return nil, errors.Wrap(err, "load image list files error")
	}
	for _, p := range paths {
		images, err := file.ReadLines(p)
		if err != nil {
			return nil, errors.Wrap(err, "load image list error")
		}
		list = list.Insert(images...)
	}
	imageList := formalizeImages(list.List())
	return imageList, nil
}

func List(dir string) ([]string, error) {
	wrapGetImageErr := func(err error, s string) error {
		return errors.Wrapf(err, "failed to get images in %s", s)
	}
	chrtDir := path.Join(dir, constants.ChartsDirName)
	chrtImgs, err := ParseChartImages(chrtDir)
	if err != nil {
		return nil, wrapGetImageErr(err, chrtDir)
	}

	yamlDir := path.Join(dir, constants.ManifestsDirName)
	yamlImgs, err := ParseYamlImages(yamlDir)
	if err != nil {
		return nil, wrapGetImageErr(err, yamlDir)
	}

	shimDir := path.Join(dir, constants.ImagesDirName, constants.ImageShimDirName)
	shimImgs, err := ParseShimImages(shimDir)
	if err != nil {
		return nil, wrapGetImageErr(err, shimDir)
	}
	list := sets.NewString(chrtImgs...)
	list = list.Insert(yamlImgs...)
	list = list.Insert(shimImgs...)
	return list.List(), nil
}
