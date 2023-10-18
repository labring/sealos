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
	"fmt"
	"io"
	"os"
	"reflect"
	"strings"

	"k8s.io/apimachinery/pkg/runtime"
	utilyaml "k8s.io/apimachinery/pkg/util/yaml"
	"sigs.k8s.io/yaml"

	fileutil "github.com/labring/sealos/pkg/utils/file"
)

const nonStructPointerErrorFmt = "must be a struct pointer, got %T"

func unmarshalStrict(r io.Reader, obj interface{}) (err error) {
	if obj != nil && reflect.ValueOf(obj).Kind() != reflect.Pointer {
		return fmt.Errorf(nonStructPointerErrorFmt, obj)
	}
	if v := reflect.ValueOf(obj).Elem(); v.Kind() != reflect.Struct {
		return fmt.Errorf(nonStructPointerErrorFmt, obj)
	}

	rd := utilyaml.NewYAMLReader(bufio.NewReader(r))
	for {
		buf, rerr := rd.Read()
		if rerr == io.EOF {
			break
		}
		if rerr != nil {
			return rerr
		}
		if len(bytes.TrimSpace(buf)) == 0 {
			continue
		}
		if err = yaml.UnmarshalStrict(buf, obj); err == nil {
			return nil
		}
	}
	if err != nil {
		if strings.Contains(err.Error(), "json: unknown field") {
			err = fmt.Errorf("document do not have corresponding struct %T", obj)
		}
	}
	return
}

func UnmarshalToMap(buf []byte) (map[string]interface{}, error) {
	var data map[string]interface{}
	err := yaml.Unmarshal(buf, &data)
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

func Marshal(obj interface{}) ([]byte, error) {
	return yaml.Marshal(obj)
}

func MarshalFile(file string, obj ...interface{}) error {
	data, err := MarshalConfigs(obj...)
	if err != nil {
		return err
	}
	return fileutil.WriteFile(file, data)
}

func Unmarshal(r io.Reader, obj interface{}) error {
	return unmarshalStrict(r, obj)
}

func IsNil(b []byte) (bool, error) {
	m, err := UnmarshalToMap(b)
	if err != nil {
		return false, err
	}
	return len(m) == 0, nil
}

// UnmarshalFile if there is no content in the file or it contains only spaces,
// result will be nil, then the given object is not initialized at this time.
func UnmarshalFile(file string, obj interface{}) error {
	r, err := os.Open(file)
	if err != nil {
		return err
	}
	defer r.Close()
	return unmarshalStrict(r, obj)
}

func MarshalConfigs(configs ...interface{}) ([]byte, error) {
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

func ShowStructYaml(s interface{}) {
	data, _ := yaml.Marshal(s)
	fmt.Println(string(data))
}
