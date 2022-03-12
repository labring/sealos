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

package cmd

import (
	"fmt"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/ssh"
	"text/template"
)

type Sealctl interface {
	HostsAdd(host, domain string) string
	HostsDelete(domain string) string
	Cert(altNames []string, hostIP, hostName, serviceCIRD, DNSDomain string) (string, error)
	Hostname() string
	IsDocker() string
	IPVS(vip string, masters []string) (string, error)
	RouteCheck(host string) string
	RouteAdd(host, gateway string) string
	RouteDelete(host, gateway string) string
	StaticPod(vip, image string, masters []string) (string, error)
	Token() string
}

const (
	addHostsCommandFmt    = "sealctl hosts add --ip %s  --domain %s"
	deleteHostsCommandFmt = "sealctl hosts delete  --domain %s"
	hostnameCommandFmt    = "sealctl hostname"
	isDockerCommandFmt    = "sealctl cri is-docker"
	routeCheckCommandFmt  = "sealctl route check --host %s"
	routeAddCommandFmt    = "sealctl route add --host %s --gateway %s"
	routeDeleteCommandFmt = "sealctl route del --host %s --gateway %s"
	tokenCommandFmt       = "sealctl token"
	aliasFmt              = "alias sealctl %s"
)

type sealctl struct{}

func (s *sealctl) HostsAdd(host, domain string) string {
	return fmt.Sprintf(addHostsCommandFmt, host, domain)
}

func (s *sealctl) HostsDelete(domain string) string {
	return fmt.Sprintf(deleteHostsCommandFmt, domain)
}

func (s *sealctl) Cert(altNames []string, nodeIP, nodeName, serviceCIRD, DNSDomain string) (string, error) {
	var certCommandTemplate = template.Must(template.New("cert").Parse(`` +
		`sealctl cert \
	{{if .nodeIP}} --node-ip {{.nodeIP}}{{end}}{{if .nodeName}} --node-name {{.nodeName}}{{end}} \
	{{if .serviceCIDR}} --service-cidr {{.serviceCIDR}}{{end}}{{if .dnsDomain}} --dns-domain {{.dnsDomain}}{{end}} \
	{{range $h := .altNames}} --alt-names {{$h}} {{end}}`,
	))
	data := map[string]interface{}{
		"nodeIP":      nodeIP,
		"nodeName":    nodeName,
		"serviceCIDR": serviceCIRD,
		"dnsDomain":   DNSDomain,
		"altNames":    altNames,
	}
	return renderTemplate(certCommandTemplate, data)
}

func (s *sealctl) Hostname() string {
	return hostnameCommandFmt
}

func (s *sealctl) IsDocker() string {
	return isDockerCommandFmt
}

func (s *sealctl) IPVS(vip string, masters []string) (string, error) {
	var ipvsCommandTemplate = template.Must(template.New("ipvs").Parse(`` +
		`sealctl ipvs --vs {{.vip}}  {{range $h := .masters}}--rs  {{$h}} {{end}} --health-path /healthz --health-schem https --run-once`,
	))
	data := map[string]interface{}{
		"vip":     vip,
		"masters": masters,
	}
	return renderTemplate(ipvsCommandTemplate, data)
}

func (s *sealctl) RouteCheck(host string) string {
	return fmt.Sprintf(routeCheckCommandFmt, host)
}

func (s *sealctl) RouteAdd(host, gateway string) string {
	return fmt.Sprintf(routeAddCommandFmt, host, gateway)
}

func (s *sealctl) RouteDelete(host, gateway string) string {
	return fmt.Sprintf(routeDeleteCommandFmt, host, gateway)
}

func (s *sealctl) StaticPod(vip, image string, masters []string) (string, error) {
	var staticPodIPVSCommandTemplate = template.Must(template.New("lvscare").Parse(`` +
		`sealctl static-pod lvscare --vip {{.vip}} --image {{.image}}  {{range $h := .masters}}--masters  {{$h}}{{end}}`,
	))
	data := map[string]interface{}{
		"vip":     vip,
		"image":   image,
		"masters": masters,
	}
	return renderTemplate(staticPodIPVSCommandTemplate, data)
}

func (s *sealctl) Token() string {
	return tokenCommandFmt
}

func NewSealctl() Sealctl {
	return &sealctl{}
}

func RemoteBash(clusterName string, sshInterface ssh.Interface, host, cmd string) (string, error) {
	data := contants.NewData(clusterName)
	alias := fmt.Sprintf(aliasFmt, data.KubeSealctlPath())
	return sshInterface.CmdToString(host, fmt.Sprintf("%s && %s", alias, cmd), "")
}
