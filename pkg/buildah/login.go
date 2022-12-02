// Copyright © 2022 buildah.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://github.com/containers/buildah/blob/main/LICENSE
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package buildah

import (
	"errors"
	"fmt"
	"os"

	"github.com/containers/buildah/pkg/parse"
	"github.com/containers/common/pkg/auth"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
	"k8s.io/client-go/tools/clientcmd"

	fileutil "github.com/labring/sealos/pkg/utils/file"
)

const DefaultKubeConfigDir = ".sealos/sealos.io"
const DefaultRegistry = "hub.sealos.io"

type loginReply struct {
	loginOpts  auth.LoginOptions
	getLogin   bool
	tlsVerify  bool
	kubeconfig string
}

func newDefaultLoginReply() loginReply {
	return loginReply{
		loginOpts: auth.LoginOptions{
			Stdin:              os.Stdin,
			Stdout:             os.Stdout,
			AcceptRepositories: true,
		},
		getLogin:  true,
		tlsVerify: true,
	}
}

func (opts *loginReply) RegisterFlags(fs *pflag.FlagSet) {
	fs.SetInterspersed(false)
	fs.BoolVar(&opts.tlsVerify, "tls-verify", opts.getLogin, "require HTTPS and verify certificates when accessing the registry. TLS verification cannot be used when talking to an insecure registry.")
	fs.BoolVar(&opts.getLogin, "get-login", opts.tlsVerify, "return the current login user for the registry")
	fs.AddFlagSet(auth.GetLoginFlags(&opts.loginOpts))
	// e.g sealos login --kubeconfig /root/.kube/config hub.sealos.io
	fs.StringVarP(&opts.kubeconfig, "kubeconfig", "k", opts.kubeconfig, "Login to sealos registry: hub.sealos.io by kubeconfig")
}

func newLoginCommand() *cobra.Command {
	var (
		opts             = newDefaultLoginReply()
		loginDescription = "Login to a container registry on a specified server."
	)
	loginCommand := &cobra.Command{
		Use:   "login",
		Short: "Login to a container registry",
		Long:  loginDescription,

		PreRunE: func(cmd *cobra.Command, args []string) (err error) {
			if len(args) == 0 {
				args = append(args, DefaultRegistry)
			}

			if args[0] == DefaultRegistry {
				if opts.loginOpts.Username != "" {
					return fmt.Errorf("the hub.sealos.io registry can only be logged in by kubeconfig")
				}
			}

			// login by kubeconfig
			if opts.kubeconfig != "" {
				sealoskubeconfdir := fmt.Sprintf("%s/%s", os.Getenv("HOME"), DefaultKubeConfigDir)
				err = fileutil.MkDirs(sealoskubeconfdir)
				if err != nil {
					return err
				}

				sealoskubeconfpath := fmt.Sprintf("%s/%s", sealoskubeconfdir, "config")

				// copy kubeconfig to ${HOME}/.sealos/sealos.io/config
				err = fileutil.Copy(opts.kubeconfig, sealoskubeconfpath)
				if err != nil {
					return err
				}

				// set user/password
				var passwordb []byte
				if passwordb, err = fileutil.ReadAll(sealoskubeconfpath); err != nil {
					return err
				}
				// username is current context kubeconfig user id
				username, err := GetCurrentUserFromKubeConfig(sealoskubeconfpath)
				if err != nil {
					return err
				}
				opts.loginOpts.Username = username
				opts.loginOpts.Password = string(passwordb)
			}
			return nil
		},
		RunE: func(cmd *cobra.Command, args []string) error {
			return loginCmd(cmd, args, &opts)
		},
		Example: fmt.Sprintf(`%s login quay.io`, rootCmd.Name()),
	}
	loginCommand.SetUsageTemplate(UsageTemplate())
	opts.RegisterFlags(loginCommand.Flags())
	// set user/password and kubeconfig mutually exclusive
	loginCommand.MarkFlagsMutuallyExclusive("username", "kubeconfig")
	return loginCommand
}

func loginCmd(c *cobra.Command, args []string, iopts *loginReply) error {
	if len(args) > 1 {
		return errors.New("too many arguments, login takes only 1 argument")
	}
	if len(args) == 0 {
		args = append(args, DefaultRegistry)
		fmt.Println("login to default registry: hub.sealos.io.")
	}

	if err := setXDGRuntimeDir(); err != nil {
		return err
	}

	systemContext, err := parse.SystemContextFromOptions(c)
	if err != nil {
		return fmt.Errorf("building system context: %w", err)
	}
	ctx := getContext()
	iopts.loginOpts.GetLoginSet = flagChanged(c, "get-login")
	return auth.Login(ctx, systemContext, &iopts.loginOpts, args)
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
