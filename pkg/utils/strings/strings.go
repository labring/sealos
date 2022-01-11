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

package strings

import (
	"bytes"
	"fmt"
	"math/rand"
	"net"
	"regexp"
	"sort"
	"strings"
	"time"
)

func NotIn(key string, slice []string) bool {
	for _, s := range slice {
		if key == s {
			return false
		}
	}
	return true
}

func InList(key string, slice []string) bool {
	return !NotIn(key, slice)
}

func NotInIPList(key string, slice []string) bool {
	for _, s := range slice {
		if s == "" {
			continue
		}
		if key == strings.Split(s, ":")[0] {
			return false
		}
	}
	return true
}

func ReduceIPList(src, dst []string) []string {
	var ipList []string
	for _, ip := range src {
		if !NotIn(ip, dst) {
			ipList = append(ipList, ip)
		}
	}
	return ipList
}

func AppendIPList(src, dst []string) []string {
	for _, ip := range dst {
		if NotIn(ip, src) {
			src = append(src, ip)
		}
	}
	return src
}

func IPListRemove(ss []string, s string) (result []string) {
	for _, v := range ss {
		if v != s {
			result = append(result, v)
		}
	}
	return
}
func SortIPList(iplist []string) {
	realIPs := make([]net.IP, 0, len(iplist))
	for _, ip := range iplist {
		realIPs = append(realIPs, net.ParseIP(ip))
	}

	sort.Slice(realIPs, func(i, j int) bool {
		return bytes.Compare(realIPs[i], realIPs[j]) < 0
	})

	for i := range realIPs {
		iplist[i] = realIPs[i].String()
	}
}

func Reverse(s []string) []string {
	for i, j := 0, len(s)-1; i < j; i, j = i+1, j-1 {
		s[i], s[j] = s[j], s[i]
	}
	return s
}

func ContainList(list []string, toComplete string) (containerList []string) {
	for i := range list {
		if strings.Contains(list[i], toComplete) {
			containerList = append(containerList, list[i])
		}
	}
	return
}

// RandString 生成随机字符串
func RandString(len int) string {
	var r = rand.New(rand.NewSource(time.Now().Unix()))
	bytes := make([]byte, len)
	for i := 0; i < len; i++ {
		b := r.Intn(26) + 65
		bytes[i] = byte(b)
	}
	return string(bytes)
}

func IsEmptyLine(str string) bool {
	re := regexp.MustCompile(`^\s*$`)

	return re.MatchString(str)
}

func TrimWS(str string) string {
	return strings.Trim(str, "\n\t")
}

func TrimSpaceWS(str string) string {
	return strings.TrimRight(str, " \n\t")
}

func RemoveSliceEmpty(list []string) (fList []string) {
	for i := range list {
		if strings.TrimSpace(list[i]) != "" {
			fList = append(fList, list[i])
		}
	}
	return
}

func RemoveDuplicate(list []string) []string {
	var result []string
	flagMap := map[string]struct{}{}
	for _, v := range list {
		if _, ok := flagMap[v]; !ok {
			flagMap[v] = struct{}{}
			result = append(result, v)
		}
	}
	return result
}

func WrapExecResult(host, command string, output []byte, err error) error {
	return fmt.Errorf("failed to execute command(%s) on host(%s): output(%s), error(%v)", command, host, output, err)
}
