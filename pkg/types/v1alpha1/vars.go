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

package v1alpha1

import (
	"strconv"

	"github.com/fanux/sealos/pkg/utils/ssh"

	"github.com/sealyun/lvscare/care"
)

var (
	MasterIPs         []string
	NodeIPs           []string
	CertSANS          []string
	DNSDomain         string
	APIServerCertSANs []string
	SSHConfig         ssh.SSH
	APIServer         string
	CertPath          = DefaultConfigPath + "/pki"
	CertEtcdPath      = DefaultConfigPath + "/pki/etcd"
	EtcdCacart        = DefaultConfigPath + "/pki/etcd/ca.crt"
	EtcdCert          = DefaultConfigPath + "/pki/etcd/healthcheck-client.crt"
	EtcdKey           = DefaultConfigPath + "/pki/etcd/healthcheck-client.key"

	CriSocket    string
	CgroupDriver string
	KubeadmAPI   string

	VIP     string
	PkgURL  string
	Version string
	Repo    string
	PodCIDR string
	SvcCIDR string

	Envs          []string // read env from -e
	PackageConfig string   // install/delete package config
	Values        string   // values for  install package values.yaml
	WorkDir       string   // workdir for install/delete package home

	Ipvs            care.LvsCare
	LvscareImage    string
	JoinToken       string
	TokenCaCertHash string
	CertificateKey  string
	KubeadmFile     string

	WithoutCNI bool // if true don't install cni plugin

	Interface string //network interface name, like "eth.*|en.*"

	BGP bool // the ipip mode of the calico

	MTU string // mtu size

	CleanForce bool
	CleanAll   bool

	Vlog int

	IsK8sMaster  bool
	SnapshotName string
	EtcdBackDir  string
	RestorePath  string
)

func VLogString() string {
	str := strconv.Itoa(Vlog)
	return " -v " + str
}
