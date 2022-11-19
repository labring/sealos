// Copyright © 2022 sealos.
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
	"fmt"
	"os"
	"path"
	"strings"

	"github.com/labring/sealos/pkg/buildimage/manifests"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/yaml"

	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/chart/loader"
	"helm.sh/helm/v3/pkg/chartutil"
	"helm.sh/helm/v3/pkg/engine"
	"k8s.io/apimachinery/pkg/util/sets"
)

func ParseChartImages(chartPath string) ([]string, error) {
	logger.Info("lookup in path", chartPath)

	if !file.IsExist(chartPath) {
		logger.Info("path %s is not exists, skip", chartPath)
		return nil, nil
	}
	subChartPaths, _ := getChartSub1Paths(chartPath)
	if len(subChartPaths) == 0 {
		return []string{}, nil // if chartPath not exist, return []
	}
	allImages := sets.NewString()
	for _, subChartPath := range subChartPaths {
		logger.Info("sub chart is", subChartPath)
		c := Chart{
			Path: chartPath + "/" + subChartPath,
		}
		images, err := c.GetImages()
		if err != nil {
			return nil, err
		}
		if len(images) > 0 {
			allImages = allImages.Insert(images...)
		}
	}
	return allImages.List(), nil
}

type Chart struct {
	File string
	Path string
}

// LoadPath loads from a path.
func (c Chart) loadPath() (*chart.Chart, error) {
	logger.Debug("trying to load chart %s", c.Path)
	ccc, err := loader.Load(c.Path)
	if err != nil {
		return nil, err
	}
	return ccc, nil
}

// return {filename:content,...}
func (c Chart) getRenderContent() (map[string]string, error) {
	ccc, err := c.loadPath()
	if err != nil {
		return nil, err
	}

	// todo: remove hardcode
	valuesFile := path.Join(path.Dir(c.Path), fmt.Sprintf("%s.values.yaml", ccc.Metadata.Name))
	values := make(map[string]interface{})
	if file.IsExist(valuesFile) {
		logger.Debug("found named customize values file %s", valuesFile)
		if err = yaml.UnmarshalYamlFromFile(valuesFile, &values); err != nil {
			return nil, err
		}
	}
	if err := chartutil.ProcessDependencies(ccc, values); err != nil {
		return nil, err
	}

	options := chartutil.ReleaseOptions{
		Name: "dryrun",
	}
	valuesToRender, err := chartutil.ToRenderValues(ccc, values, options, nil)
	if err != nil {
		return nil, err
	}
	content, err := engine.Render(ccc, valuesToRender)
	if err != nil {
		return nil, err
	}
	return content, nil
}

func (c Chart) GetImages() ([]string, error) {
	content, err := c.getRenderContent()
	if err != nil {
		return nil, err
	}
	list := sets.NewString()
	delLF := func(a string) string {
		return strings.Replace(a, "\n", "", -1)
	}

	for _, v := range content {
		if delLF(v) == "" { // Text has no content
			continue
		}
		images, err := manifests.ParseImages(v)
		if err != nil {
			return images, err
		}
		list = list.Insert(images...)
	}
	return list.List(), nil
}

// from charts dir get 1 sub path,not nested
func getChartSub1Paths(pp string) ([]string, error) {
	var paths []string
	dir, err := os.ReadDir(pp)
	if err != nil {
		return nil, err
	}
	for _, d := range dir {
		if d.IsDir() || strings.HasSuffix(d.Name(), "tgz") {
			paths = append(paths, d.Name())
		}
	}
	return paths, nil
}
