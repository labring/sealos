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

package store

import (
	"fmt"
	"github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/file"
	jlib "github.com/fanux/sealos/pkg/utils/json"
	"github.com/fanux/sealos/pkg/utils/toml"
	"github.com/fanux/sealos/pkg/utils/yaml"
	"github.com/pkg/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/util/json"
	"path"

	"path/filepath"
)

func (s *store) saveMetadata(p *v1beta1.Resource, md5Dir string) error {
	metadata, err := jlib.Unmarshal(filepath.Join(md5Dir, contants.DataDirName, contants.MetadataFile))
	if err != nil {
		return err
	}
	p.CreationTimestamp = v1.Now()
	if version, ok, _ := unstructured.NestedString(metadata, "version"); ok {
		p.Status.Version = fmt.Sprintf("%+v", version)
	} else {
		p.Status.Version = v1beta1.DefaultVersion
	}

	if arch, ok, _ := unstructured.NestedString(metadata, "arch"); ok {
		p.Status.Arch = v1beta1.Arch(fmt.Sprintf("%+v", arch))
	} else {
		p.Status.Arch = v1beta1.AMD64
	}

	if image, ok, _ := unstructured.NestedString(metadata, "image"); ok {
		p.Status.Image = image
	} else {
		p.Status.Image = contants.DefaultLvsCareImage
	}

	defaultPath := filepath.Join(md5Dir, contants.DataDirName, "scripts", "default.json")
	if file.IsExist(defaultPath) {
		var defaultData []byte
		defaultData, err = file.ReadAll(defaultPath)
		if err != nil {
			return err
		}
		var data map[string]string
		err = json.Unmarshal(defaultData, &data)
		if err != nil {
			return err
		}
		if data != nil {
			p.Status.Data = data
		}
	}
	return nil
}

func (s *store) saveResourceFiles(p *v1beta1.Resource) error {
	c := &config{}
	tomlFile := path.Join(contants.ResourceMetaPath(), defaultMetadataFileName)
	if file.IsExist(contants.ResourceMetaPath()) {
		err := file.Mkdir(contants.ResourceMetaPath())
		if err != nil {
			return errors.Wrap(err, "create metadata dir failed")
		}
	}
	if file.IsExist(tomlFile) {
		err := toml.UnmarshalTomlFromFile(tomlFile, c)
		if err != nil {
			return errors.Wrap(err, "read metadata file toml failed")
		}
	}

	if c.Version == "" {
		c.Version = "v1"
	}
	if c.Resources == nil {
		c.Resources = make(map[string]string)
	}

	yamlPath := fmt.Sprintf("%s.%s", p.Name, contants.YamlFileSuffix)

	c.Resources[p.Spec.Path] = yamlPath

	err := yaml.MarshalYamlToFile(path.Join(contants.ResourceMetaPath(), yamlPath), p)
	if err != nil {
		return errors.Wrap(err, "save resource file yaml failed")
	}
	err = toml.MarshalTomlToFile(tomlFile, c)
	if err != nil {
		return errors.Wrap(err, "save metadata file toml failed")
	}
	return nil
}
