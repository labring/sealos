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

	"github.com/labring/sealos/pkg/image"
	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/spf13/cobra"
)

func newLoginCmd() *cobra.Command {
	var username, password string
	var loginCmd = &cobra.Command{
		Use:     "login",
		Short:   "login image repository",
		Example: `sealos login registry.cn-qingdao.aliyuncs.com -u [username] -p [password]`,
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			registrySvc, err := image.NewRegistryService()
			if err != nil {
				return err
			}
			return registrySvc.Login(args[0], username, password)
		},
	}
	loginCmd.Flags().StringVarP(&username, "username", "u", "", "user name for login registry")
	loginCmd.Flags().StringVarP(&password, "passwd", "p", "", "password for login registry")
	if err := loginCmd.MarkFlagRequired("username"); err != nil {
		logger.Error("failed to init flag: %v", err)
		os.Exit(1)
	}
	if err := loginCmd.MarkFlagRequired("passwd"); err != nil {
		logger.Error("failed to init flag: %v", err)
		os.Exit(1)
	}
	return loginCmd
}

func init() {
	loginCmd := newLoginCmd()
	rootCmd.AddCommand(loginCmd)
}
