// Copyright © 2021 sealos.
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

package cmd

import (
	"net"

	"github.com/labring/lvscare/pkg/route"

	"github.com/labring/lvscare/care"
	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/utils/flags"
	"github.com/labring/sealos/pkg/utils/hosts"
	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
)

func newIPVSCmd() *cobra.Command {
	var vip string
	var ipvsCmd = &cobra.Command{
		Use:   "ipvs",
		Short: "sealos create or care local ipvs lb",
		RunE: func(cmd *cobra.Command, args []string) error {
			if care.LVS.Clean {
				lvs := care.BuildLvscare()
				if err := lvs.DeleteVirtualServer(care.LVS.VirtualServer, false); err != nil {
					return err
				}
				logger.Info("lvscare delete vip: %s success", care.LVS.VirtualServer)
				routeOperator := route.NewRoute(vip, care.LVS.TargetIP.String())
				if err := routeOperator.DelRoute(); err != nil {
					return err
				}
				logger.Info("lvscare delete route: %s success", care.LVS.VirtualServer)
				return nil
			}
			return care.LVS.VsAndRsCare()
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			flags.PrintFlags(cmd.Flags())
			if care.LVS.TargetIP == nil {
				hf := &hosts.HostFile{Path: constants.DefaultHostsPath}
				if ip, ok := hf.HasDomain(constants.DefaultLvscareDomain); ok {
					care.LVS.TargetIP = net.ParseIP(ip)
				}
				logger.Debug("found target route ip is %s", care.LVS.TargetIP.String())
				if !care.LVS.Clean {
					if err := care.LVS.SyncRouter(); err != nil {
						return err
					}
				}
			}
			care.LVS.Clean = true
			vip = iputils.GetHostIP(care.LVS.VirtualServer)
			return nil
		},
	}
	care.LVS.RegisterFlags(ipvsCmd.Flags())
	return ipvsCmd
}

func init() {
	rootCmd.AddCommand(newIPVSCmd())
}
