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

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/pkg/hosts"
	"github.com/spf13/cobra"
)

var hostsPath string

func NewHostsCmd() *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "hosts",
		Short: "hosts manager",
		//Run: func(cmd *cobra.Command, args []string) {
		//
		//},
	}
	// check route for host
	cmd.AddCommand(NewHostsListCmd())
	cmd.AddCommand(NewHostsAddCmd())
	cmd.AddCommand(NewHostsDeleteCmd())
	cmd.PersistentFlags().StringVar(&hostsPath, "path", "/etc/hosts", "default hosts path")
	return cmd
}

func NewHostsListCmd() *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "list",
		Short: "hosts manager list",
		Run: func(cmd *cobra.Command, args []string) {
			hf := &hosts.HostFile{Path: hostsPath}
			hf.ListCurrentHosts()
		},
	}
	return cmd
}

func NewHostsAddCmd() *cobra.Command {
	var ip, domain string
	var cmd = &cobra.Command{
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
			if hf.HasDomain(domain) {
				hf.DeleteDomain(domain)
				logger.Info("domain %s delete success", domain)
			}
			hf.AppendHost(domain, ip)
			logger.Info("domain %s:%s append success", domain, ip)
		},
	}
	cmd.Flags().StringVar(&ip, "ip", "", "ip address")
	cmd.Flags().StringVar(&domain, "domain", "", "domain address")

	return cmd
}
func NewHostsDeleteCmd() *cobra.Command {
	var domain string
	var cmd = &cobra.Command{
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
	cmd.Flags().StringVar(&domain, "domain", "", "domain address")

	return cmd
}

func init() {
	rootCmd.AddCommand(NewHostsCmd())

	// Here you will define your flags and configuration settings.

	// Cobra supports Persistent Flags which will work for this command
	// and all subcommands, e.g.:
	// hostnameCmd.PersistentFlags().String("foo", "", "A help for foo")

	// Cobra supports local flags which will only run when this command
	// is called directly, e.g.:
	// hostnameCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")
}
