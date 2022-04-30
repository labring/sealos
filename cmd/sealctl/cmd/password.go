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
	"io/ioutil"
	"os"

	"github.com/labring/sealos/pkg/utils/file"

	"github.com/labring/sealos/pkg/passwd"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/spf13/cobra"
)

func NewPasswordCmd() *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "password",
		Short: "generator password",
		//Run: func(cmd *cobra.Command, args []string) {
		//
		//},
	}
	// check route for host
	cmd.AddCommand(NewRegistryCmd())
	cmd.AddCommand(NewContainerdCmd())
	return cmd
}

func NewRegistryCmd() *cobra.Command {
	var pwdPath, username, password string
	var printBool bool
	var cmd = &cobra.Command{
		Use:   "registry",
		Short: "generator registry password and file",
		Run: func(cmd *cobra.Command, args []string) {
			pwd := passwd.Htpasswd(username, password)
			if printBool {
				println(pwd)
				return
			}
			logger.Debug("password registry is %s", pwd)
			if err := file.MkDirs(pwdPath); err != nil {
				logger.Error("init dir is error: %v", err)
				os.Exit(1)
			}
			err := ioutil.WriteFile(pwdPath, []byte(pwd), 0755)
			if err != nil {
				logger.Error(err)
				os.Exit(1)
			}
			logger.Info("generator registry password  is success")
		},
	}
	// manually to set host via gateway
	cmd.Flags().StringVar(&pwdPath, "path", "/etc/registry/registry_htpasswd", "default password file")
	cmd.Flags().StringVar(&username, "username", "admin", "username")
	cmd.Flags().StringVar(&password, "password", "admin", "password")

	cmd.Flags().BoolVar(&printBool, "print", false, "is print")

	return cmd
}
func NewContainerdCmd() *cobra.Command {
	var username, password string
	var cmd = &cobra.Command{
		Use:   "containerd",
		Short: "generator containerd password",
		Run: func(cmd *cobra.Command, args []string) {
			pwd := passwd.LoginAuth(username, password)
			println(pwd)
		},
	}
	// manually to set host via gateway
	cmd.Flags().StringVar(&username, "username", "admin", "username")
	cmd.Flags().StringVar(&password, "password", "admin", "password")

	return cmd
}

func init() {
	rootCmd.AddCommand(NewPasswordCmd())

	// Here you will define your flags and configuration settings.

	// Cobra supports Persistent Flags which will work for this command
	// and all subcommands, e.g.:
	// hostnameCmd.PersistentFlags().String("foo", "", "A help for foo")

	// Cobra supports local flags which will only run when this command
	// is called directly, e.g.:
	// hostnameCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")
}
