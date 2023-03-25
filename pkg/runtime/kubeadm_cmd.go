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

package runtime

import (
	"fmt"
	"path"
	"strconv"
	"strings"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/versionutil"
)

type CommandType string

const InitMaster CommandType = "initMaster"
const JoinMaster CommandType = "joinMaster"
const JoinNode CommandType = "joinNode"
const UpdateCluster CommandType = "updateCluster"

func vlogToStr(vlog int) string {
	str := strconv.Itoa(vlog)
	return " -v " + str
}

func (k *KubeadmRuntime) Command(version string, name CommandType) (cmd string) {
	const (
		InitMaster115Lower = `kubeadm init --config=%s --experimental-upload-certs`
		JoinMaster115Lower = "kubeadm join %s:%d --token %s   %s --experimental-control-plane --certificate-key %s"
		JoinNode115Lower   = "kubeadm join %s:%d --token %s   %s"

		InitMaser115Upper  = `kubeadm init --config=%s --skip-certificate-key-print --skip-token-print` // --upload-certs --skip-certificate-key-print --skip-token-print
		JoinMaster115Upper = "kubeadm join --config=%s"
		JoinNode115Upper   = "kubeadm join --config=%s"
		UpdateClusterAll   = "kubeadm init phase upload-config kubeadm --config=%s"
	)

	initConfigPath := path.Join(k.getContentData().EtcPath(), constants.DefaultInitKubeadmFileName)
	joinMasterConfigPath := path.Join(k.getContentData().EtcPath(), constants.DefaultJoinMasterKubeadmFileName)
	joinNodeConfigPath := path.Join(k.getContentData().EtcPath(), constants.DefaultJoinNodeKubeadmFileName)
	updateClusterConfigPath := path.Join(k.getContentData().EtcPath(), constants.DefaultUpdateKubeadmFileName)

	var discoveryTokens []string
	for _, data := range k.getTokenCaCertHash() {
		discoveryTokens = append(discoveryTokens, "--discovery-token-ca-cert-hash "+data)
	}

	cmds := map[CommandType]string{
		InitMaster:    fmt.Sprintf(InitMaster115Lower, initConfigPath),
		JoinMaster:    fmt.Sprintf(JoinMaster115Lower, k.getMaster0IP(), k.getAPIServerPort(), k.getJoinToken(), strings.Join(discoveryTokens, " "), k.getJoinCertificateKey()),
		JoinNode:      fmt.Sprintf(JoinNode115Lower, k.getVip(), k.getAPIServerPort(), k.getJoinToken(), strings.Join(discoveryTokens, " ")),
		UpdateCluster: fmt.Sprintf(UpdateClusterAll, updateClusterConfigPath),
	}

	//other version >= 1.15.x
	if versionutil.Compare(version, V1150) {
		cmds[InitMaster] = fmt.Sprintf(InitMaser115Upper, initConfigPath)
		cmds[JoinMaster] = fmt.Sprintf(JoinMaster115Upper, joinMasterConfigPath)
		cmds[JoinNode] = fmt.Sprintf(JoinNode115Upper, joinNodeConfigPath)
	}

	v, ok := cmds[name]
	if !ok {
		logger.Error("get kubeadm command failed %v", cmds)
		return ""
	}

	if name == InitMaster || name == JoinMaster {
		return fmt.Sprintf("%s%s%s", v, vlogToStr(k.vlog), " --ignore-preflight-errors=SystemVerification")
	}

	return fmt.Sprintf("%s%s", v, vlogToStr(k.vlog))
}
