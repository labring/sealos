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

	"github.com/fanux/sealos/pkg/filesystem"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/iputils"
	"github.com/fanux/sealos/pkg/utils/logger"
	strings2 "github.com/fanux/sealos/pkg/utils/strings"
)

type InitArgs struct {
	Masters     string
	Nodes       string
	User        string
	Password    string
	Port        int32
	Pk          string
	PkPassword  string
	ImageName   string
	ClusterName string
	Vlog        int
	DryRun      bool
}

func (a *InitArgs) Validate() error {
	if a.Masters == "" {
		return fmt.Errorf("master not empty")
	}
	if a.ImageName == "" {
		return fmt.Errorf("image name not empty")
	}
	if a.ClusterName == "" {
		return fmt.Errorf("cluster name not empty")
	}
	return nil
}

type Init struct {
	args    InitArgs
	cluster *v2.Cluster
	configs []v2.Config
	hosts   []v2.ClusterHost
	dryRun  bool
}

func NewInit(args InitArgs) *Init {
	r := &Init{}
	r.args = args
	r.dryRun = args.DryRun
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

	r.cluster.Spec.Image = r.args.ImageName

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

	return nil
}

func (r *Init) SetResourceArgs() error {
	if len(r.args.KubeURI) > 0 {
		spec := v2.ResourceSpec{
			Type: v2.KubernetesTarGz,
			Path: r.args.KubeURI,
		}
		r.resource = initResource("rootfs", spec)
	}

	return nil
}

func (r *Init) Output() error {
	var clusterFile string
	if !r.args.DryRun {
		clusterFile = contants.Clusterfile(r.args.ClusterName)
	}
	ya, err := filesystem.SaveClusterFile(r.cluster, r.configs, clusterFile)
	if err != nil {
		return err
	}
	logger.Debug("Output-Clusterfile: \n%s", ya)
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
