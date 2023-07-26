/*
Copyright 2021 cuisongliu@qq.com.

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

package versionutil

import (
	"strconv"
	"strings"

	"github.com/labring/sealos/pkg/utils/logger"
)

// Compare is version compare
// if v1 >= v2 return true, else return false
func Compare(v1, v2 string) bool {
	v1 = strings.Replace(v1, "v", "", -1)
	v2 = strings.Replace(v2, "v", "", -1)
	v1 = strings.Split(v1, "-")[0]
	v2 = strings.Split(v2, "-")[0]
	v1List := strings.Split(v1, ".")
	v2List := strings.Split(v2, ".")

	if len(v1List) != 3 || len(v2List) != 3 {
		logger.Error("error version format %s %s", v1, v2)
		return false
	}
	for i := 0; i < len(v1List); i++ {
		v1Num, _ := strconv.Atoi(v1List[i])
		v2Num, _ := strconv.Atoi(v2List[i])

		if v1Num > v2Num {
			return true
		} else if v1Num < v2Num {
			return false
		}
	}

	return true
}
