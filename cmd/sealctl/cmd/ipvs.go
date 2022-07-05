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
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/utils/flags"
	"github.com/labring/sealos/pkg/utils/hosts"
	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/spf13/cobra"
)

func newIPVSCmd() *cobra.Command {
	var clean bool
	var vip string
	var ipvsCmd = &cobra.Command{
		Use:   "ipvs",
		Short: "sealos create or care local ipvs lb",
		RunE: func(cmd *cobra.Command, args []string) error {
			if clean {
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
			care.LVS.VsAndRsCare()
			return nil
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			flags.PrintFlags(cmd.Flags())
			if care.LVS.TargetIP == nil {
				hf := &hosts.HostFile{Path: constants.DefaultHostsPath}
				if ip, ok := hf.HasDomain(constants.DefaultLvscareDomain); ok {
					care.LVS.TargetIP = net.ParseIP(ip)
				}
				logger.Debug("found target route ip is %s", care.LVS.TargetIP.String())
				if !clean {
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
	ipvsCmd.Flags().BoolVarP(&clean, "clean", "C", false, "clean ipvs and route")
	ipvsCmd.Flags().BoolVar(&care.LVS.RunOnce, "run-once", false, "is run once mode")
	ipvsCmd.Flags().StringVar(&care.LVS.VirtualServer, "vs", "", "virturl server like 10.54.0.2:6443")
	ipvsCmd.Flags().StringSliceVar(&care.LVS.RealServer, "rs", []string{}, "real server like 192.168.0.2:6443")
	ipvsCmd.Flags().IPVar(&care.LVS.TargetIP, "ip", nil, "target ip")

	ipvsCmd.Flags().StringVar(&care.LVS.HealthPath, "health-path", "/healthz", "health check path")
	ipvsCmd.Flags().StringVar(&care.LVS.HealthSchem, "health-schem", "https", "health check schem")
	ipvsCmd.Flags().Int32Var(&care.LVS.Interval, "interval", 5, "health check interval, unit is sec.")
	return ipvsCmd
}

func init() {
	rootCmd.AddCommand(newIPVSCmd())
}
