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
	"fmt"
	"io/ioutil"
	"path/filepath"

	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"k8s.io/apimachinery/pkg/util/yaml"
)

func LoadClusterFile(path string) (*v2.Cluster, error) {
	var cluster v2.Cluster
	rawClusterFile, err := ioutil.ReadFile(filepath.Clean(path))
	if err != nil {
		return nil, err
	}
	if len(rawClusterFile) == 0 {
		return nil, fmt.Errorf("ClusterFile content is empty")
	}

	if err = yaml.Unmarshal(rawClusterFile, &cluster); err != nil {
		return nil, err
	}

	return &cluster, nil
}
