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

package clusterfile

import (
	"fmt"
	"os"
	"strings"

	"github.com/labring/sealos/pkg/constants"
	yaml2 "github.com/labring/sealos/pkg/utils/yaml"

	"github.com/labring/sealos/pkg/runtime"

	k8sV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/yaml"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

var ErrClusterNotExist = fmt.Errorf("no cluster exist")

func GetDefaultClusterName() (string, error) {
	files, err := os.ReadDir(constants.Workdir())
	if err != nil {
		return "", err
	}
	var clusters []string
	for _, f := range files {
		if f.IsDir() {
			clusters = append(clusters, f.Name())
		}
	}
	if len(clusters) == 1 {
		return clusters[0], nil
	} else if len(clusters) > 1 {
		return "", fmt.Errorf("Select a cluster through the -c parameter: " + strings.Join(clusters, ","))
	}

	return "", ErrClusterNotExist
}
func GetClusterFromName(clusterName string) (cluster *v2.Cluster, err error) {
	if clusterName == "" {
		clusterName, err = GetDefaultClusterName()
		if err != nil {
			return nil, err
		}
	}
	clusterFile := constants.Clusterfile(clusterName)
	cluster, err = GetClusterFromFile(clusterFile)
	return
}
func GetClusterFromFile(filepath string) (cluster *v2.Cluster, err error) {
	cluster = &v2.Cluster{}
	if err = yaml2.UnmarshalYamlFromFile(filepath, cluster); err != nil {
		return nil, fmt.Errorf("failed to get cluster from %s, %v", filepath, err)
	}
	return cluster, nil
}

func GetClusterFromDataCompatV1(data []byte) (*v2.Cluster, error) {
	var cluster *v2.Cluster
	metaType := k8sV1.TypeMeta{}
	err := yaml.Unmarshal(data, &metaType)
	if err != nil {
		return nil, err
	}
	if metaType.Kind != constants.Cluster {
		return nil, fmt.Errorf("not found type cluster from: \n%s", data)
	}
	c, err := runtime.DecodeCRDFromString(string(data), constants.Cluster)
	if err != nil {
		return nil, err
	} else if c == nil {
		return nil, fmt.Errorf("not found type cluster from: \n%s", data)
	}
	cluster = c.(*v2.Cluster)
	return cluster, nil
}
