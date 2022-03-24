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
	"path"

	"github.com/fanux/sealos/pkg/env"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/yaml"
)

func SaveClusterFile(cluster *v2.Cluster, configs []v2.Config, clusterfile string) (string, error) {
	data := make([]interface{}, 0)
	data = append(data, cluster)
	for _, c := range configs {
		data = append(data, c)
	}
	ya, err := yaml.MarshalYamlConfigs(data...)
	if err != nil {
		return "", err
	}
	if clusterfile != "" {
		err = file.WriteFile(clusterfile, ya)
		if err != nil {
			return "", err
		}
	}
	return string(ya), nil
}

func renderENV(mountDir string, ipList []string, p env.Interface) error {
	var (
		baseRawPath     = path.Join(mountDir, contants.DataDirName)
		renderEtc       = path.Join(baseRawPath, contants.EtcDirName)
		renderChart     = path.Join(baseRawPath, contants.ChartsDirName)
		renderManifests = path.Join(baseRawPath, contants.ManifestsDirName)
	)

	for _, ip := range ipList {
		for _, dir := range []string{renderEtc, renderChart, renderManifests} {
			if file.IsExist(dir) {
				err := p.RenderAll(ip, dir)
				if err != nil {
					return err
				}
			}
		}
	}
	return nil
}
