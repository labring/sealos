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

package json

import (
	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/util/json"

	"github.com/labring/sealos/pkg/utils/file"
)

func Unmarshal(path string) (map[string]interface{}, error) {
	metadata, err := file.ReadAll(path)
	if err != nil {
		return nil, err
	}
	var data map[string]interface{}
	err = json.Unmarshal(metadata, &data)
	if err != nil {
		return nil, err
	}
	return data, nil
}

func Convert(from interface{}, to interface{}) error {
	var data []byte
	var err error
	if data, err = json.Marshal(from); err != nil {
		return errors.WithStack(err)
	}
	return errors.WithStack(json.Unmarshal(data, to))
}
