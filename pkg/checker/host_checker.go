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
	"net"
	"strconv"
	"time"

	"k8s.io/apimachinery/pkg/util/validation"

	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/pkg/errors"
)

type HostnameFormatChecker struct {
	iplist []string
}

func (fac *HostnameFormatChecker) Name() string {
	return "HostnameFormatChecker"
}

func NewHostnameFormatChecker(iplist []string) Interface {
	return &HostnameFormatChecker{iplist: iplist}
}

func (fac HostnameFormatChecker) Check(cluster *v2.Cluster, phase string) (warnings, errorList []error) {
	if phase != PhasePre {
		return nil, nil
	}
	logger.Info("chcker:nodenameFormat %v", fac.iplist)
	SSH := ssh.NewSSHClient(&cluster.Spec.SSH, false)
	for _, ip := range fac.iplist {
		InpathCMD := "hostname"
		hostname, err := SSH.CmdToString(ip, InpathCMD, "")
		if err != nil {
			warnings = append(warnings, errors.Errorf("failed to get host %s hostname, %v", ip, err))
			continue
		}
		for _, msg := range validation.IsQualifiedName(ip) {
			warnings = append(warnings, errors.Errorf("invalid node name format %q: %s", hostname, msg))
		}
		addr, err := net.LookupHost(ip)
		if addr == nil {
			warnings = append(warnings, errors.Errorf("hostname \"%s\" could not be reached", hostname))
		}
		if err != nil {
			warnings = append(warnings, errors.Wrapf(err, "hostname \"%s\"", hostname))
		}
	}

	return warnings, errorList
}

type TimeSyncChecker struct {
	iplist []string
}

func (tsc *TimeSyncChecker) Name() string {
	return "TimeSyncChecker"
}

func NewTimeSyncChecker(iplist []string) Interface {
	return &TimeSyncChecker{iplist: iplist}
}

func (tsc *TimeSyncChecker) Check(cluster *v2.Cluster, phase string) (warnings, errorList []error) {
	if phase != PhasePre {
		return nil, nil
	}
	logger.Info("checker:timeSync %v", tsc.iplist)
	SSH := ssh.NewSSHClient(&cluster.Spec.SSH, false)
	for _, ip := range tsc.iplist {
		timeStamp, err := SSH.CmdToString(ip, "date +%s", "")
		if err != nil {
			return nil, []error{fmt.Errorf("failed to get %s timestamp, %v", ip, err)}
		}
		ts, err := strconv.Atoi(timeStamp)
		if err != nil {
			return nil, []error{fmt.Errorf("failed to reverse timestamp %s, %v", timeStamp, err)}
		}
		timeDiff := time.Since(time.Unix(int64(ts), 0)).Minutes()
		if timeDiff < -1 || timeDiff > 1 {
			return nil, []error{fmt.Errorf("the time of %s node is not synchronized", ip)}
		}
	}

	return warnings, errorList
}

type HostnameUniqueChecker struct {
	iplist []string
}

func (huc *HostnameUniqueChecker) Name() string {
	return "HostnameUniqueChecker"
}
func NewHostnameUniqueChecker(iplist []string) Interface {
	return &HostnameUniqueChecker{iplist: iplist}
}

func (huc *HostnameUniqueChecker) Check(cluster *v2.Cluster, phase string) (warnings, errorList []error) {
	logger.Info("checker:hostname %v", huc.iplist)
	SSH := ssh.NewSSHClient(&cluster.Spec.SSH, false)
	hostnameList := map[string]bool{}
	for _, ip := range huc.iplist {
		hostname, err := SSH.CmdToString(ip, "hostname", "")
		if err != nil {
			return nil, []error{fmt.Errorf("failed to get host %s hostname, %v", ip, err)}
		}
		if hostnameList[hostname] {
			return nil, []error{fmt.Errorf("hostname cannot be repeated, please set different hostname")}
		}
		hostnameList[hostname] = true
	}
	return nil, nil
}
