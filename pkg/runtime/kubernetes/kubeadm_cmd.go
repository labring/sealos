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
	"strings"

	"github.com/Masterminds/semver/v3"

	"github.com/labring/sealos/pkg/constants"
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
	initMasterLt115  = `kubeadm init --config=%s --experimental-upload-certs`
	joinMasterLt115  = `kubeadm join %s:%d --token %s %s --experimental-control-plane --certificate-key %s`
	joinNodeLt115    = `kubeadm join %s:%d --token %s %s`
	initMasterGte115 = `kubeadm init --config=%s --skip-certificate-key-print --skip-token-print` // --upload-certs --skip-certificate-key-print --skip-token-print
	joinMasterGte115 = "kubeadm join --config=%s"
	joinNodeGte115   = "kubeadm join --config=%s"
	updateClusterAll = "kubeadm init phase upload-config kubeadm --config=%s"
)

func (k *KubeadmRuntime) Command(version string, cmdType CommandType) (cmd string) {
	initConfigPath := k.initMasterKubeadmConfigFile()
	joinMasterConfigPath := path.Join(k.getContentData().EtcPath(), constants.DefaultJoinMasterKubeadmFileName)
	joinNodeConfigPath := path.Join(k.getContentData().EtcPath(), constants.DefaultJoinNodeKubeadmFileName)
	updateClusterConfigPath := path.Join(k.getContentData().EtcPath(), constants.DefaultUpdateKubeadmFileName)

	var discoveryTokens []string
	for _, data := range k.getTokenCaCertHash() {
		discoveryTokens = append(discoveryTokens, "--discovery-token-ca-cert-hash "+data)
	}

	sver := semver.MustParse(version)
	switch cmdType {
	case InitMaster:
		if gte(sver, V1150) {
			cmd = fmt.Sprintf(initMasterGte115, initConfigPath)
		} else {
			cmd = fmt.Sprintf(initMasterLt115, initConfigPath)
		}
	case JoinMaster:
		if gte(sver, V1150) {
			cmd = fmt.Sprintf(joinMasterGte115, joinMasterConfigPath)
		} else {
			cmd = fmt.Sprintf(joinMasterLt115, k.getMaster0IP(), k.getAPIServerPort(), k.getJoinToken(), strings.Join(discoveryTokens, " "), k.getJoinCertificateKey())
		}
	case JoinNode:
		if gte(sver, V1150) {
			cmd = fmt.Sprintf(joinNodeGte115, joinNodeConfigPath)
		} else {
			cmd = fmt.Sprintf(joinNodeLt115, k.getVip(), k.getAPIServerPort(), k.getJoinToken(), strings.Join(discoveryTokens, " "))
		}
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

func (k *KubeadmRuntime) initMasterKubeadmConfigFile() string {
	return path.Join(k.getContentData().EtcPath(), constants.DefaultInitKubeadmFileName)
}
