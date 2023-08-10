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
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/labring/sealos/pkg/utils/confirm"

	"github.com/labring/sealos/pkg/ssh"
	"github.com/labring/sealos/pkg/utils/logger"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

type HostChecker struct {
	IPs []string
}

func (a HostChecker) Check(cluster *v2.Cluster, _ string) error {
	var ipList []string
	if len(cluster.GetMasterIPList())&1 == 0 {
		return confirmNonOddMasters()
	}
	if len(a.IPs) != 0 {
		ipList = a.IPs
	}
	sshClient := ssh.NewSSHByCluster(cluster, false)
	if err := checkHostnameUnique(sshClient, ipList); err != nil {
		return err
	}
	return checkTimeSync(sshClient, ipList)
}

func NewIPsHostChecker(ips []string) Interface {
	return &HostChecker{IPs: ips}
}

func checkHostnameUnique(s ssh.Interface, ipList []string) error {
	logger.Info("checker:hostname %v", ipList)
	hostnameList := map[string]bool{}
	for _, ip := range ipList {
		hostname, err := s.CmdToString(ip, "hostname", "")
		if err != nil {
			return fmt.Errorf("failed to get host %s hostname, %v", ip, err)
		}

		if hostnameList[hostname] {
			return fmt.Errorf("hostname cannot be repeated, please set different hostname")
		}
		hostnameList[hostname] = true
	}
	return nil
}

// Check whether the node time is synchronized
func checkTimeSync(s ssh.Interface, ipList []string) error {
	logger.Info("checker:timeSync %v", ipList)
	for _, ip := range ipList {
		timestamp, err := s.CmdToString(ip, "date +%s", "")
		if err != nil {
			return fmt.Errorf("failed to get %s timestamp, %v", ip, err)
		}
		ts, err := strconv.Atoi(timestamp)
		if err != nil {
			return fmt.Errorf("failed to reverse timestamp %s, %v", timestamp, err)
		}
		timeDiff := time.Since(time.Unix(int64(ts), 0)).Minutes()
		if timeDiff < -1 || timeDiff > 1 {
			return fmt.Errorf("the time of %s node is not synchronized", ip)
		}
	}
	return nil
}

func confirmNonOddMasters() error {
	prompt := "Warning: Using an even number of master nodes is a risky operation and can lead to reduced high availability and potential resource wastage. " +
		"It is strongly recommended to use an odd number of master nodes for optimal cluster stability. " +
		"Are you sure you want to proceed?"
	cancel := "The number of masters needs to be set to an odd number."
	yes, err := confirm.Confirm(prompt, cancel)
	if err != nil {
		return err
	}
	if !yes {
		return errors.New("cancelled")
	}
	return nil
}
