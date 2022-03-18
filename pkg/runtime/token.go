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

	"github.com/fanux/sealos/pkg/kubeadm"
	"github.com/fanux/sealos/pkg/token"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/logger"
	"github.com/fanux/sealos/pkg/utils/versionutil"
	"k8s.io/apimachinery/pkg/util/json"
)

type CommandType string

const InitMaster CommandType = "initMaster"
const JoinMaster CommandType = "joinMaster"
const JoinNode CommandType = "joinNode"

func vlogToStr(vlog int) string {
	str := strconv.Itoa(vlog)
	return " -v " + str
}

func (k *KubeadmRuntime) getKubernetesToken() error {
	logger.Info("start to get kubernetes token...")
	if k.token == nil {
		data, err := k.execToken(k.getMaster0IP())
		if err != nil {
			return err
		}
		var t token.Token
		err = json.Unmarshal([]byte(data), &t)
		if err != nil {
			return err
		}
		k.token = &t
	}
	return nil
}

func (k *KubeadmRuntime) getJoinToken() string {
	if k.token != nil {
		return k.token.JoinToken
	}
	return ""
}

func (k *KubeadmRuntime) getTokenCaCertHash() []string {
	if k.token != nil {
		return k.token.DiscoveryTokenCaCertHash
	}
	return []string{}
}
func (k *KubeadmRuntime) getCertificateKey() string {
	if k.token != nil {
		return k.token.CertificateKey
	}
	return ""
}

func (k *KubeadmRuntime) Command(version string, name CommandType) (cmd string) {
	const (
		InitMaster115Lower = `kubeadm init --config=%s --experimental-upload-certs`
		JoinMaster115Lower = "kubeadm join %s:6443 --token %s   %s --experimental-control-plane --certificate-key %s"
		JoinNode115Lower   = "kubeadm join %s:6443 --token %s   %s"

		InitMaser115Upper  = `kubeadm init --config=%s --upload-certs`
		JoinMaster115Upper = "kubeadm join --config=%s"
		JoinNode115Upper   = "kubeadm join --config=%s"
	)

	initConfigPath := path.Join(k.data.EtcPath(), contants.DefaultInitKubeadmFileName)
	joinMasterConfigPath := path.Join(k.data.EtcPath(), contants.DefaultJoinMasterKubeadmFileName)
	joinNodeConfigPath := path.Join(k.data.EtcPath(), contants.DefaultJoinNodeKubeadmFileName)

	var discoveryTokens []string
	for _, data := range k.getTokenCaCertHash() {
		discoveryTokens = append(discoveryTokens, "--discovery-token-ca-cert-hash "+data)
	}

	cmds := map[CommandType]string{
		InitMaster: fmt.Sprintf(InitMaster115Lower, initConfigPath),
		JoinMaster: fmt.Sprintf(JoinMaster115Lower, k.getMaster0IP(), k.getJoinToken(), strings.Join(discoveryTokens, " "), k.getCertificateKey()),
		JoinNode:   fmt.Sprintf(JoinNode115Lower, k.getVip(), k.getJoinToken(), strings.Join(discoveryTokens, " ")),
	}
	//other version >= 1.15.x
	if versionutil.Compare(version, kubeadm.V1150) {
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
