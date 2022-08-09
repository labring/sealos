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

// GetMajorMinorInt
func GetMajorMinorInt(version string) (major, minor int) {
	// alpha beta rc version
	if strings.Contains(version, "-") {
		v := strings.Split(version, "-")[0]
		version = v
	}
	version = strings.Replace(version, "v", "", -1)
	versionArr := strings.Split(version, ".")
	if len(versionArr) >= 2 {
		majorStr := versionArr[0] + versionArr[1]
		minorStr := versionArr[2]
		if major, err := strconv.Atoi(majorStr); err == nil {
			if minor, err := strconv.Atoi(minorStr); err == nil {
				return major, minor
			}
		}
	}
	return 0, 0
}

func CanUpgradeByNewVersion(new, old string) error {
	newMajor, newMinor := GetMajorMinorInt(new)
	major, minor := GetMajorMinorInt(old)

	// sealos change cri to containerd when version more than 1.20.0
	if newMajor == 120 && major == 119 {
		return fmt.Errorf("sealos change cri to containerd when Version greater than 1.20! New version: %s, current version: %s", new, old)
	}
	// case one:  new major version <  old major version
	// 1.18.8     1.19.1
	if newMajor < major {
		return fmt.Errorf("kubernetes new version is lower than current version! New version: %s, current version: %s", new, old)
	}
	// case two:  new major version = old major version ; new minor version <= old minor version
	// 1.18.0   1.18.1
	if newMajor == major && newMinor <= minor {
		return fmt.Errorf("kubernetes new version is lower/equal than current version! New version: %s, current version: %s", new, old)
	}

	// case three : new major version > old major version +1;
	// 1.18.2    1.16.10
	if newMajor > major+1 {
		return fmt.Errorf("kubernetes new version is bigger than current version, more than one major version is not allowed! New version: %s, current version: %s", new, old)
	}
	return nil
}

func For120(version string) bool {
	newMajor, _ := GetMajorMinorInt(version)
	// // kubernetes gt 1.20, use Containerd instead of docker
	if newMajor >= 120 {
		logger.Info("install version is: %s, Use kubeadm v1beta2 InitConfig,OCI use containerd instead", version)
		return true
	}
	return false
}

// ToInt v1.15.6  => 115
func ToInt(version string) int {
	// v1.15.6  => 1.15.6
	version = strings.Replace(version, "v", "", -1)
	versionArr := strings.Split(version, ".")
	if len(versionArr) >= 2 {
		versionStr := versionArr[0] + versionArr[1]
		if i, err := strconv.Atoi(versionStr); err == nil {
			return i
		}
	}
	return 0
}

// ToIntAll v1.19.1 ==> 1191
func ToIntAll(version string) int {
	version = strings.Replace(version, "v", "", -1)
	arr := strings.Split(version, ".")
	if len(arr) >= 3 {
		str := arr[0] + arr[1] + arr[2]
		if i, err := strconv.Atoi(str); err == nil {
			return i
		}
	}
	return 0
}

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
	if v1List[2] > v2List[2] {
		return true
	}
	return true
}
