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
	"io"
	"os"

	sreglog "github.com/labring/sreg/pkg/utils/logger"
	"github.com/spf13/cobra"
	"k8s.io/kubectl/pkg/util/templates"

	"github.com/labring/sealos/pkg/buildah"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/system"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
)

var (
	debug bool
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "sealos",
	Short: "sealos is a Kubernetes distribution, a unified OS to manage cloud native applications.",
	// Uncomment the following line if your bare application
	// has an action associated with it:
	//	Run: func(cmd *cobra.Command, args []string) { },
}

// Execute adds all child commands to the root command and sets flags appropriately.
// This is called by main.main(). It only needs to happen once to the rootCmd.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		if rootCmd.SilenceErrors {
			fmt.Println(err)
		}
		os.Exit(1)
	}
}

func init() {
	cobra.OnInitialize(onBootOnDie)
	rootCmd.PersistentFlags().BoolVar(&debug, "debug", false, "enable debug logger")
	buildah.RegisterRootCommand(rootCmd)

	groups := templates.CommandGroups{
		{
			Message: "Cluster Management Commands:",
			Commands: []*cobra.Command{
				newApplyCmd(),
				newCertCmd(),
				newRunCmd(),
				newResetCmd(),
				newStatusCmd(),
			},
		},
		{
			Message: "Node Management Commands:",
			Commands: []*cobra.Command{
				newAddCmd(),
				newDeleteCmd(),
			},
		},
		{
			Message: "Remote Operation Commands:",
			Commands: []*cobra.Command{
				newExecCmd(),
				newScpCmd(),
			},
		},
		{
			Message: "Experimental Commands:",
			Commands: []*cobra.Command{
				newRegistryCmd(rootCmd.Name()),
			},
		},
		{
			Message:  "Container and Image Commands:",
			Commands: buildah.AllSubCommands(),
		},
	}
	groups.Add(rootCmd)
	filters := []string{"options"}
	templates.ActsAsRootCommand(rootCmd, filters, groups...)

	rootCmd.AddCommand(system.NewEnvCmd(constants.AppName))
	rootCmd.AddCommand(optionsCommand(os.Stdout))
}

func setRequireBuildahAnnotation(cmd *cobra.Command) {
	buildah.SetRequireBuildahAnnotation(cmd)
}

func onBootOnDie() {
	val, err := system.Get(system.DataRootConfigKey)
	errExit(err)
	constants.DefaultClusterRootFsDir = val
	val, err = system.Get(system.RuntimeRootConfigKey)
	errExit(err)
	constants.DefaultRuntimeRootDir = val

	var rootDirs = []string{
		constants.LogPath(),
		constants.WorkDir(),
	}
	errExit(file.MkDirs(rootDirs...))

	logger.CfgConsoleAndFileLogger(debug, constants.LogPath(), "sealos", false)
	sreglog.CfgConsoleAndFileLogger(debug, constants.LogPath(), "sealos", false)
}

func errExit(err error) {
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func optionsCommand(out io.Writer) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "options",
		Short: "Print the list of flags inherited by all commands",
		RunE: func(cmd *cobra.Command, args []string) error {
			return cmd.Usage()
		},
	}
	cmd.SetOut(out)
	cmd.SetErr(out)

	templates.UseOptionsTemplates(cmd)
	return cmd
}
