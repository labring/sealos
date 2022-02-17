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

package maps

import (
	"fmt"
	"strings"
)

func MapToString(data map[string]string) string {
	result := make([]string, 0)
	for k, v := range data {
		result = append(result, fmt.Sprintf("%s=%s", k, v))
	}

	return strings.Join(result, ",")
}

func StringToMap(data string) map[string]string {
	m := make(map[string]string)
	list := strings.Split(data, ",")
	for _, l := range list {
		if l != "" {
			kv := strings.Split(l, "=")
			if len(kv) == 2 {
				m[kv[0]] = kv[1]
			}
		}
	}
	return m
}
