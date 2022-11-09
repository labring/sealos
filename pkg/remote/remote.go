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

package remote

// nosemgrep: go.lang.security.audit.xss.import-text-template.import-text-template
import (
	"fmt"
	"text/template"

	"github.com/labring/sealos/pkg/utils/iputils"

	"github.com/labring/sealos/pkg/ssh"
)

type Interface interface {
	HostsAdd(ip, host, domain string) error
	HostsDelete(ip, domain string) error
	Hostname(ip string) (string, error)
	IPVS(ip, vip string, masters []string) error
	IPVSClean(ip, vip string) error
	StaticPod(ip, vip, name, image string, masters []string) error
	Token(ip string) (string, error)
	CGroup(ip string) (string, error)
	Socket(ip string) (string, error)
	Cert(ip string, altNames []string, hostIP, hostName, serviceCIRD, DNSDomain string) error
}

const (
	addHostsCommandFmt    = "hosts add --ip %s  --domain %s"
	deleteHostsCommandFmt = "hosts delete  --domain %s"
	hostnameCommandFmt    = "hostname"
	tokenCommandFmt       = "token"
	cGroupCommandFmt      = "cri cgroup-driver --short"
	socketCommandFmt      = "cri socket"
)

type remote struct {
	clusterName  string
	sshInterface ssh.Interface
}

func (s *remote) HostsAdd(ip, host, domain string) error {
	out := fmt.Sprintf(addHostsCommandFmt, host, domain)
	return bashCTLSync(s.clusterName, s.sshInterface, ip, out)
}

func (s *remote) HostsDelete(ip, domain string) error {
	out := fmt.Sprintf(deleteHostsCommandFmt, domain)
	return bashCTLSync(s.clusterName, s.sshInterface, ip, out)
}

func (s *remote) Hostname(ip string) (string, error) {
	return bashToString(s.clusterName, s.sshInterface, ip, hostnameCommandFmt)
}

func (s *remote) IPVS(ip, vip string, masters []string) error {
	var ipvsCommandTemplate = template.Must(template.New("ipvs").Parse(`` +
		`ipvs --vs {{.vip}}  {{range $h := .masters}}--rs  {{$h}} {{end}} --health-path /healthz --health-schem https --run-once`,
	))
	data := map[string]interface{}{
		"vip":     vip,
		"masters": masters,
	}
	out, err := renderTemplate(ipvsCommandTemplate, data)
	if err != nil {
		return err
	}
	return bashCTLSync(s.clusterName, s.sshInterface, ip, out)
}
func (s *remote) IPVSClean(ip, vip string) error {
	var ipvsCommandTemplate = template.Must(template.New("ipvs").Parse(`` +
		`ipvs --vs {{.vip}}  -C`,
	))

	data := map[string]interface{}{
		"vip": vip,
		"ip":  iputils.GetHostIP(ip),
	}
	out, err := renderTemplate(ipvsCommandTemplate, data)
	if err != nil {
		return err
	}
	return bashCTLSync(s.clusterName, s.sshInterface, ip, out)
}

func (s *remote) StaticPod(ip, vip, name, image string, masters []string) error {
	var staticPodIPVSCommandTemplate = template.Must(template.New("lvscare").Parse(`` +
		`static-pod lvscare --name {{.name}} --vip {{.vip}} --image {{.image}}  {{range $h := .masters}} --masters  {{$h}}{{end}}`,
	))
	data := map[string]interface{}{
		"vip":     vip,
		"image":   image,
		"masters": masters,
		"name":    name,
	}
	out, err := renderTemplate(staticPodIPVSCommandTemplate, data)
	if err != nil {
		return err
	}

	return bashCTLSync(s.clusterName, s.sshInterface, ip, out)
}

func (s *remote) Token(ip string) (string, error) {
	return bashToString(s.clusterName, s.sshInterface, ip, tokenCommandFmt)
}
func (s *remote) CGroup(ip string) (string, error) {
	return bashToString(s.clusterName, s.sshInterface, ip, cGroupCommandFmt)
}
func (s *remote) Socket(ip string) (string, error) {
	return bashToString(s.clusterName, s.sshInterface, ip, socketCommandFmt)
}

func (s *remote) Cert(ip string, altNames []string, nodeIP, nodeName, serviceCIRD, DNSDomain string) error {
	var certCommandTemplate = template.Must(template.New("cert").Parse(`` +
		`cert \
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
	out, err := renderTemplate(certCommandTemplate, data)
	if err != nil {
		return err
	}
	return bashCTLSync(s.clusterName, s.sshInterface, ip, out)
}

func New(clusterName string, sshInterface ssh.Interface) Interface {
	return &remote{
		clusterName:  clusterName,
		sshInterface: sshInterface,
	}
}
