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

package ssh

import (
	"context"
	"fmt"
	"strings"

	"github.com/labring/sealos/pkg/utils/logger"

	"golang.org/x/sync/errgroup"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

type Exec struct {
	cluster *v2.Cluster
	ipList  []string
}

func NewExecCmdFromRoles(cluster *v2.Cluster, roles string) (Exec, error) {
	var ipList []string
	if roles == "" {
		ipList = append(cluster.GetMasterIPList(), cluster.GetNodeIPList()...)
	} else {
		roleList := strings.Split(roles, ",")
		for _, role := range roleList {
			ipList = append(ipList, cluster.GetIPSByRole(role)...)
		}
		if len(ipList) == 0 {
			return Exec{}, fmt.Errorf("failed to get ipList, please check your roles label")
		}
	}
	return Exec{cluster: cluster, ipList: ipList}, nil
}

func NewExecCmdFromIPs(cluster *v2.Cluster, ips []string) (Exec, error) {
	return Exec{cluster: cluster, ipList: ips}, nil
}

func (e *Exec) RunCmd(cmd string) error {
	eg, _ := errgroup.WithContext(context.Background())
	for _, ipAddr := range e.ipList {
		ip := ipAddr
		eg.Go(func() error {
			sshClient, sshErr := NewSSHByCluster(e.cluster, true)
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
		return fmt.Errorf("failed to exec command, err: %v", err)
	}
	return nil
}

func (e *Exec) RunCopy(srcFilePath, dstFilePath string) error {
	eg, _ := errgroup.WithContext(context.Background())
	for _, ipAddr := range e.ipList {
		ip := ipAddr
		eg.Go(func() error {
			sshClient, sshErr := NewSSHByCluster(e.cluster, true)
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
		return fmt.Errorf("failed to copy command, err: %v", err)
	}
	logger.Info("transfers files success")
	return nil
}
