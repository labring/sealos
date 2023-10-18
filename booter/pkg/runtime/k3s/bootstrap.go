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
	"context"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/pkg/errors"

	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/utils/iputils"

	"github.com/labring/sealos/pkg/constants"
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
		func() error { return k.enableK3sService(master0) },
		k.pullKubeConfigFromMaster0,
		func() error {
			return k.remoteUtil.HostsAdd(master0, iputils.GetHostIP(master0), constants.DefaultAPIServerDomain)
		},
		func() error { return k.copyKubeConfigFileToNodes(k.cluster.GetMaster0IPAndPort()) },
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
	defaultCallbacks := []callback{defaultingConfig, k.merge, k.sealosCfg, k.overrideCertSans}
	switch runMode {
	case serverMode:
		defaultCallbacks = append(defaultCallbacks, k.overrideServerConfig)
	case agentMode:
		defaultCallbacks = append(defaultCallbacks, k.overrideAgentConfig)
	}

	defaultCallbacks = append(defaultCallbacks,
		func(c *Config) *Config {
			c.ServerURL = fmt.Sprintf("https://%s:%d", constants.DefaultAPIServerDomain, c.HTTPSPort)
			return c
		},
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
	path := filepath.Join(k.pathResolver.EtcPath(), filename)
	return path, file.WriteFile(path, raw)
}

func (k *K3s) joinMaster(master string) error {
	return k.runPipelines(fmt.Sprintf("join master %s", master),
		func() error {
			// the rest masters are also running in agent mode, so agent-token file is needed.
			return k.generateAndSendTokenFiles(master, "token", "agent-token")
		},
		func() error {
			return k.execer.Copy(master, filepath.Join(k.pathResolver.EtcPath(), defaultJoinMastersFilename), defaultK3sConfigPath)
		},
		func() error { return k.enableK3sService(master) },
		func() error {
			return k.remoteUtil.HostsAdd(master, iputils.GetHostIP(master), constants.DefaultAPIServerDomain)
		},
		func() error { return k.copyKubeConfigFileToNodes(master) },
	)
}

func (k *K3s) joinNodes(nodes []string) error {
	if _, err := k.writeJoinConfigWithCallbacks(agentMode, removeServerFlagsInAgentConfig); err != nil {
		return err
	}
	for i := range nodes {
		if err := k.joinNode(nodes[i]); err != nil {
			return err
		}
	}
	return nil
}

func (k *K3s) getAPIServerPort() int {
	src := filepath.Join(k.pathResolver.EtcPath(), defaultInitFilename)
	if file.IsExist(src) {
		cfg := &Config{}
		if err := yaml.UnmarshalFile(src, cfg); err == nil {
			return cfg.HTTPSPort
		}
	}
	return constants.DefaultAPIServerPort
}

func (k *K3s) getMasterIPListAndHTTPSPort() []string {
	apiPort := k.getAPIServerPort()
	masters := make([]string, 0)
	for _, master := range k.cluster.GetMasterIPList() {
		masters = append(masters, fmt.Sprintf("%s:%d", master, apiPort))
	}
	return masters
}

func (k *K3s) getVipAndPort() string {
	return fmt.Sprintf("%s:%d", k.cluster.GetVIP(), k.getAPIServerPort())
}

func (k *K3s) joinNode(node string) error {
	return k.runPipelines(fmt.Sprintf("join node %s", node),
		func() error {
			return k.remoteUtil.IPVS(node, k.getVipAndPort(), k.getMasterIPListAndHTTPSPort())
		},
		func() error { return k.generateAndSendTokenFiles(node, "agent-token") },
		func() error {
			return k.execer.Copy(node, filepath.Join(k.pathResolver.EtcPath(), defaultJoinNodesFilename), defaultK3sConfigPath)
		},
		func() error { return k.enableK3sService(node) },
		func() error { return k.copyKubeConfigFileToNodes(node) },
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
		if err = k.execer.Copy(host, src, dst); err != nil {
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
	src := filepath.Join(k.pathResolver.EtcPath(), defaultInitFilename)
	defaultCallbacks := []callback{defaultingConfig, k.merge, k.sealosCfg, k.overrideCertSans, k.overrideServerConfig, setClusterInit}
	if !file.IsExist(src) {
		raw, err := k.getRawInitConfig(defaultCallbacks...)
		if err != nil {
			return err
		}
		if err = file.WriteFile(src, raw); err != nil {
			return err
		}
	}
	return k.execer.Copy(k.cluster.GetMaster0IPAndPort(), src, defaultK3sConfigPath)
}

func (k *K3s) enableK3sService(host string) error {
	logger.Info("enable k3s service on %s", host)
	if err := k.remoteUtil.InitSystem(host).ServiceEnable("k3s"); err != nil {
		return err
	}
	return k.remoteUtil.InitSystem(host).ServiceStart("k3s")
}

func (k *K3s) pullKubeConfigFromMaster0() error {
	dest := k.pathResolver.AdminFile()
	return k.execer.Fetch(k.cluster.GetMaster0IPAndPort(), defaultKubeConfigPath, dest)
}

func (k *K3s) copyKubeConfigFileToNodes(hosts ...string) error {
	src := k.pathResolver.AdminFile()
	data, err := file.ReadAll(src)
	if err != nil {
		return errors.WithMessage(err, "read admin.config file failed")
	}
	newData := strings.ReplaceAll(string(data), "https://0.0.0.0", fmt.Sprintf("https://%s", constants.DefaultAPIServerDomain))
	if err = file.WriteFile(src, []byte(newData)); err != nil {
		return errors.WithMessage(err, "write admin.config file failed")
	}
	eg, _ := errgroup.WithContext(context.Background())
	for _, node := range hosts {
		node := node
		eg.Go(func() error {
			home, err := k.execer.CmdToString(node, "echo $HOME", "")
			if err != nil {
				return err
			}
			dst := filepath.Join(home, ".kube", "config")
			return k.execer.Copy(node, src, dst)
		})
	}
	return eg.Wait()
}
