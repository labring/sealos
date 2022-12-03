/*
Copyright 2022 cuisongliu@qq.com.

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

package cmd

import (
	"os"

	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/utils/hosts"
	"github.com/labring/sealos/pkg/utils/logger"
)

var hostsPath string

func newHostsCmd() *cobra.Command {
	var hostsCmd = &cobra.Command{
		Use:   "hosts",
		Short: "hosts manager",
		//Run: func(cmd *cobra.Command, args []string) {
		//
		//},
	}
	// check route for host
	hostsCmd.AddCommand(newHostsListCmd())
	hostsCmd.AddCommand(newHostsAddCmd())
	hostsCmd.AddCommand(newHostsDeleteCmd())
	hostsCmd.PersistentFlags().StringVar(&hostsPath, "path", constants.DefaultHostsPath, "default hosts path")
	return hostsCmd
}

func newHostsListCmd() *cobra.Command {
	var hostsListCmd = &cobra.Command{
		Use:   "list",
		Short: "hosts manager list",
		Run: func(cmd *cobra.Command, args []string) {
			hf := &hosts.HostFile{Path: hostsPath}
			hf.ListCurrentHosts()
		},
	}
	return hostsListCmd
}

func newHostsAddCmd() *cobra.Command {
	var ip, domain string
	var hostsAddCmd = &cobra.Command{
		Use:   "add",
		Short: "hosts manager add",
		PreRun: func(cmd *cobra.Command, args []string) {
			if ip == "" {
				logger.Error("ip not empty")
				os.Exit(1)
			}
			if domain == "" {
				logger.Error("domain not empty")
				os.Exit(1)
			}
		},
		Run: func(cmd *cobra.Command, args []string) {
			hf := &hosts.HostFile{Path: hostsPath}
			if _, ok := hf.HasDomain(domain); ok {
				hf.DeleteDomain(domain)
				logger.Info("domain %s delete success", domain)
			}
			hf.AppendHost(domain, ip)
			logger.Info("domain %s:%s append success", domain, ip)
		},
	}
	hostsAddCmd.Flags().StringVar(&ip, "ip", "", "ip address")
	hostsAddCmd.Flags().StringVar(&domain, "domain", "", "domain address")

	return hostsAddCmd
}

func newHostsDeleteCmd() *cobra.Command {
	var domain string
	var hostsDeleteCmd = &cobra.Command{
		Use:   "delete",
		Short: "hosts manager delete",
		PreRun: func(cmd *cobra.Command, args []string) {
			if domain == "" {
				logger.Error("domain not empty")
				os.Exit(1)
			}
		},
		Run: func(cmd *cobra.Command, args []string) {
			hf := &hosts.HostFile{Path: hostsPath}
			hf.DeleteDomain(domain)
			logger.Info("domain %s delete success", domain)
		},
	}
	hostsDeleteCmd.Flags().StringVar(&domain, "domain", "", "domain address")

	return hostsDeleteCmd
}

func init() {
	rootCmd.AddCommand(newHostsCmd())
}
