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
	"os"

	"github.com/labring/sealos/pkg/route"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/spf13/cobra"
)

var (
	routeHost      string
	routeGatewayIP string
)

func NewRouteCmd() *cobra.Command {
	// routeCmd represents the route command
	var cmd = &cobra.Command{
		Use:   "route",
		Short: "set default route gateway",
	}
	// check route for host
	cmd.Flags().StringVar(&routeHost, "host", "", "route host ip address for iFace")
	cmd.AddCommand(NewCheckRouteCmd())
	cmd.AddCommand(NewDelRouteCmd())
	cmd.AddCommand(NewAddRouteCmd())
	return cmd
}

func init() {
	rootCmd.AddCommand(NewRouteCmd())
}

func NewCheckRouteCmd() *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "check",
		Short: "check route host via gateway",
		Run: func(cmd *cobra.Command, args []string) {
			if err := route.CheckIsDefaultRoute(routeHost); err != nil {
				logger.Error(err)
				os.Exit(1)
			}
		},
	}
	return cmd
}

func NewAddRouteCmd() *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "add",
		Short: "set route host via gateway",
		Run: func(cmd *cobra.Command, args []string) {
			r := route.NewRoute(routeHost, routeGatewayIP)
			if err := r.SetRoute(); err != nil {
				logger.Error(err)
				os.Exit(1)
			}
		},
	}
	// manually to set host via gateway
	cmd.Flags().StringVar(&routeGatewayIP, "gateway", "", "route gateway ,ex ip route add host via gateway")
	return cmd
}

func NewDelRouteCmd() *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "del",
		Short: "del route host via gateway, like ip route del host via gateway",
		Run: func(cmd *cobra.Command, args []string) {
			r := route.NewRoute(routeHost, routeGatewayIP)
			if err := r.DelRoute(); err != nil {
				logger.Error(err)
				os.Exit(1)
			}
		},
	}
	// manually to set host via gateway
	cmd.Flags().StringVar(&routeGatewayIP, "gateway", "", "route gateway ,ex ip route del host via gateway")
	return cmd
}
