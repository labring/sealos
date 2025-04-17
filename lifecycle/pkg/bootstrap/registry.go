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

package bootstrap

import (
	"fmt"

	"k8s.io/apimachinery/pkg/util/sets"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/registry/helpers"
	"github.com/labring/sealos/pkg/registry/password"
	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
)

type registryApplier struct {
	upgrade password.Upgrade
}

func (*registryApplier) String() string { return "registry_applier" }
func (*registryApplier) Filter(ctx Context, host string) bool {
	registries := sets.NewString(ctx.GetCluster().GetRegistryIPAndPortList()...)
	return registries.Has(host)
}

func (a *registryApplier) Apply(ctx Context, host string) error {
	if a.upgrade == nil {
		a.upgrade = password.NewUpgrade(ctx.GetCluster().GetName(), ctx.GetExecer())
	}
	rc := helpers.GetRegistryInfo(ctx.GetExecer(), ctx.GetPathResolver().RootFSPath(), ctx.GetCluster().GetRegistryIPAndPort())
	lnCmd := fmt.Sprintf(constants.DefaultLnFmt, ctx.GetPathResolver().RootFSRegistryPath(), rc.Data)
	logger.Debug("make soft link: %s", lnCmd)
	if err := ctx.GetExecer().CmdAsync(host, lnCmd); err != nil {
		return fmt.Errorf("failed to make link: %v", err)
	}
	if err := a.upgrade.UpdateRegistryPasswd(rc, "", host, ""); err != nil {
		return err
	}

	return ctx.GetExecer().CmdAsync(host, ctx.GetBash().InitRegistryBash(host))
}

func (*registryApplier) Undo(ctx Context, host string) error {
	return ctx.GetExecer().CmdAsync(host, ctx.GetBash().CleanRegistryBash(host))
}

type registryHostApplier struct{ common }

func (*registryHostApplier) String() string { return "registry_host_applier" }

func (*registryHostApplier) Undo(ctx Context, host string) error {
	rc := helpers.GetRegistryInfo(ctx.GetExecer(), ctx.GetPathResolver().RootFSPath(), ctx.GetCluster().GetRegistryIPAndPort())
	return ctx.GetRemoter().HostsDelete(host, rc.Domain)
}

func (a *registryHostApplier) Apply(ctx Context, host string) error {
	rc := helpers.GetRegistryInfo(ctx.GetExecer(), ctx.GetPathResolver().RootFSPath(), ctx.GetCluster().GetRegistryIPAndPort())

	if err := ctx.GetRemoter().HostsAdd(host, iputils.GetHostIP(rc.IP), rc.Domain); err != nil {
		return fmt.Errorf("failed to add hosts: %v", err)
	}

	return nil
}
