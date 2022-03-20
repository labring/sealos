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

package decode

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"path"

	"github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/logger"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/yaml"
)

func Cluster(filepath string) (clusters []v1beta1.Cluster, err error) {
	decodeClusters, err := decodeCRD(filepath, contants.Cluster)
	if err != nil {
		return nil, fmt.Errorf("failed to decode cluster from %s, %v", filepath, err)
	}
	clusters = decodeClusters.([]v1beta1.Cluster)
	return
}

func Resource(filepath string) (configs []v1beta1.Resource, err error) {
	decodePackage, err := decodeCRD(filepath, contants.Resource)
	if err != nil {
		return nil, fmt.Errorf("failed to decode package from %s, %v", filepath, err)
	}
	configs = decodePackage.([]v1beta1.Resource)
	return
}

func Configs(filepath string) (configs []v1beta1.Config, err error) {
	decodeConfigs, err := decodeCRD(filepath, contants.Config)
	if err != nil {
		return nil, fmt.Errorf("failed to decode config from %s, %v", filepath, err)
	}
	configs = decodeConfigs.([]v1beta1.Config)
	return
}

func decodeCRD(filepath string, kind string) (out interface{}, err error) {
	file, err := os.Open(path.Clean(filepath))
	if err != nil {
		return nil, fmt.Errorf("failed to dump config %v", err)
	}
	defer func() {
		if err := file.Close(); err != nil {
			logger.Warn("failed to dump config close clusterfile failed %v", err)
		}
	}()
	var (
		i         interface{}
		clusters  []v1beta1.Cluster
		configs   []v1beta1.Config
		resources []v1beta1.Resource
	)

	d := yaml.NewYAMLOrJSONDecoder(file, 4096)

	for {
		ext := runtime.RawExtension{}
		if err = d.Decode(&ext); err != nil {
			if err == io.EOF {
				break
			}
			return nil, err
		}
		// TODO: This needs to be able to handle object in other encodings and schemas.
		ext.Raw = bytes.TrimSpace(ext.Raw)
		if len(ext.Raw) == 0 || bytes.Equal(ext.Raw, []byte("null")) {
			continue
		}
		// ext.Raw
		switch kind {
		case contants.Cluster:
			cluster := v1beta1.Cluster{}
			err = yaml.Unmarshal(ext.Raw, &cluster)
			if err != nil {
				return nil, fmt.Errorf("decode cluster failed %v", err)
			}
			if cluster.Kind == contants.Cluster {
				clusters = append(clusters, cluster)
			}
			i = clusters
		case contants.Config:
			config := v1beta1.Config{}
			err = yaml.Unmarshal(ext.Raw, &config)
			if err != nil {
				return nil, fmt.Errorf("decode config failed %v", err)
			}
			if config.Kind == contants.Config {
				configs = append(configs, config)
			}
			i = configs
		case contants.Resource:
			p := v1beta1.Resource{}
			err = yaml.Unmarshal(ext.Raw, &p)
			if err != nil {
				return nil, fmt.Errorf("decode package failed %v", err)
			}
			if p.Kind == contants.Resource {
				resources = append(resources, p)
			}
			i = resources
		}
	}

	return i, nil
}
