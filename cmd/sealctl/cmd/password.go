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

	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/passwd"
	"github.com/labring/sealos/pkg/utils/logger"
)

func newPasswordCmd() *cobra.Command {
	var passwordCmd = &cobra.Command{
		Use:   "password",
		Short: "generator password",
		//Run: func(cmd *cobra.Command, args []string) {
		//
		//},
	}
	// check route for host
	passwordCmd.AddCommand(newRegistryCmd())
	passwordCmd.AddCommand(newContainerdCmd())
	return passwordCmd
}

func newRegistryCmd() *cobra.Command {
	var pwdPath, username, password string
	var printBool bool
	var registryCmd = &cobra.Command{
		Use:   "registry",
		Short: "generator registry password and file",
		Run: func(cmd *cobra.Command, args []string) {
			pwd := passwd.Htpasswd(username, password)
			if printBool {
				println(pwd)
				return
			}
			logger.Debug("password registry is %s", pwd)
			err := os.WriteFile(pwdPath, []byte(pwd), 0755)
			if err != nil {
				logger.Error(err)
				os.Exit(1)
			}
			logger.Info("generator registry password  is success")
		},
	}
	// manually to set host via gateway
	registryCmd.Flags().StringVar(&pwdPath, "path", "/etc/registry/registry_htpasswd", "default password file")
	registryCmd.Flags().StringVar(&username, "username", "admin", "username")
	registryCmd.Flags().StringVar(&password, "password", "admin", "password")

	registryCmd.Flags().BoolVar(&printBool, "print", false, "is print")

	return registryCmd
}

func newContainerdCmd() *cobra.Command {
	var username, password string
	var containerdCmd = &cobra.Command{
		Use:   "containerd",
		Short: "generator containerd password",
		Run: func(cmd *cobra.Command, args []string) {
			pwd := passwd.LoginAuth(username, password)
			println(pwd)
		},
	}
	// manually to set host via gateway
	containerdCmd.Flags().StringVar(&username, "username", "admin", "username")
	containerdCmd.Flags().StringVar(&password, "password", "admin", "password")

	return containerdCmd
}

func init() {
	rootCmd.AddCommand(newPasswordCmd())
}
