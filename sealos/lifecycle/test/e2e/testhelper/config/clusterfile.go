/*
Copyright 2023 cuisongliu@qq.com.

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

package config

import (
	"os"
	"strings"

	"github.com/labring/sealos/test/e2e/testdata/kubeadm"

	"github.com/labring/sealos/test/e2e/testhelper/utils"

	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/util/yaml"

	"github.com/labring/sealos/pkg/types/v1beta1"
)

type Clusterfile struct {
	Cluster  *v1beta1.Cluster
	BinData  string
	Replaces map[string]string
}

func (c *Clusterfile) Write() (string, error) {
	tmpdir, err := utils.MkTmpdir("")
	if err != nil {
		return "", errors.WithMessage(err, "create tmpdir failed")
	}
	clusterfile, err := kubeadm.Asset(c.BinData)
	if err != nil {
		return "", errors.WithMessage(err, "read clusterfile failed")
	}
	replaceClusterfile := string(clusterfile)
	for k, v := range c.Replaces {
		replaceClusterfile = strings.ReplaceAll(replaceClusterfile, k, v)
	}
	if err = os.WriteFile(tmpdir+"/Clusterfile", []byte(replaceClusterfile), 0644); err != nil {
		return "", errors.WithMessage(err, "write clusterfile failed")
	}
	yamls := utils.ToYalms(replaceClusterfile)
	for _, yamlString := range yamls {
		obj, _ := utils.UnmarshalData([]byte(yamlString))
		kind, _, _ := unstructured.NestedString(obj, "kind")
		switch kind {
		case "Cluster":
			err = yaml.Unmarshal([]byte(yamlString), &c.Cluster)
			if err != nil {
				return "", errors.WithMessage(err, "unmarshal cluster failed")
			}
		}
	}
	return tmpdir + "/Clusterfile", nil
}
