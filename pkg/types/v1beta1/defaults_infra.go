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

package v1beta1

import (
	"math/rand"
	"time"

	"github.com/labring/sealos/pkg/utils/strings"

	"k8s.io/apimachinery/pkg/util/sets"
)

const (
	SourceCidrIP  = "0.0.0.0/0"
	SSHPort       = "22/22"
	APIServerPort = "6443/6443"
)

var (
	sshExportPort = InfraExportPort{
		Protocol:  ProtocolTCP,
		CidrIP:    SourceCidrIP,
		PortRange: SSHPort,
	}
	apiserverExportPort = InfraExportPort{
		Protocol:  ProtocolTCP,
		CidrIP:    SourceCidrIP,
		PortRange: APIServerPort,
	}
)

func defaultCluster(infra *Infra) {
	infra.Spec.Metadata.AccessChannels.SSH.Port = 22
	if infra.Spec.Metadata.AccessChannels.SSH.Passwd == "" {
		infra.Spec.Metadata.AccessChannels.SSH.Passwd = createPassword()
	}
	if infra.Spec.Metadata.Annotations == nil {
		infra.Spec.Metadata.Annotations = make(map[string]string)
	}

	if infra.Spec.Metadata.RegionIDs != nil {
		infra.Spec.Metadata.RegionIDs = strings.RemoveSliceEmpty(infra.Spec.Metadata.RegionIDs)
	}
	if infra.Spec.Metadata.ZoneIDs != nil {
		infra.Spec.Metadata.ZoneIDs = strings.RemoveSliceEmpty(infra.Spec.Metadata.ZoneIDs)
	}
	if infra.Spec.Metadata.Instance.Network.Bandwidth == "" {
		infra.Spec.Metadata.Instance.Network.Bandwidth = "100"
	}
	if len(infra.Spec.Metadata.Instance.Network.ExportPorts) == 0 {
		infra.Spec.Metadata.Instance.Network.ExportPorts = []InfraExportPort{
			sshExportPort,
			apiserverExportPort,
		}
	} else {
		ports := sets.NewString()
		for _, port := range infra.Spec.Metadata.Instance.Network.ExportPorts {
			ports.Insert(port.PortRange)
		}
		if !ports.Has(SSHPort) {
			infra.Spec.Metadata.Instance.Network.ExportPorts = append(infra.Spec.Metadata.Instance.Network.ExportPorts, sshExportPort)
		}
		if !ports.Has(APIServerPort) {
			infra.Spec.Metadata.Instance.Network.ExportPorts = append(infra.Spec.Metadata.Instance.Network.ExportPorts, apiserverExportPort)
		}
	}
	if infra.Spec.Metadata.Instance.Network.PrivateCidrIP == "" {
		infra.Spec.Metadata.Instance.Network.PrivateCidrIP = "172.16.0.0/24"
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
			disks := make([]InfraDisk, 0)
			disks = append(disks, InfraDisk{
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
		status = make([]InfraHostStatus, 0)
	}
	for _, h := range infra.Spec.Hosts {
		index := infra.Status.FindHostsByRoles(h.Roles)
		if index == -1 {
			status = append(status, InfraHostStatus{Roles: h.Roles, Arch: h.Arch})
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

func IsAmd64(roles []string) bool {
	return In(string(AMD64), roles)
}

func IsArm64(roles []string) bool {
	return In(string(AMD64), roles)
}
