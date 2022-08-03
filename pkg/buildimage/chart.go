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
	"io/ioutil"
	"regexp"
	"sort"
	"strings"

	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"

	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/chart/loader"
	"helm.sh/helm/v3/pkg/chartutil"
	"helm.sh/helm/v3/pkg/engine"
)

func ParseChartImages(chartPath string) ([]string, error) {
	logger.Info("charts srcPath:", chartPath)
	var allImages []string
	if !file.IsExist(chartPath) {
		logger.Info("charts srcPath is empty", chartPath)
		return nil, nil
	}
	subChartPaths, _ := getChartSub1Paths(chartPath)
	if len(subChartPaths) == 0 {
		return []string{}, nil // if chartPath not exist, return []
	}
	for _, subChartPath := range subChartPaths {
		logger.Info("charts subChartPath is:", subChartPath)
		c := Chart{
			Path: chartPath + "/" + subChartPath,
		}
		images, _ := c.GetImages()
		if len(images) >= 1 {
			allImages = append(allImages, images...)
		}
	}
	return allImages, nil
}

type Chart struct {
	File string
	Path string
}

// LoadFile loads from an archive file.
/*
func (c Chart) loadFile() (*chart.Chart, error) {
	ccc, err := loader.LoadFile(c.File)
	if err != nil {
		return nil, err
	}
	return ccc, nil
}*/

// LoadPath loads from a path.
func (c Chart) loadPath() (*chart.Chart, error) {
	ccc, err := loader.LoadDir(c.Path)
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

	options := chartutil.ReleaseOptions{
		Name: "dryrun",
	}
	valuesToRender, err := chartutil.ToRenderValues(ccc, nil, options, nil)
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
	var images []string
	var tmp string
	rrr := regexp.MustCompile(`\simage:`)

	delLF := func(a string) string {
		return strings.Replace(a, "\n", "", -1)
	}

	for _, v := range content {
		if delLF(v) == "" { // Text has no content
			continue
		}

		for _, s := range strings.Split(v, "\n") {
			if rrr.MatchString(s) {
				image := c.getImage(s)
				if image != tmp {
					images = append(images, image)
					tmp = image
				}
			}
		}
	}
	sort.Strings(images)
	return images, nil
}

func (c Chart) getImage(image string) string {
	blankReg := regexp.MustCompile(`[\s\p{Zs}]{1,}`)
	shaReg := regexp.MustCompile(`@.*$`)

	delBlank := func(a string) string {
		return blankReg.ReplaceAllString(a, "")
	}
	delImageSha := func(a string) string {
		return shaReg.ReplaceAllString(a, "")
	}
	// add del -image: and image:
	delImageReg := regexp.MustCompile(`-{0,1}image:`)
	delImage := func(str string) string {
		return delImageReg.ReplaceAllString(str, "")
	}

	return delImageSha(strings.Replace(delImage(delBlank(image)), "\"", "", -1))
}

// from charts dir get 1 sub path,not nested
func getChartSub1Paths(pp string) ([]string, error) {
	var paths []string
	dir, err := ioutil.ReadDir(pp)
	if err != nil {
		return nil, err
	}
	for _, d := range dir {
		if d.IsDir() {
			paths = append(paths, d.Name())
		}
	}
	return paths, nil
}
