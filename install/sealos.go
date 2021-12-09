// Copyright © 2021 sealos.
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

package install

import (
	"fmt"
	"strings"

	"github.com/fanux/sealos/net"

	"github.com/fanux/sealos/pkg/logger"
)

type CleanCluster interface {
	Check
	Clean
}

type JoinNodeAndMaster interface {
	Check
	Send
	Join
}

type Init interface {
	Check
	Send
	PreInit
	Join
	Print
}

type Install interface {
	Check
	Send
	Apply
}

var (
	JoinToken       string
	TokenCaCertHash string
	CertificateKey  string
)

//SealosInstaller is
type SealosInstaller struct {
	Hosts     []string
	Masters   []string
	Nodes     []string
	Network   string
	APIServer string
}

type CommandType string

//command type
const InitMaster CommandType = "initMaster"
const JoinMaster CommandType = "joinMaster"
const JoinNode CommandType = "joinNode"

func (s *SealosInstaller) Command(version string, name CommandType) (cmd string) {
	// Please convert your v1beta1 configuration files to v1beta2 using the
	// "kubeadm config migrate" command of kubeadm v1.15.x, 因此1.14 版本不支持双网卡.
	commands := map[CommandType]string{
		InitMaster: `kubeadm init --config=/root/kubeadm-config.yaml --experimental-upload-certs` + vlogToStr(),
		JoinMaster: fmt.Sprintf("kubeadm join %s:6443 --token %s --discovery-token-ca-cert-hash %s --experimental-control-plane --certificate-key %s"+vlogToStr(), IPFormat(s.Masters[0]), JoinToken, TokenCaCertHash, CertificateKey),
		JoinNode:   fmt.Sprintf("kubeadm join %s:6443 --token %s --discovery-token-ca-cert-hash %s"+vlogToStr(), VIP, JoinToken, TokenCaCertHash),
	}
	//other version >= 1.15.x
	//todo
	if VersionToInt(version) >= 115 {
		commands[InitMaster] = `kubeadm init --config=/root/kubeadm-config.yaml --upload-certs` + vlogToStr()
		commands[JoinMaster] = "kubeadm join --config=/root/kubeadm-join-config.yaml " + vlogToStr()
		commands[JoinNode] = "kubeadm join --config=/root/kubeadm-join-config.yaml " + vlogToStr()
	}

	// version >= 1.16.x support kubeadm init --skip-phases=addon/kube-proxy
	// version <= 115
	// kubectl -n kube-system delete ds kube-proxy
	// # Run on each node:
	// iptables-restore <(iptables-save | grep -v KUBE)
	if s.Network == net.CILIUM {
		if VersionToInt(version) >= 116 {
			commands[InitMaster] = `kubeadm init --skip-phases=addon/kube-proxy --config=/root/kubeadm-config.yaml --upload-certs` + vlogToStr()
		} else {
			commands[InitMaster] = `kubeadm init --config=/root/kubeadm-config.yaml --upload-certs` + vlogToStr()
		}
	}

	v, ok := commands[name]
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[globals]fetch command error")
		}
	}()
	if !ok {
		panic(1)
	}
	return v
}

//decode output to join token  hash and key
func decodeOutput(output []byte) {
	s0 := string(output)
	logger.Debug("[globals]decodeOutput: %s", s0)
	slice := strings.Split(s0, "kubeadm join")
	slice1 := strings.Split(slice[1], "Please note")
	logger.Info("[globals]join command is: %s", slice1[0])
	decodeJoinCmd(slice1[0])
}

//  192.168.0.200:6443 --token 9vr73a.a8uxyaju799qwdjv --discovery-token-ca-cert-hash sha256:7c2e69131a36ae2a042a339b33381c6d0d43887e2de83720eff5359e26aec866 --experimental-control-plane --certificate-key f8902e114ef118304e561c3ecd4d0b543adc226b7a07f675f56564185ffe0c07
func decodeJoinCmd(cmd string) {
	logger.Debug("[globals]decodeJoinCmd: %s", cmd)
	stringSlice := strings.Split(cmd, " ")

	for i, r := range stringSlice {
		r = strings.ReplaceAll(r, "\t", "")
		r = strings.ReplaceAll(r, "\n", "")
		r = strings.ReplaceAll(r, "\\", "")
		r = strings.TrimSpace(r)
		logger.Debug("[####]%d :%s:", i, r)
		// switch r {
		// case "--token":
		// 	JoinToken = stringSlice[i+1]
		// case "--discovery-token-ca-cert-hash":
		// 	TokenCaCertHash = stringSlice[i+1]
		// case "--certificate-key":
		// 	CertificateKey = stringSlice[i+1][:64]
		// }
		if strings.Contains(r, "--token") {
			JoinToken = stringSlice[i+1]
		}

		if strings.Contains(r, "--discovery-token-ca-cert-hash") {
			TokenCaCertHash = stringSlice[i+1]
		}

		if strings.Contains(r, "--certificate-key") {
			CertificateKey = stringSlice[i+1][:64]
		}
	}
	logger.Debug("[####]JoinToken :%s", JoinToken)
	logger.Debug("[####]TokenCaCertHash :%s", TokenCaCertHash)
	logger.Debug("[####]CertificateKey :%s", CertificateKey)
}
