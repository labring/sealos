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

package kubernetes

import (
	"fmt"
	"path"
	"strconv"
)

type CommandType int

const (
	InitMaster CommandType = iota
	JoinMaster
	JoinNode
	UpdateCluster
)

func vlogToStr(vlog int) string {
	str := strconv.Itoa(vlog)
	return " -v " + str
}

const (
	initMasterGte115 = `kubeadm init --config=%s --skip-certificate-key-print --skip-token-print` // --upload-certs --skip-certificate-key-print --skip-token-print
	joinMasterGte115 = "kubeadm join --config=%s"
	joinNodeGte115   = "kubeadm join --config=%s"
	updateClusterAll = "kubeadm init phase upload-config kubeadm --config=%s"
)

func (k *KubeadmRuntime) Command(cmdType CommandType) (cmd string) {
	initConfigPath := k.getInitMasterKubeadmConfigFilePath()
	joinMasterConfigPath := path.Join(k.pathResolver.ConfigsPath(), defaultJoinMasterKubeadmFileName)
	joinNodeConfigPath := path.Join(k.pathResolver.ConfigsPath(), defaultJoinNodeKubeadmFileName)
	updateClusterConfigPath := path.Join(k.pathResolver.ConfigsPath(), defaultUpdateKubeadmFileName)

	switch cmdType {
	case InitMaster:
		cmd = fmt.Sprintf(initMasterGte115, initConfigPath)
	case JoinMaster:
		cmd = fmt.Sprintf(joinMasterGte115, joinMasterConfigPath)
	case JoinNode:
		cmd = fmt.Sprintf(joinNodeGte115, joinNodeConfigPath)
	case UpdateCluster:
		cmd = fmt.Sprintf(updateClusterAll, updateClusterConfigPath)
	default:
		panic("unknown command type")
	}

	if cmdType == InitMaster || cmdType == JoinMaster {
		return fmt.Sprintf("%s%s%s", cmd, vlogToStr(k.klogLevel), " --ignore-preflight-errors=SystemVerification")
	}
	return fmt.Sprintf("%s%s", cmd, vlogToStr(k.klogLevel))
}
