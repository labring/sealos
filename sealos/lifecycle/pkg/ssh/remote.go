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

package ssh

// nosemgrep: go.lang.security.audit.xss.import-text-template.import-text-template
import (
	"fmt"
	"strconv"

	"github.com/labring/sealos/pkg/utils/initsystem"

	"github.com/labring/sealos/pkg/template"

	"github.com/labring/sealos/pkg/constants"

	"github.com/labring/sealos/pkg/utils/iputils"
)

const (
	addHostsCommandFmt    = "hosts add --ip %s  --domain %s"
	deleteHostsCommandFmt = "hosts delete  --domain %s"
	hostnameCommandFmt    = "hostname"
	tokenCommandFmt       = "token %s %s"
	cGroupCommandFmt      = "cri cgroup-driver --short"
	socketCommandFmt      = "cri socket"
	initSystemCommandFmt  = "initsystem %s %s"
)

type RenderTemplate func(name, defaultStr string, data map[string]interface{}) (string, error)

type Remote struct {
	pathResolver constants.PathResolver
	execer       Interface
}

func (s *Remote) HostsAdd(ip, host, domain string) error {
	cmd := fmt.Sprintf(addHostsCommandFmt, host, domain)
	return s.executeRemoteUtilSubcommand(ip, cmd)
}

func (s *Remote) HostsDelete(ip, domain string) error {
	cmd := fmt.Sprintf(deleteHostsCommandFmt, domain)
	return s.executeRemoteUtilSubcommand(ip, cmd)
}

func (s *Remote) Hostname(ip string) (string, error) {
	return s.outputRemoteUtilSubcommand(ip, hostnameCommandFmt)
}

func (s *Remote) IPVS(ip, vip string, masters []string) error {
	ipvsTemplate := `ipvs --vs {{.vip}}  {{range $h := .masters}}--rs  {{$h}} {{end}} --health-path /healthz --health-schem https --run-once`
	data := map[string]interface{}{
		"vip":     vip,
		"masters": masters,
	}
	out, err := template.RenderTemplate("ipvs", ipvsTemplate, data)
	if err != nil {
		return err
	}
	return s.executeRemoteUtilSubcommand(ip, out)
}
func (s *Remote) IPVSClean(ip, vip string) error {
	ipvsTemplate := `ipvs --vs {{.vip}}  -C`
	data := map[string]interface{}{
		"vip": vip,
		"ip":  iputils.GetHostIP(ip),
	}
	out, err := template.RenderTemplate("ipvs", ipvsTemplate, data)
	if err != nil {
		return err
	}
	return s.executeRemoteUtilSubcommand(ip, out)
}

func (s *Remote) StaticPod(ip, vip, name, image string, masters []string, path string, options ...string) error {
	staticPodIPVSTemplate := `static-pod lvscare --path {{.path}} --name {{.name}} --vip {{.vip}} --image {{.image}}  {{range $h := .masters}} --masters  {{$h}} {{end}} {{range $o := .options}} --options  {{$o}} {{end}}`
	data := map[string]interface{}{
		"vip":     vip,
		"image":   image,
		"masters": masters,
		"name":    name,
		"path":    path,
		"options": options,
	}
	out, err := template.RenderTemplate("lvscare", staticPodIPVSTemplate, data)
	if err != nil {
		return err
	}

	return s.executeRemoteUtilSubcommand(ip, out)
}

func (s *Remote) Token(ip, config, certificateKey string) (string, error) {
	return s.outputRemoteUtilSubcommand(ip, fmt.Sprintf(tokenCommandFmt, config, certificateKey))
}

func (s *Remote) CGroup(ip string) (string, error) {
	return s.outputRemoteUtilSubcommand(ip, cGroupCommandFmt)
}

func (s *Remote) Socket(ip string) (string, error) {
	return s.outputRemoteUtilSubcommand(ip, socketCommandFmt)
}

func (s *Remote) Cert(ip string, altNames []string, nodeIP, nodeName, serviceCIRD, DNSDomain string) error {
	certTemplate := `cert \
	{{if .nodeIP}} --node-ip {{.nodeIP}}{{end}}{{if .nodeName}} --node-name {{.nodeName}}{{end}} \
	{{if .serviceCIDR}} --service-cidr {{.serviceCIDR}}{{end}}{{if .dnsDomain}} --dns-domain {{.dnsDomain}}{{end}} \
	{{range $h := .altNames}} --alt-names {{$h}} {{end}}`
	data := map[string]interface{}{
		"nodeIP":      nodeIP,
		"nodeName":    nodeName,
		"serviceCIDR": serviceCIRD,
		"dnsDomain":   DNSDomain,
		"altNames":    altNames,
	}
	out, err := template.RenderTemplate("cert", certTemplate, data)
	if err != nil {
		return err
	}
	return s.executeRemoteUtilSubcommand(ip, out)
}

type initSystem struct {
	target  string
	remoter *Remote
}

func (s *initSystem) ServiceEnable(service string) error {
	return s.remoter.executeRemoteUtilSubcommand(s.target, fmt.Sprintf(initSystemCommandFmt, "enable", service))
}

func (s *initSystem) EnableCommand(_ string) string {
	return "not supported"
}

func (s *initSystem) ServiceStart(service string) error {
	return s.remoter.executeRemoteUtilSubcommand(s.target, fmt.Sprintf(initSystemCommandFmt, "start", service))
}

func (s *initSystem) ServiceStop(service string) error {
	return s.remoter.executeRemoteUtilSubcommand(s.target, fmt.Sprintf(initSystemCommandFmt, "stop", service))
}

func (s *initSystem) ServiceRestart(service string) error {
	return s.remoter.executeRemoteUtilSubcommand(s.target, fmt.Sprintf(initSystemCommandFmt, "restart", service))
}

func (s *initSystem) ServiceExists(service string) bool {
	out, _ := s.remoter.outputRemoteUtilSubcommand(s.target, fmt.Sprintf(initSystemCommandFmt, "is-exists", service))
	result, _ := strconv.ParseBool(out)
	return result
}

func (s *initSystem) ServiceIsEnabled(service string) bool {
	out, _ := s.remoter.outputRemoteUtilSubcommand(s.target, fmt.Sprintf(initSystemCommandFmt, "is-enabled", service))
	result, _ := strconv.ParseBool(out)
	return result
}

func (s *initSystem) ServiceIsActive(service string) bool {
	out, _ := s.remoter.outputRemoteUtilSubcommand(s.target, fmt.Sprintf(initSystemCommandFmt, "is-active", service))
	result, _ := strconv.ParseBool(out)
	return result
}

func (s *Remote) InitSystem(ip string) initsystem.InitSystem {
	return &initSystem{target: ip, remoter: s}
}

func NewRemoteFromSSH(clusterName string, sshInterface Interface) *Remote {
	return &Remote{
		execer:       sshInterface,
		pathResolver: constants.NewPathResolver(clusterName),
	}
}

func (s *Remote) executeRemoteUtilSubcommand(ip, cmd string) error {
	cmd = fmt.Sprintf("%s %s", s.pathResolver.RootFSSealctlPath(), cmd)
	if err := s.execer.CmdAsync(ip, cmd); err != nil {
		return fmt.Errorf("failed to execute remote command `%s`: %v", cmd, err)
	}
	return nil
}

func (s *Remote) outputRemoteUtilSubcommand(ip, cmd string) (string, error) {
	cmd = fmt.Sprintf("%s %s", s.pathResolver.RootFSSealctlPath(), cmd)
	return s.execer.CmdToString(ip, cmd, "")
}
