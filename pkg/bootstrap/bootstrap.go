// Copyright © 2022 sealos.
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

package bootstrap

import (
	"context"
	"fmt"
	"path"
	"sync"

	"golang.org/x/sync/errgroup"
	"k8s.io/apimachinery/pkg/util/sets"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/env"
	"github.com/labring/sealos/pkg/passwd"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
)

type Interface interface {
	Preflight(hosts ...string) error
	Init(hosts ...string) error
	ApplyExternalDeps(hosts ...string) error
	Reset() error
}

type realBootstrap struct {
	cluster      *v2.Cluster
	execer       ssh.Interface
	bash         constants.Bash
	data         constants.Data
	is           *ImageShim
	shellWrapper shellWrapper
}

type shellWrapper func(string, string) string

func New(cluster *v2.Cluster) Interface {
	execer := ssh.NewSSHClient(&cluster.Spec.SSH, true)
	envProcessor := env.NewEnvProcessor(cluster, cluster.Status.Mounts)
	return &realBootstrap{
		cluster: cluster,
		execer:  execer,
		bash:    constants.NewBash(cluster.GetName(), cluster.GetImageLabels()),
		data:    constants.NewData(cluster.GetName()),
		is:      NewImageShimHelper(execer, cluster.GetRegistryIPList()[0]),
		shellWrapper: func(host, s string) string {
			return envProcessor.WrapperShell(host, s)
		},
	}
}

func (bs *realBootstrap) Preflight(hosts ...string) error {
	shimCmd := bs.is.ApplyCMD(bs.data.RootFSPath())
	return runParallel(hosts, func(host string) error {
		cmds := []string{bs.shellWrapper(host, bs.bash.CheckBash()), shimCmd}
		return bs.execer.CmdAsync(host, cmds...)
	})
}

func (bs *realBootstrap) Init(hosts ...string) error {
	return runParallel(hosts, func(host string) error {
		cmds := []string{bs.shellWrapper(host, bs.bash.InitBash())}
		return bs.execer.CmdAsync(host, cmds...)
	})
}

func (bs *realBootstrap) ApplyExternalDeps(hosts ...string) error {
	registries := sets.NewString(bs.cluster.GetRegistryIPAndPortList()...)
	isRegistry := func(s string) bool {
		logger.Debug(registries.List(), s)
		return registries.Has(s)
	}
	return runParallel(hosts, func(host string) error {
		if !isRegistry(host) {
			return nil
		}
		return bs.applyRegistry(host)
	})
}

func (bs *realBootstrap) Reset() error {
	registries := bs.cluster.GetRegistryIPList()
	return runParallel(registries, func(host string) error {
		return bs.execer.CmdAsync(host, bs.shellWrapper(host, bs.bash.CleanRegistryBash()))
	})
}

func (bs *realBootstrap) applyRegistry(host string) error {
	// OR for each host?
	rc := GetRegistryInfo(bs.execer, bs.data.RootFSPath(), bs.cluster.GetRegistryIPAndPort())
	lnCmd := fmt.Sprintf(constants.DefaultLnFmt, bs.data.RootFSRegistryPath(), rc.Data)
	logger.Debug("make soft link: %s", lnCmd)
	if err := bs.execer.CmdAsync(host, lnCmd); err != nil {
		return fmt.Errorf("failed to make link: %v", err)
	}
	htpasswdPath, err := bs.configLocalHtpasswd(rc)
	if err != nil {
		return err
	}
	if len(htpasswdPath) > 0 {
		if err = bs.execer.Copy(host, htpasswdPath, path.Join(bs.data.RootFSEtcPath(), "registry_htpasswd")); err != nil {
			return err
		}
	}
	return bs.execer.CmdAsync(host, bs.shellWrapper(host, bs.bash.InitRegistryBash()))
}

func (bs *realBootstrap) configLocalHtpasswd(rc *v2.RegistryConfig) (string, error) {
	if rc.Username == "" || rc.Password == "" {
		logger.Warn("registry username or password is empty")
		return "", nil
	}
	mk := newHtpasswdMaker(bs.data.EtcPath())
	return mk.Make(rc.Username, rc.Password)
}

type htpasswdMaker struct {
	path string
	err  error
	once sync.Once
}

func (m *htpasswdMaker) Make(u, p string) (string, error) {
	m.once.Do(func() {
		if u == "" || p == "" {
			return
		}
		pwd := passwd.Htpasswd(u, p)
		if err := file.WriteFile(m.path, []byte(pwd)); err != nil {
			m.err = fmt.Errorf("failed to make htpasswd: %v", err)
		}
	})
	return m.path, m.err
}

var htpasswdMakers = map[string]*htpasswdMaker{}

func newHtpasswdMaker(root string) *htpasswdMaker {
	fp := path.Join(root, "registry_htpasswd")
	if v, ok := htpasswdMakers[fp]; ok {
		return v
	}
	m := &htpasswdMaker{path: fp}
	htpasswdMakers[fp] = m
	return m
}

func runParallel(hosts []string, fn func(string) error) error {
	eg, _ := errgroup.WithContext(context.Background())
	for i := range hosts {
		host := hosts[i]
		eg.Go(func() error {
			return fn(host)
		})
	}
	return eg.Wait()
}
