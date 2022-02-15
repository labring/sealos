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

	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/yaml"
	utilyaml "k8s.io/apimachinery/pkg/util/yaml"
)

func ToJSON(bs []byte) (jsons []string) {
	reader := bytes.NewReader(bs)
	ext := runtime.RawExtension{}
	d := yaml.NewYAMLOrJSONDecoder(reader, 4096)
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

func Matcher(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	return ext == ".yaml" || ext == ".yml"
}
