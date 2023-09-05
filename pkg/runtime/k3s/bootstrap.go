// Copyright © 2023 sealos.
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

package k3s

import (
	"bytes"
	"errors"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/labring/sealos/pkg/ssh"
	"github.com/labring/sealos/pkg/template"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/rand"
	"github.com/labring/sealos/pkg/utils/yaml"
)

func (k *K3s) initMaster0() error {
	master0 := k.cluster.GetMaster0IPAndPort()
	return k.runPipelines("init master0",
		k.generateAndSendCerts,
		func() error { return k.generateAndSendTokenFiles(master0, "token", "agent-token") },
		k.generateAndSendInitConfig,
		func() error { return k.generateAndEnableService(master0, serverMode) },
		func() error { return k.createSymlinks(master0, defaultBinDir, Distribution, defaultSymlinks...) },
	)
}

func (k *K3s) joinMasters(masters []string) error {
	_, err := k.writeJoinConfigWithCallbacks(serverMode)
	if err != nil {
		return err
	}
	for _, master := range masters {
		if err = k.joinMaster(master); err != nil {
			return err
		}
	}
	return nil
}

func (k *K3s) writeJoinConfigWithCallbacks(runMode string, callbacks ...callback) (string, error) {
	master0 := k.cluster.GetMaster0IP()

	var defaultCallbacks []callback
	switch runMode {
	case serverMode:
		defaultCallbacks = []callback{defaultingServerConfig, k.merge, k.overrideServerConfig}
	case agentMode:
		defaultCallbacks = []callback{defaultingAgentConfig, k.overrideAgentConfig}
	}

	defaultCallbacks = append(defaultCallbacks,
		func(c *Config) { c.ServerURL = fmt.Sprintf("https://%s:%d", master0, c.HTTPSPort) },
		// TODO: set --image-service-endpoint flag in c.ExtraKubeletArgs options
	)
	raw, err := k.getRawInitConfig(
		append(defaultCallbacks, callbacks...)...,
	)
	if err != nil {
		return "", err
	}
	var filename string
	switch runMode {
	case serverMode:
		filename = defaultJoinMastersFilename
	case agentMode:
		filename = defaultJoinNodesFilename
	}
	path := filepath.Join(k.pathResolver.TmpPath(), filename)
	return path, file.WriteFile(path, raw)
}

func (k *K3s) joinMaster(master string) error {
	return k.runPipelines(fmt.Sprintf("join master %s", master),
		func() error {
			// the rest masters are also running in agent mode, so agent-token file is needed.
			return k.generateAndSendTokenFiles(master, "token", "agent-token")
		},
		func() error {
			return k.sshClient.Copy(master, filepath.Join(k.pathResolver.TmpPath(), defaultJoinMastersFilename), defaultConfigPath)
		},
		func() error { return k.generateAndEnableService(master, serverMode) },
		func() error { return k.createSymlinks(master, defaultBinDir, Distribution, defaultSymlinks...) },
	)
}

func (k *K3s) joinNodes(nodes []string) error {
	if _, err := k.writeJoinConfigWithCallbacks(agentMode, func(c *Config) {
		c.TokenFile = ""
	}); err != nil {
		return err
	}
	for i := range nodes {
		if err := k.joinNode(nodes[i]); err != nil {
			return err
		}
	}
	return nil
}

func (k *K3s) joinNode(node string) error {
	return k.runPipelines(fmt.Sprintf("join node %s", node),
		func() error { return k.generateAndSendTokenFiles(node, "agent-token") },
		func() error {
			return k.sshClient.Copy(node, filepath.Join(k.pathResolver.TmpPath(), defaultJoinNodesFilename), defaultConfigPath)
		},
		func() error { return k.generateAndEnableService(node, agentMode) },
		func() error { return k.createSymlinks(node, defaultBinDir, Distribution, defaultSymlinks...) },
	)
}

func (k *K3s) generateAndSendCerts() error {
	logger.Debug("generate and send self-signed certificates")
	// TODO: use self-signed certificates
	return nil
}

func (k *K3s) generateRandomTokenFileIfNotExists(filename string) (string, error) {
	fp := filepath.Join(k.pathResolver.EtcPath(), filepath.Base(filename))
	if !file.IsExist(fp) {
		logger.Debug("token file %s not exists, create new one", fp)
		token, err := rand.CreateCertificateKey()
		if err != nil {
			return "", err
		}
		return fp, file.WriteFile(fp, []byte(token))
	}
	return fp, nil
}

