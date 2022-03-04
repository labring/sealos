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
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/iputils"
	strings2 "github.com/fanux/sealos/pkg/utils/strings"
	"strings"
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
	cluster           *v2.Cluster
	configs           []v2.Config
	resources         []v2.Resource
	hosts             []v2.ClusterHost
	data              contants.Data
	work              contants.Worker
	kubeadmBashSuffix string //add command for kubeamd end
	dryRun            bool
	withoutCNI        bool
}

func NewInit(args InitArgs) *Init {
	r := &Init{}
	r.data = contants.NewData(args.ClusterName)
	r.work = contants.NewWork(args.ClusterName)
	cluster := initCluster(args.ClusterName)
	r.cluster = cluster

	return r
}

func (r *Init) processCluster(args InitArgs) error {
	r.cluster.Spec.SSH.User = args.User
	r.cluster.Spec.SSH.Pk = args.Pk
	r.cluster.Spec.SSH.PkPasswd = args.PkPassword
	r.cluster.Spec.SSH.Port = args.Port
	if args.Password != "" {
		r.cluster.Spec.SSH.Passwd = args.Password
	}
	err := PreProcessIPList(&args)
	if err != nil {
		return err
	}

	if len(args.Masters) > 0 || len(args.MastersArm) > 0 {
		masters := strings.Split(args.Masters, ",")
		nodes := strings.Split(args.Nodes, ",")
		masterArms := strings.Split(args.MastersArm, ",")
		nodeArms := strings.Split(args.NodesArm, ",")
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

	r.cluster.SetPodCIDR(args.PodCidr)
	r.cluster.SetServiceCIDR(args.SvcCidr)
	r.cluster.SetAPIServerDomain(args.APIServerDomain)
	r.cluster.SetVip(args.VIP)
	r.cluster.SetCertSANS(args.CertSANS)
	if !args.WithoutCNI {
		r.cluster.SetCNIInterface(args.Interface)
		r.cluster.SetCNIIPIP(!args.IPIPFalse)
		r.cluster.SetCNIMTU(args.MTU)
	}
	r.cluster.SetCRIData(args.CRIData)
	r.cluster.SetRegistryData(args.RegistryData)
	r.cluster.SetRegistryConfig(args.RegistryConfig)
	r.cluster.SetRegistryAddress(args.RegistryAddress)
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
