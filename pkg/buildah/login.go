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
)

type loginReply struct {
	loginOpts auth.LoginOptions
	getLogin  bool
	tlsVerify bool
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
		RunE: func(cmd *cobra.Command, args []string) error {
			return loginCmd(cmd, args, &opts)
		},
		Example: fmt.Sprintf(`%s login quay.io`, rootCmd.Name()),
	}
	loginCommand.SetUsageTemplate(UsageTemplate())

	opts.RegisterFlags(loginCommand.Flags())
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
