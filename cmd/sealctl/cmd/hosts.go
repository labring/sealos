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
	"fmt"

	"github.com/fanux/sealos/pkg/hosts"
	"github.com/spf13/cobra"
)

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
	cmd.PersistentFlags().StringVar(&flag.Hosts.HostsPath, "path", "/etc/hosts", "default hosts path")
	return cmd
}

func NewHostsListCmd() *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "list",
		Short: "hosts manager list",
		Run: func(cmd *cobra.Command, args []string) {
			hf := &hosts.HostFile{Path: flag.Hosts.HostsPath}
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
		PreRunE: func(cmd *cobra.Command, args []string) error {
			if ip == "" {
				return fmt.Errorf("ip not empty")
			}
			if domain == "" {
				return fmt.Errorf("domain not empty")
			}
			return nil
		},
		Run: func(cmd *cobra.Command, args []string) {
			hf := &hosts.HostFile{Path: flag.Hosts.HostsPath}
			hf.AppendHost(domain, ip)
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
		PreRunE: func(cmd *cobra.Command, args []string) error {
			if domain == "" {
				return fmt.Errorf("domain not empty")
			}
			return nil
		},
		Run: func(cmd *cobra.Command, args []string) {
			hf := &hosts.HostFile{Path: flag.Hosts.HostsPath}
			hf.DeleteDomain(domain)
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
