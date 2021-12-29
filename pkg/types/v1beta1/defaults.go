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

package v1beta1

import (
	"math/rand"
	"time"
)

func Default(infra *Infra, fn func(infra *Infra) error) error {
	defaultCluster(infra)
	defaultHosts(infra)
	defaultToStatus(infra)
	return fn(infra)
}

func defaultCluster(infra *Infra) {
	infra.Spec.Cluster.AccessChannels.SSH.Port = 22
	if infra.Spec.Cluster.AccessChannels.SSH.Passwd == "" {
		infra.Spec.Cluster.AccessChannels.SSH.Passwd = createPassword()
	}
	if infra.Spec.Cluster.Annotations == nil {
		infra.Spec.Cluster.Annotations = make(map[string]string)
	}
}

func defaultHosts(infra *Infra) {
	for i, h := range infra.Spec.Hosts {
		if string(h.Arch) == "" {
			infra.Spec.Hosts[i].Arch = AMD64
		}
		if h.Memory <= 0 {
			infra.Spec.Hosts[i].Memory = 4
		}
		if h.CPU <= 0 {
			infra.Spec.Hosts[i].CPU = 2
		}
		if len(h.Disks) == 0 {
			disks := make([]Disk, 0)
			disks = append(disks, Disk{
				Capacity: 50,
			})
			infra.Spec.Hosts[i].Disks = disks
		}
	}
}

func defaultToStatus(infra *Infra) {
	if infra.Status.Cluster.Annotations == nil {
		infra.Status.Cluster.Annotations = make(map[string]string)
	}
	status := infra.Status.Hosts
	if status == nil {
		status = make([]HostStatus, 0)
	}
	for _, h := range infra.Spec.Hosts {
		index := infra.Status.FindHostsByRoles(h.Roles)
		if index == -1 {
			status = append(status, HostStatus{Roles: h.Roles, Arch: h.Arch})
		}
	}
	infra.Status.Hosts = status
}

const (
	digits         = "0123456789"
	specials       = "~=+%^*/()[]{}/!@#$?|"
	letter         = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
	passwordLength = 16
	Master         = "master"
	Node           = "node"
)

type HostRole string

func createPassword() string {
	rand.Seed(time.Now().UnixNano())
	all := digits + specials + letter
	length := passwordLength
	buf := make([]byte, length)
	buf[0] = digits[rand.Intn(len(digits))]
	buf[1] = specials[rand.Intn(len(specials))]
	for i := 2; i < length; i++ {
		buf[i] = all[rand.Intn(len(all))]
	}
	rand.Shuffle(len(buf), func(i, j int) {
		buf[i], buf[j] = buf[j], buf[i]
	})
	return string(buf)
}

func IsMaster(roles []string) bool {
	return In(Master, roles)
}

func IsNode(roles []string) bool {
	return In(Node, roles)
}

func In(key string, slice []string) bool {
	for _, s := range slice {
		if key == s {
			return true
		}
	}
	return false
}
