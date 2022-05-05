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

package ssh

import (
	"context"
	"fmt"
	"strings"

	"github.com/labring/sealos/pkg/clusterfile"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/contants"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/ssh"

	"golang.org/x/sync/errgroup"
)

type Exec struct {
	cluster *v2.Cluster
	ipList  []string
}

func NewExecCmdFromRoles(clusterName string, roles string) (Exec, error) {
	if clusterName == "" {
		var err error
		clusterName, err = clusterfile.GetDefaultClusterName()
		if err != nil {
			return Exec{}, err
		}
	}
	clusterFile := contants.Clusterfile(clusterName)
	cluster, err := clusterfile.GetClusterFromFile(clusterFile)
	if err != nil {
		return Exec{}, err
	}
	var ipList []string
	if roles == "" {
		ipList = append(cluster.GetMasterIPList(), cluster.GetNodeIPList()...)
	} else {
		roles := strings.Split(roles, ",")
		for _, role := range roles {
			ipList = append(ipList, cluster.GetIPSByRole(role)...)
		}
		if len(ipList) == 0 {
			return Exec{}, fmt.Errorf("failed to get ipList, please check your roles label")
		}
	}
	return Exec{cluster: cluster, ipList: ipList}, nil
}

func NewExecCmdFromIPs(clusterName string, ips []string) (Exec, error) {
	if clusterName == "" {
		var err error
		clusterName, err = clusterfile.GetDefaultClusterName()
		if err != nil {
			return Exec{}, err
		}
	}
	clusterFile := contants.Clusterfile(clusterName)
	cluster, err := clusterfile.GetClusterFromFile(clusterFile)
	if err != nil {
		return Exec{}, err
	}
	return Exec{cluster: cluster, ipList: ips}, nil
}

func (e *Exec) RunCmd(cmd string) error {
	eg, _ := errgroup.WithContext(context.Background())
	for _, ipAddr := range e.ipList {
		ip := ipAddr
		eg.Go(func() error {
			sshClient, sshErr := ssh.NewSSHByCluster(e.cluster, true)
			if sshErr != nil {
				return sshErr
			}
			err := sshClient.CmdAsync(ip, cmd)
			if err != nil {
				return err
			}
			return nil
		})
	}
	if err := eg.Wait(); err != nil {
		return fmt.Errorf("failed to sealos exec command, err: %v", err)
	}
	return nil
}

func (e *Exec) RunCopy(srcFilePath, dstFilePath string) error {
	eg, _ := errgroup.WithContext(context.Background())
	for _, ipAddr := range e.ipList {
		ip := ipAddr
		eg.Go(func() error {
			sshClient, sshErr := ssh.NewSSHByCluster(e.cluster, true)
			if sshErr != nil {
				return sshErr
			}
			err := sshClient.Copy(ip, srcFilePath, dstFilePath)
			if err != nil {
				return err
			}
			return nil
		})
	}
	if err := eg.Wait(); err != nil {
		return fmt.Errorf("failed to sealos copy command, err: %v", err)
	}
	logger.Info("transfers files success")
	return nil
}
