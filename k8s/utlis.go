// Copyright © 2021 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package k8s

import (
	"strings"
)

func getHostnameAndIP(node []string) ([]string, []string) {
	var resHost, resIP []string
	if len(node) == 0 {
		return node, node
	}
	for _, n := range node {
		if !IsIpv4(n) {
			resHost = append(resHost, n)
		} else {
			resIP = append(resIP, n)
		}
	}
	return resHost, resIP
}

func IsIpv4(ip string) bool {
	//matched, _ := regexp.MatchString("((2(5[0-5]|[0-4]\\d))|[0-1]?\\d{1,2})(\\.((2(5[0-5]|[0-4]\\d))|[0-1]?\\d{1,2})){3}", ip)

	arr := strings.Split(ip, ".")
	if len(arr) != 4 {
		return false
	}
	for _, v := range arr {
		if v == "" {
			return false
		}
		if len(v) > 1 && v[0] == '0' {
			return false
		}
		num := 0
		for _, c := range v {
			if c >= '0' && c <= '9' {
				num = num*10 + int(c-'0')
			} else {
				return false
			}
		}
		if num > 255 {
			return false
		}
	}
	return true
}

// remove is remove b in a []string
func remove(a []string, b string) []string {
	if len(a) == 0 {
		return a
	}
	for i, v := range a {
		if v == b {
			a = append(a[:i], a[i+1:]...)
			return remove(a, b)
		}
	}
	return a
}

// removeRep is Deduplication []string
func removeRep(a []string) []string {
	if len(a) == 0 {
		return a
	}
	res := make([]string, 0, len(a))
	tmp := map[string]struct{}{}
	for _, v := range a {
		if _, ok := tmp[v]; !ok {
			tmp[v] = struct{}{}
			res = append(res, v)
		}
	}
	return res
}
