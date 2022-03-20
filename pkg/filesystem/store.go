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
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/yaml"
)

func SaveClusterFile(cluster *v2.Cluster, configs []v2.Config, resource *v2.Resource, clusterfile string) (string, error) {
	data := make([]interface{}, 0)
	data = append(data, cluster)
	for _, c := range configs {
		data = append(data, c)
	}
	data = append(data, resource)
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
