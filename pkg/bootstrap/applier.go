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
	"fmt"
	"path"
	"sync"

	"k8s.io/apimachinery/pkg/util/sets"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/passwd"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
)

type Applier interface {
	Name() string
	Filter(Context, string) bool
	Apply(Context, string) error
	Undo(Context, string) error
}

var (
	defaultCheckers     []Applier
	defaultInitializers []Applier
	defaultAddons       []Applier
)

type registryApplier struct {
}

func (*registryApplier) Name() string { return "registry addon applier" }

func (*registryApplier) Filter(ctx Context, host string) bool {
	registries := sets.NewString(ctx.GetCluster().GetRegistryIPAndPortList()...)
	return registries.Has(host)
}

func (a *registryApplier) Apply(ctx Context, host string) error {
	rc := GetRegistryInfo(ctx.GetExecer(), ctx.GetData().RootFSPath(), ctx.GetCluster().GetRegistryIPAndPort())
	lnCmd := fmt.Sprintf(constants.DefaultLnFmt, ctx.GetData().RootFSRegistryPath(), rc.Data)
	logger.Debug("make soft link: %s", lnCmd)
	if err := ctx.GetExecer().CmdAsync(host, lnCmd); err != nil {
		return fmt.Errorf("failed to make link: %v", err)
	}
	htpasswdPath, err := a.configLocalHtpasswd(ctx.GetData().EtcPath(), rc)
	if err != nil {
		return err
	}
	if len(htpasswdPath) > 0 {
		if err = ctx.GetExecer().Copy(host, htpasswdPath, path.Join(ctx.GetData().RootFSEtcPath(), "registry_htpasswd")); err != nil {
			return err
		}
	}
	return ctx.GetExecer().CmdAsync(host, ctx.GetShellWrapper()(host, ctx.GetBash().InitRegistryBash()))
}

func (a *registryApplier) configLocalHtpasswd(cfgBasedir string, rc *v2.RegistryConfig) (string, error) {
	if rc.Username == "" || rc.Password == "" {
		logger.Warn("registry username or password is empty")
		return "", nil
	}
	mk := newHtpasswdMaker(cfgBasedir)
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

func (*registryApplier) Undo(ctx Context, host string) error {
	return ctx.GetExecer().CmdAsync(host, ctx.GetShellWrapper()(host, ctx.GetBash().CleanRegistryBash()))
}

func init() {
	defaultAddons = append(defaultAddons, &registryApplier{})
}