func (k *K3s) generateAndSendTokenFiles(host string, filenames ...string) error {
	for _, filename := range filenames {
		src, err := k.generateRandomTokenFileIfNotExists(filename)
		if err != nil {
			return fmt.Errorf("generate token: %v", err)
		}
		dst := filepath.Join(k.pathResolver.ConfigsPath(), filename)
		if err = k.sshClient.Copy(host, src, dst); err != nil {
			return fmt.Errorf("copy token file: %v", err)
		}
	}
	return nil
}

func (k *K3s) getRawInitConfig(callbacks ...callback) ([]byte, error) {
	cfg, err := k.getInitConfig(callbacks...)
	if err != nil {
		return nil, err
	}
	return yaml.MarshalConfigs(cfg)
}

func (k *K3s) generateAndSendInitConfig() error {
	src := filepath.Join(k.pathResolver.TmpPath(), defaultInitFilename)
	if !file.IsExist(src) {
		raw, err := k.getRawInitConfig(defaultingServerConfig, k.merge, k.overrideServerConfig,
			func(c *Config) { c.ClusterInit = true },
		)
		if err != nil {
			return err
		}
		if err = file.WriteFile(src, raw); err != nil {
			return err
		}
	}
	return k.sshClient.Copy(k.cluster.GetMaster0IPAndPort(), src, defaultConfigPath)
}

func (k *K3s) generateAndEnableService(host string, runMode string) error {
	logger.Debug("generate and enable service for %s running in %s mode", host, runMode)
	sysType := verifySystem(k.sshClient, host)

	data := map[string]string{
		"binDir":  defaultBinDir,
		"envFile": fmt.Sprintf("/etc/rancher/%s/%s.env", Distribution, runMode),
		"exec":    fmt.Sprintf("%s --config=%s", runMode, defaultConfigPath),
	}
	serviceContent, err := getServiceContent(sysType, data)
	if err != nil {
		return err
	}
	src := filepath.Join(k.pathResolver.TmpPath(), host)
	if err = file.WriteFile(src, serviceContent); err != nil {
		return err
	}
	dst, err := getServiceFilePath(sysType, Distribution)
	if err != nil {
		return err
	}
	if err = k.sshClient.Copy(host, src, dst); err != nil {
		return err
	}
	commands := getEnableAndStartServiceCommands(sysType, Distribution)
	return k.sshClient.CmdAsync(host, commands...)
}

func (k *K3s) createSymlinks(host string, binDir string, command string, symlinks ...string) error {
	script := fmt.Sprintf(`for cmd in %s; do ln -sf %s/%s %s/$cmd; done`, strings.Join(symlinks, " "), binDir, command, binDir)
	return k.sshClient.CmdAsync(host, script)
}

func getEnableAndStartServiceCommands(sysType serviceType, svcName string) []string {
	switch sysType {
	case openRC:
		return []string{
			fmt.Sprintf("rc-update add %s default > /dev/null", svcName),
			fmt.Sprintf("/etc/init.d/%s restart", svcName),
		}
	case systemd:
		return []string{
			"systemctl daemon-reload > /dev/null",
			fmt.Sprintf("systemctl enable %s.service > /dev/null", svcName),
			fmt.Sprintf("systemctl restart %s.service > /dev/null", svcName),
		}
	}
	return []string{}
}

func verifySystem(sshClient ssh.Interface, target string) serviceType {
	if _, err := sshClient.Cmd(target, "test -x /sbin/openrc-run"); err == nil {
		return openRC
	}
	return systemd
}

func getServiceContent(sysType serviceType, data any) ([]byte, error) {
	var tpl string
	switch sysType {
	case openRC:
		tpl = openRCTpl
	case systemd:
		tpl = systemdTpl
	}

	t, err := template.Parse(tpl)
	if err != nil {
		return nil, err
	}
	var out bytes.Buffer
	if err := t.Execute(&out, data); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}

func getServiceFilePath(svcType serviceType, svcName string) (string, error) {
	switch svcType {
	case openRC:
		return fmt.Sprintf("/etc/init.d/%s", svcName), nil
	case systemd:
		return fmt.Sprintf("/etc/systemd/system/%s.service", svcName), nil
	}
	return "", errors.New("unknown service type")
}
