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
)

func newLogoutCommand() *cobra.Command {
	var (
		opts = auth.LogoutOptions{
			Stdout:             os.Stdout,
			AcceptRepositories: true,
		}
		logoutDescription = "Remove the cached username and password for the registry."
	)
	logoutCommand := &cobra.Command{
		Use:   "logout",
		Short: "Logout of a container registry",
		Long:  logoutDescription,
		RunE: func(cmd *cobra.Command, args []string) error {
			return logoutCmd(cmd, args, &opts)
		},
		Example: fmt.Sprintf(`%s logout quay.io`, rootCmd.CommandPath()),
	}
	logoutCommand.SetUsageTemplate(UsageTemplate())

	flags := auth.GetLogoutFlags(&opts)
	flags.SetInterspersed(false)
	logoutCommand.Flags().AddFlagSet(flags)
	return logoutCommand
}

func logoutCmd(c *cobra.Command, args []string, iopts *auth.LogoutOptions) error {
	if len(args) > 1 {
		return errors.New("too many arguments, logout takes at most 1 argument")
	}
	if len(args) == 0 && !iopts.All {
		return errors.New("registry must be given")
	}

	if err := setXDGRuntimeDir(); err != nil {
		return err
	}

	systemContext, err := parse.SystemContextFromOptions(c)
	if err != nil {
		return fmt.Errorf("building system context: %w", err)
	}
	return auth.Logout(systemContext, iopts, args)
}
