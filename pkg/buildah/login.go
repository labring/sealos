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
	"net/url"
	"os"

	"github.com/containers/buildah/pkg/parse"
	"github.com/containers/common/pkg/auth"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
	"k8s.io/client-go/tools/clientcmd"

	fileutil "github.com/labring/sealos/pkg/utils/file"
)

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

		PreRunE: func(cmd *cobra.Command, args []string) error {
			if opts.kubeconfig == "" {
				return nil
			}
			// username is current context kubeconfig user id
			username, err := GetCurrentUserFromKubeConfig(opts.kubeconfig)
			if err != nil {
				return err
			}
			// set user/password
			passwordb, err := fileutil.ReadAll(opts.kubeconfig)
			if err != nil {
				return err
			}
			opts.loginOpts.Username = username
			opts.loginOpts.Password = string(passwordb)
			return nil
		},
		RunE: func(cmd *cobra.Command, args []string) error {
			return loginCmd(cmd, args, &opts)
		},
		PostRunE: func(cmd *cobra.Command, args []string) error {
			if opts.kubeconfig == "" {
				return nil
			}
			// config will be copyed to $(HOME)/.sealos/$(args[0]).HOST/$(user)/config
			registryHost, err := parseRawURL(args[0])
			if err != nil {
				return err
			}
			sealosKubeConfdir := fmt.Sprintf("%s/%s/%s/%s", os.Getenv("HOME"), ".sealos", registryHost, opts.loginOpts.Username)
			if err := fileutil.MkDirs(sealosKubeConfdir); err != nil {
				return err
			}
			sealosKubeconfPath := fmt.Sprintf("%s/%s", sealosKubeConfdir, "config")
			// copy file, will overwrite the original file
			if err := fileutil.Copy(opts.kubeconfig, sealosKubeconfPath); err != nil {
				return err
			}
			return nil
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
		return errors.New("please specify a registry to login to")
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

func parseRawURL(rawurl string) (domain string, err error) {
	u, err := url.ParseRequestURI(rawurl)
	if err != nil || u.Host == "" {
		u, repErr := url.ParseRequestURI("https://" + rawurl)
		if repErr != nil {
			fmt.Printf("Could not parse raw url: %s, error: %v", rawurl, err)
			return
		}
		domain = u.Host
		err = nil
		return
	}
	domain = u.Host
	return
}
