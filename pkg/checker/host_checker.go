// Copyright © 2021 Alibaba Group Holding Ltd.
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

package checker

import (
	"fmt"
	"strconv"
	"time"

	"github.com/labring/sealos/pkg/utils/logger"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/ssh"
)

type HostChecker struct {
	IPs []string
}

func (a HostChecker) Check(cluster *v2.Cluster, phase string) error {
	var ipList []string
	for _, hosts := range cluster.Spec.Hosts {
		ipList = append(ipList, hosts.IPS...)
	}
	if len(a.IPs) != 0 {
		ipList = a.IPs
	}
	if err := checkHostnameUnique(cluster, ipList); err != nil {
		return err
	}
	return checkTimeSync(cluster, ipList)
}

func NewHostChecker() Interface {
	return &HostChecker{}
}
func NewIPsHostChecker(ips []string) Interface {
	return &HostChecker{IPs: ips}
}

func checkHostnameUnique(cluster *v2.Cluster, ipList []string) error {
	logger.Info("checker:hostname %v", ipList)
	hostnameList := map[string]bool{}
	for _, ip := range ipList {
		s, err := ssh.NewSSHByCluster(cluster, false)
		if err != nil {
			return fmt.Errorf("checker: failed to get host %s hostname, %v", ip, err)
		}
		hostname, err := s.CmdToString(ip, "hostname", "")
		if err != nil {
			return fmt.Errorf("checker: failed to get host %s hostname, %v", ip, err)
		}
		if hostnameList[hostname] {
			return fmt.Errorf("checker: hostname cannot be repeated, please set diffent hostname")
		}
		hostnameList[hostname] = true
	}
	return nil
}

//Check whether the node time is synchronized
func checkTimeSync(cluster *v2.Cluster, ipList []string) error {
	logger.Info("checker:timeSync %v", ipList)
	for _, ip := range ipList {
		s, err := ssh.NewSSHByCluster(cluster, false)
		if err != nil {
			return fmt.Errorf("checker: failed to get host %s hostname, %v", ip, err)
		}
		timeStamp, err := s.CmdToString(ip, "date +%s", "")
		if err != nil {
			return fmt.Errorf("checker: failed to get %s timestamp, %v", ip, err)
		}
		ts, err := strconv.Atoi(timeStamp)
		if err != nil {
			return fmt.Errorf("checker: failed to reverse timestamp %s, %v", timeStamp, err)
		}
		timeDiff := time.Since(time.Unix(int64(ts), 0)).Minutes()
		if timeDiff < -1 || timeDiff > 1 {
			return fmt.Errorf("checker: the time of %s node is not synchronized", ip)
		}
	}
	return nil
}
