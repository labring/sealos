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

package yaml

import (
	"bufio"
	"bytes"
	"io"
	"path/filepath"
	"strings"

	fileutil "github.com/labring/sealos/pkg/utils/file"

	"k8s.io/apimachinery/pkg/runtime"
	utilyaml "k8s.io/apimachinery/pkg/util/yaml"
	"sigs.k8s.io/yaml"
)

func Unmarshal(path string) (map[string]interface{}, error) {
	metadata, err := fileutil.ReadAll(path)
	if err != nil {
		return nil, err
	}
	var data map[string]interface{}
	err = yaml.Unmarshal(metadata, &data)
	if err != nil {
		return nil, err
	}
	return data, nil
}

func UnmarshalData(metadata []byte) (map[string]interface{}, error) {
	var data map[string]interface{}
	err := yaml.Unmarshal(metadata, &data)
	if err != nil {
		return nil, err
	}
	return data, nil
}

func ToJSON(bs []byte) (jsons []string) {
	reader := bytes.NewReader(bs)
	ext := runtime.RawExtension{}
	d := utilyaml.NewYAMLOrJSONDecoder(reader, 4096)
	for {
		if err := d.Decode(&ext); err != nil {
			if err == io.EOF {
				break
			}
			break
		}
		jsons = append(jsons, string(ext.Raw))
	}
	return
}

func ToYalms(bs string) (yamls []string) {
	buf := bytes.NewBuffer([]byte(bs))
	reader := utilyaml.NewYAMLReader(bufio.NewReader(buf))
	for {
		patch, err := reader.Read()
		if err != nil {
			if err == io.EOF {
				break
			}
			break
		}
		patch = bytes.TrimSpace(patch)
		if len(patch) == 0 {
			continue
		}
		yamls = append(yamls, string(patch))
	}
	return
}

func MarshalYamlToFile(file string, obj ...interface{}) error {
	data, err := MarshalYamlConfigs(obj...)
	if err != nil {
		return err
	}
	return fileutil.WriteFile(file, data)
}

func UnmarshalYamlFromFile(file string, obj interface{}) error {
	metadata, err := fileutil.ReadAll(file)
	if err != nil {
		return err
	}
	err = yaml.Unmarshal(metadata, obj)
	if err != nil {
		return err
	}
	return nil
}

func MarshalYamlConfigs(configs ...interface{}) ([]byte, error) {
	var cfgs [][]byte
	for _, cfg := range configs {
		data, err := yaml.Marshal(cfg)
		if err != nil {
			return nil, err
		}
		cfgs = append(cfgs, data)
	}
	return bytes.Join(cfgs, []byte("\n---\n")), nil
}

func Matcher(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	return ext == ".yaml" || ext == ".yml"
}

func ShowStructYaml(s interface{}) {
	data, _ := yaml.Marshal(s)
	println(string(data))
}
