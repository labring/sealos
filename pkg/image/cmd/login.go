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
	"fmt"
	"os"

	"k8s.io/client-go/tools/clientcmd"

	"github.com/labring/sealos/pkg/image"
	fileutil "github.com/labring/sealos/pkg/utils/file"

	"github.com/spf13/cobra"
)

const DefaultKubeConfigDir = ".sealos/sealos.io"
const DefaultRegistry = "hub.sealos.io"

func NewLoginCmd() *cobra.Command {
	var username, password, kubeconfig string
	var loginCmd = &cobra.Command{
		Use:     "login",
		Short:   "login image repository",
		Example: `sealos login registry.cn-qingdao.aliyuncs.com -u [username] -p [password] -k [kubeconfig]`,
		Args:    cobra.RangeArgs(0, 1),
		PreRunE: func(cmd *cobra.Command, args []string) (err error) {
			if len(args) == 0 {
				args = append(args, DefaultRegistry)
			}

			if args[0] == DefaultRegistry {
				if username != "" {
					return fmt.Errorf("the hub.sealos.io registry can only be logged in by kubeconfig")
				}
			}

			// login by kubeconfig
			if kubeconfig != "" {
				sealoskubeconfdir := fmt.Sprintf("%s/%s", os.Getenv("HOME"), DefaultKubeConfigDir)
				err = fileutil.MkDirs(sealoskubeconfdir)
				if err != nil {
					return err
				}

				sealoskubeconfpath := fmt.Sprintf("%s/%s", sealoskubeconfdir, "config")

				// copy kubeconfig to ${HOME}/.sealos/sealos.io/config
				err = fileutil.Copy(kubeconfig, sealoskubeconfpath)
				if err != nil {
					return err
				}

				var passwordb []byte
				// set user/password
				if passwordb, err = fileutil.ReadAll(sealoskubeconfpath); err != nil {
					return err
				}
				// username is current context kubeconfig user id
				username, err = GetCurrentUserFromKubeConfig(sealoskubeconfpath)
				if err != nil {
					return err
				}
				password = string(passwordb)
			}
			return nil
		},
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(args) == 0 {
				args = append(args, DefaultRegistry)
			}
			registrySvc, err := image.NewRegistryService()
			if err != nil {
				return err
			}
			return registrySvc.Login(args[0], username, password)
		},
	}
	loginCmd.Flags().StringVarP(&username, "username", "u", "", "user name for login registry")
	loginCmd.Flags().StringVarP(&password, "passwd", "p", "", "password for login registry")
	loginCmd.Flags().StringVarP(&kubeconfig, "kubeconfig", "k", "", "kubeconfig file path for login registry")

	loginCmd.MarkFlagsRequiredTogether("username", "passwd")
	loginCmd.MarkFlagsMutuallyExclusive("username", "kubeconfig")
	return loginCmd
}

func GetCurrentUserFromKubeConfig(filename string) (userid string, err error) {
	config, err := clientcmd.LoadFromFile(filename)
	if err != nil {
		return "", err
	}
	expectedCtx, exists := config.Contexts[config.CurrentContext]
	if !exists {
		return "", fmt.Errorf("failed to find current context %s", config.CurrentContext)
	}
	return expectedCtx.AuthInfo, nil
}
