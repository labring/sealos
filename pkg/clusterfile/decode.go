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
	"bytes"
	"fmt"
	"io"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/yaml"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/types/v1beta1"
	fileutil "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
)

func Cluster(filepath string) (clusters []v1beta1.Cluster, err error) {
	decodeClusters, err := decodeCRD(filepath, constants.Cluster)
	if err != nil {
		return nil, fmt.Errorf("failed to decode cluster from %s, %v", filepath, err)
	}
	clusters = decodeClusters.([]v1beta1.Cluster)
	return
}

func Configs(filepath string) (configs []v1beta1.Config, err error) {
	decodeConfigs, err := decodeCRD(filepath, constants.Config)
	if err != nil {
		return nil, fmt.Errorf("failed to decode config from %s, %v", filepath, err)
	}
	configs = decodeConfigs.([]v1beta1.Config)
	return
}

func decodeCRD(filepath string, kind string) (out interface{}, err error) {
	data, err := fileutil.ReadAll(filepath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file %v", err)
	}

	return CRDForBytes(data, kind)
}

func CRDForBytes(data []byte, kind string) (out interface{}, err error) {
	keyFunc := func(v interface{}) string {
		if acc, ok := v.(metav1.ObjectMetaAccessor); ok {
			return fmt.Sprintf("%s/%s", kind, acc.GetObjectMeta().GetName())
		}
		return fmt.Sprintf("%s/unknown", kind)
	}

	var (
		clusters []v1beta1.Cluster
		configs  []v1beta1.Config
		tmp      = make(map[string]int)
	)
	r := bytes.NewReader(data)
	d := yaml.NewYAMLOrJSONDecoder(r, 4096)

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
		typeMeta := runtime.TypeMeta{}
		if err := yaml.Unmarshal(ext.Raw, &typeMeta); err != nil {
			return nil, err
		}
		if typeMeta.Kind != kind {
			continue
		}
		// ext.Raw
		switch kind {
		case constants.Cluster:
			cluster := v1beta1.Cluster{}
			err = yaml.Unmarshal(ext.Raw, &cluster)
			if err != nil {
				return nil, fmt.Errorf("decode cluster failed %v", err)
			}
			k := keyFunc(&cluster)
			if idx, ok := tmp[k]; !ok {
				tmp[k] = len(tmp)
				clusters = append(clusters, cluster)
			} else {
				logger.Warn("duplicate resource: %s, replace with new one", k)
				clusters[idx] = cluster
			}
			out = clusters
		case constants.Config:
			config := v1beta1.Config{}
			err = yaml.Unmarshal(ext.Raw, &config)
			if err != nil {
				return nil, fmt.Errorf("decode config failed %v", err)
			}
			k := keyFunc(&config)
			if idx, ok := tmp[k]; !ok {
				tmp[k] = len(tmp)
				configs = append(configs, config)
			} else {
				logger.Warn("duplicate resource: %s, replace with new one", k)
				configs[idx] = config
			}
			out = configs
		}
	}
	return out, nil
}
