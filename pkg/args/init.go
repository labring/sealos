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

package args

import (
	"fmt"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/iputils"
	strings2 "github.com/fanux/sealos/pkg/utils/strings"
)

type InitArgs struct {
	Masters         string
	Nodes           string
	MastersArm      string
	NodesArm        string
	User            string
	Password        string
	Port            int32
	Pk              string
	PkPassword      string
	PodCidr         string
	SvcCidr         string
	APIServerDomain string
	VIP             string
	CertSANS        []string
	WithoutCNI      bool
	Interface       string
	IPIPFalse       bool
	MTU             string
	RegistryAddress string
	CRIData         string
	RegistryConfig  string
	RegistryData    string
	KubeadmfilePath string
	Amd64URI        string
	Arm64URI        string
	CTLAdm64URI     string
	CTLArm64URI     string
	ClusterName     string
	Vlog            int
	DryRun          bool
}

type Init struct {
	args              InitArgs
	cluster           *v2.Cluster
	configs           []v2.Config
	resources         []v2.Resource
	hosts             []v2.ClusterHost
	kubeadmBashSuffix string //add command for kubeamd end
	dryRun            bool
	withoutCNI        bool
}

func NewInit(args InitArgs) *Init {
	r := &Init{}
	r.args = args
	r.dryRun = args.DryRun
	r.withoutCNI = args.WithoutCNI
	r.kubeadmBashSuffix = fmt.Sprintf(" -v %d", args.Vlog)
	return r
}

func (r *Init) SetClusterArgs() error {
	if r.cluster == nil {
		r.cluster = initCluster(r.args.ClusterName)
	}
	r.cluster.Spec.SSH.User = r.args.User
	r.cluster.Spec.SSH.Pk = r.args.Pk
	r.cluster.Spec.SSH.PkPasswd = r.args.PkPassword
	r.cluster.Spec.SSH.Port = r.args.Port
	if r.args.Password != "" {
		r.cluster.Spec.SSH.Passwd = r.args.Password
	}

	if err := PreProcessIPList(&r.args); err != nil {
		return err
	}

	if len(r.args.Masters) > 0 || len(r.args.MastersArm) > 0 {
		masters := strings2.SplitRemoveEmpty(r.args.Masters, ",")
		nodes := strings2.SplitRemoveEmpty(r.args.Nodes, ",")
		masterArms := strings2.SplitRemoveEmpty(r.args.MastersArm, ",")
		nodeArms := strings2.SplitRemoveEmpty(r.args.NodesArm, ",")
		r.hosts = []v2.ClusterHost{}
		if len(masters) != 0 {
			r.setHostWithIpsPort(masters, []string{v2.MASTER, string(v2.AMD64)})
		}
		if len(masterArms) != 0 {
			r.setHostWithIpsPort(masterArms, []string{v2.MASTER, string(v2.ARM64)})
		}
		if len(nodes) != 0 {
			r.setHostWithIpsPort(nodes, []string{v2.NODE, string(v2.AMD64)})
		}
		if len(nodeArms) != 0 {
			r.setHostWithIpsPort(nodeArms, []string{v2.NODE, string(v2.ARM64)})
		}
		r.cluster.Spec.Hosts = r.hosts
	} else {
		return fmt.Errorf("enter true iplist")
	}

	r.cluster.SetPodCIDR(r.args.PodCidr)
	r.cluster.SetServiceCIDR(r.args.SvcCidr)
	r.cluster.SetAPIServerDomain(r.args.APIServerDomain)
	r.cluster.SetVip(r.args.VIP)
	r.cluster.SetCertSANS(r.args.CertSANS)
	if !r.args.WithoutCNI {
		r.cluster.SetCNIInterface(r.args.Interface)
		r.cluster.SetCNIIPIP(!r.args.IPIPFalse)
		r.cluster.SetCNIMTU(r.args.MTU)
	}
	r.cluster.SetCRIData(r.args.CRIData)
	r.cluster.SetRegistryData(r.args.RegistryData)
	r.cluster.SetRegistryConfig(r.args.RegistryConfig)
	r.cluster.SetRegistryAddress(r.args.RegistryAddress)
	return nil
}

func (r *Init) SetConfigArgs() error {

	return nil
}
func (r *Init) SetResourceArgs() error {

	return nil
}

func (r *Init) setHostWithIpsPort(ips []string, roles []string) {
	//map[ssh port]*host
	hostMap := map[string]*v2.ClusterHost{}
	for i := range ips {
		ip, port := iputils.GetHostIPAndPortOrDefault(ips[i], "22")
		if _, ok := hostMap[port]; !ok {
			hostMap[port] = &v2.ClusterHost{IPS: []string{ip}, Roles: roles}
			continue
		}
		hostMap[port].IPS = append(hostMap[port].IPS, ip)
	}
	_, master0Port := iputils.GetHostIPAndPortOrDefault(ips[0], "22")
	for port, host := range hostMap {
		host.IPS = removeIPListDuplicatesAndEmpty(host.IPS)
		if port == master0Port && strings2.InList(v2.Master, roles) {
			r.hosts = append([]v2.ClusterHost{*host}, r.hosts...)
			continue
		}
		r.hosts = append(r.hosts, *host)
	}
}
