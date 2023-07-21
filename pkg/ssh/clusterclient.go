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

package ssh

import (
	"context"
	"strings"
	"sync"

	"github.com/labring/sealos/pkg/types/v1beta1"
)

type clusterClient struct {
	cluster  *v1beta1.Cluster
	isStdout bool
	configs  map[string]*Option
	cache    map[*Option]Interface
	mutex    sync.RWMutex
}

func OverSSHConfig(original, override *v1beta1.SSH) {
	if override != nil {
		if override.User != "" {
			original.User = override.User
		}
		if override.Passwd != "" {
			original.Passwd = override.Passwd
		}
		if override.Pk != "" {
			original.Pk = override.Pk
		}
		if override.PkData != "" {
			original.PkData = override.PkData
		}
		if override.PkPasswd != "" {
			original.PkPasswd = override.PkPasswd
		}
		if override.Port > 0 {
			original.Port = override.Port
		}
	}
}

func (cc *clusterClient) getSSHOptionForHost(host string) (*Option, error) {
	cc.mutex.RLock()
	v, ok := cc.configs[host]
	cc.mutex.RUnlock()
	if ok {
		return v, nil
	}
	sshConfig := cc.cluster.Spec.SSH.DeepCopy()
	for i := range cc.cluster.Spec.Hosts {
		for j := range cc.cluster.Spec.Hosts[i].IPS {
			if strings.HasSuffix(cc.cluster.Spec.Hosts[i].IPS[j], host) {
				OverSSHConfig(sshConfig, cc.cluster.Spec.Hosts[i].SSH)
			}
		}
	}

	opt := newOptionFromSSH(sshConfig, cc.isStdout)
	cc.mutex.Lock()
	cc.configs[host] = opt
	cc.mutex.Unlock()
	return opt, nil
}

func (cc *clusterClient) getClientForHost(host string) (Interface, error) {
	sshConfig, err := cc.getSSHOptionForHost(host)
	if err != nil {
		return nil, err
	}
	cc.mutex.RLock()
	client := cc.cache[sshConfig]
	cc.mutex.RUnlock()
	if client == nil {
		var err error
		client, err = newFromOptions(sshConfig)
		if err != nil {
			return nil, err
		}
		cc.mutex.Lock()
		cc.cache[sshConfig] = client
		cc.mutex.Unlock()
	}
	return client, nil
}

func (cc *clusterClient) Copy(host, src, dst string) error {
	client, err := cc.getClientForHost(host)
	if err != nil {
		return err
	}
	return client.Copy(host, src, dst)
}

func (cc *clusterClient) Fetch(host, src, dst string) error {
	client, err := cc.getClientForHost(host)
	if err != nil {
		return err
	}
	return client.Fetch(host, src, dst)
}

func (cc *clusterClient) CmdAsync(host string, cmds ...string) error {
	client, err := cc.getClientForHost(host)
	if err != nil {
		return err
	}
	return client.CmdAsync(host, cmds...)
}

func (cc *clusterClient) CmdAsyncWithContext(ctx context.Context, host string, cmds ...string) error {
	client, err := cc.getClientForHost(host)
	if err != nil {
		return err
	}
	return client.CmdAsyncWithContext(ctx, host, cmds...)
}

func (cc *clusterClient) Cmd(host, cmd string) ([]byte, error) {
	client, err := cc.getClientForHost(host)
	if err != nil {
		return nil, err
	}
	return client.Cmd(host, cmd)
}

func (cc *clusterClient) CmdToString(host, cmd, sep string) (string, error) {
	client, err := cc.getClientForHost(host)
	if err != nil {
		return "", err
	}
	return client.CmdToString(host, cmd, sep)
}

func (cc *clusterClient) Ping(host string) error {
	client, err := cc.getClientForHost(host)
	if err != nil {
		return err
	}
	return client.Ping(host)
}
