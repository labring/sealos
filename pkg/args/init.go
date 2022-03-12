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
	"path"

	"github.com/fanux/sealos/pkg/cri"
	"github.com/fanux/sealos/pkg/filesystem"
	"github.com/fanux/sealos/pkg/kubeadm"
	"github.com/fanux/sealos/pkg/passwd"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/iputils"
	"github.com/fanux/sealos/pkg/utils/logger"
	strings2 "github.com/fanux/sealos/pkg/utils/strings"
	"sigs.k8s.io/yaml"
)

type InitArgs struct {
	Masters          string
	Nodes            string
	User             string
	Password         string
	Port             int32
	Pk               string
	PkPassword       string
	PodCidr          string
	SvcCidr          string
	APIServerDomain  string
	VIP              string
	CertSANS         []string
	WithoutCNI       bool
	Interface        string
	IPIPFalse        bool
	MTU              string
	RegistryDomain   string
	RegistryPort     int
	CRIData          string
	RegistryConfig   string
	RegistryData     string
	RegistryUsername string
	RegistryPassword string
	KubeadmfilePath  string
	KubeURI          string
	CtlURI           string
	ClusterName      string
	Vlog             int
	DryRun           bool
}

func (a *InitArgs) Validate() error {
	if a.Masters == "" {
		return fmt.Errorf("master not empty")
	}
	if a.KubeURI == "" {
		return fmt.Errorf("kube uri not empty")
	}
	if a.ClusterName == "" {
		return fmt.Errorf("cluster name not empty")
	}
	return nil
}

type Init struct {
	args       InitArgs
	cluster    *v2.Cluster
	configs    []v2.Config
	resources  []v2.Resource
	hosts      []v2.ClusterHost
	dryRun     bool
	withoutCNI bool
}

func NewInit(args InitArgs) *Init {
	r := &Init{}
	r.args = args
	r.dryRun = args.DryRun
	r.withoutCNI = args.WithoutCNI
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

	if len(r.args.Masters) > 0 {
		masters := strings2.SplitRemoveEmpty(r.args.Masters, ",")
		nodes := strings2.SplitRemoveEmpty(r.args.Nodes, ",")
		r.hosts = []v2.ClusterHost{}
		if len(masters) != 0 {
			r.setHostWithIpsPort(masters, []string{v2.MASTER, string(v2.AMD64)})
		}
		if len(nodes) != 0 {
			r.setHostWithIpsPort(nodes, []string{v2.NODE, string(v2.AMD64)})
		}
		r.cluster.Spec.Hosts = r.hosts
	} else {
		return fmt.Errorf("enter true iplist, master ip length more than zero")
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
	r.cluster.SetRegistryAddress(r.args.RegistryDomain, r.args.RegistryPort)
	if r.args.RegistryUsername != "" && r.args.RegistryPassword != "" {
		r.cluster.SetRegistryUsername(r.args.RegistryUsername)
		r.cluster.SetRegistryPassword(r.args.RegistryPassword)
	}
	return nil
}
func (r *Init) SetConfigArgs() error {
	configs := make([]v2.Config, 0)
	registry := &v2.RegistryConfig{
		IP:       r.cluster.GetMaster0IP(),
		Domain:   r.args.RegistryDomain,
		Port:     r.args.RegistryPort,
		Username: r.args.RegistryUsername,
		Password: r.args.RegistryPassword,
	}
	data, err := yaml.Marshal(registry)
	if err != nil {
		return err
	}
	configs = append(configs, *initConfig("registry", v2.ConfigSpec{
		Strategy: v2.Merge,
		Data:     string(data),
		Path:     "etc/registry.yml",
	}))

	if r.args.RegistryUsername != "" && r.args.RegistryPassword != "" {
		configs = append(configs, *initConfig("registry_passwd", v2.ConfigSpec{
			Strategy: v2.Override,
			Data:     passwd.Htpasswd(r.args.RegistryUsername, r.args.RegistryPassword),
			Path:     "etc/registry_htpasswd",
		}))
	}

	if file.IsExist(r.args.KubeadmfilePath) {
		kubeadmFile, err := file.ReadAll(r.args.KubeadmfilePath)
		if err != nil {
			return err
		}
		configs = append(configs, *initConfig("kubeadm", v2.ConfigSpec{
			Strategy: v2.Append,
			Data:     "\n---\n" + string(kubeadmFile),
			Path:     path.Join("etc", contants.DefaultKubeadmFileName),
		}))
	}

	r.configs = configs
	return nil
}
func (r *Init) SetResourceArgs() error {
	resources := make([]v2.Resource, 0)
	override := "opt/sealctl"
	if len(r.args.CtlURI) > 0 {
		resources = append(resources, *initResource("sealctl", v2.ResourceSpec{
			Type:     v2.FileBinary,
			Path:     r.args.CtlURI,
			Override: override,
		}))
	}

	if len(r.args.KubeURI) > 0 {
		spec := v2.ResourceSpec{
			Type: v2.KubernetesTarGz,
			Path: r.args.KubeURI,
		}
		resources = append(resources, *initResource("kube", spec))
	}

	r.resources = resources
	return nil
}

func (r *Init) Output() error {
	config, err := kubeadm.GetterInitKubeadmConfig("1.19.19", r.cluster.GetMaster0IP(), r.args.APIServerDomain, r.args.PodCidr, r.args.SvcCidr, r.args.VIP, cri.DefaultContainerdCRISocket, []string{r.args.KubeadmfilePath}, r.cluster.GetMasterIPList(), r.args.CertSANS)
	if err != nil {
		return err
	}
	var clusterFile string
	if !r.args.DryRun {
		clusterFile = contants.NewWork(r.args.ClusterName).Clusterfile()
	}
	ya, err := filesystem.SaveClusterFile(r.cluster, r.configs, r.resources, clusterFile)
	if err != nil {
		return err
	}
	logger.Debug("Output-Clusterfile: \n%s", ya)
	logger.Debug("Output-kubeadm: \n%s", config)

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
