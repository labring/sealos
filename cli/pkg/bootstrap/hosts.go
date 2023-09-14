/*
Copyright 2023 cuisongliu@qq.com.

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

package bootstrap

import (
	"fmt"

	"golang.org/x/exp/slices"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/utils/iputils"
)

type apiServerHostApplier struct{ common }

func (*apiServerHostApplier) String() string { return "apiserver_host_applier" }

func (*apiServerHostApplier) Undo(ctx Context, host string) error {
	return ctx.GetRemoter().HostsDelete(host, constants.DefaultAPIServerDomain)
}

func (a *apiServerHostApplier) Apply(ctx Context, host string) error {
	if slices.Contains(ctx.GetCluster().GetMasterIPAndPortList(), host) {
		if err := ctx.GetRemoter().HostsAdd(host, ctx.GetCluster().GetMaster0IP(), constants.DefaultAPIServerDomain); err != nil {
			return fmt.Errorf("failed to add hosts: %v", err)
		}
		return nil
	}
	if err := ctx.GetRemoter().HostsAdd(host, ctx.GetCluster().GetVIP(), constants.DefaultAPIServerDomain); err != nil {
		return fmt.Errorf("failed to add hosts: %v", err)
	}

	return nil
}

type lvscareHostApplier struct{}

func (*lvscareHostApplier) String() string { return "lvscare_host_applier" }

func (*lvscareHostApplier) Filter(ctx Context, host string) bool {
	return slices.Contains(ctx.GetCluster().GetNodeIPAndPortList(), host)
}

func (*lvscareHostApplier) Undo(ctx Context, host string) error {
	return ctx.GetRemoter().HostsDelete(host, constants.DefaultLvscareDomain)
}

func (a *lvscareHostApplier) Apply(ctx Context, host string) error {
	if err := ctx.GetRemoter().HostsAdd(host, iputils.GetHostIP(host), constants.DefaultLvscareDomain); err != nil {
		return fmt.Errorf("failed to add hosts: %v", err)
	}
	return nil
}
