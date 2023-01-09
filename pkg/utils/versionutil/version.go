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
	"fmt"
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
	if v1List[0] > v2List[0] {
		return true
	} else if v1List[0] < v2List[0] {
		return false
	}
	if v1List[1] > v2List[1] {
		return true
	} else if v1List[1] < v2List[1] {
		return false
	}
	if v1List[2] >= v2List[2] {
		return true
	}
	return false
}

// assure version format right and new >=
// The upgrade of minor version number cannot be skipped
func UpgradeVersionLimit(old, new string) error {
	new = strings.Replace(new, "v", "", -1)
	old = strings.Replace(old, "v", "", -1)
	new = strings.Split(new, "-")[0]
	old = strings.Split(old, "-")[0]
	newList := strings.Split(new, ".")
	oldList := strings.Split(old, ".")

	minorNewV, err := strconv.Atoi(newList[1])
	if err != nil {
		return err
	}
	minorOldV, err := strconv.Atoi(oldList[1])
	if err != nil {
		return err
	}
	if newList[0] > oldList[0] {
		return fmt.Errorf("upgrade of senior version cannot be executed")
	} else if minorNewV > minorOldV+1 {
		return fmt.Errorf("upgrade of minor version number cannot be skipped")
	}
	return nil
}
