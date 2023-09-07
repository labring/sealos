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

	sreglog "github.com/labring/sreg/pkg/utils/logger"

	"github.com/spf13/cobra"
	"k8s.io/kubectl/pkg/util/templates"

	"github.com/labring/sealos/pkg/buildah"
	"github.com/labring/sealos/pkg/utils/logger"
)

var (
	debug bool
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "sealctl",
	Short: "sealctl is a command-line tool for managing and configuring the SealOS system.",
	// Uncomment the following line if your bare application
	// has an action associated with it:
	//	Run: func(cmd *cobra.Command, args []string) { },
}

// Execute adds all child commands to the root command and sets flags appropriately.
// This is called by main.main(). It only needs to happen once to the rootCmd.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		if rootCmd.SilenceErrors {
			fmt.Fprintln(os.Stderr, err)
		}
		os.Exit(1)
	}
}

func init() {
	cobra.OnInitialize(func() {
		logger.CfgConsoleLogger(debug, false)
		sreglog.CfgConsoleLogger(debug, false)
	})

	rootCmd.PersistentFlags().BoolVar(&debug, "debug", false, "enable debug logger")
	buildah.RegisterRootCommand(rootCmd)
	groups := templates.CommandGroups{
		{
			Message: "Network Management Commands:",
			Commands: []*cobra.Command{
				newHostsCmd(),
				newIPVSCmd(),
			},
		},
		{
			Message: "Machine Management Commands:",
			Commands: []*cobra.Command{
				newHostsNameCmd(),
				newInitSystemCmd(),
			},
		},
		{
			Message: "Cluster Management Commands:",
			Commands: []*cobra.Command{
				newCRICmd(),
				newCertCmd(),
				newStaticPodCmd(),
				newTokenCmd(),
			},
		},
		{
			Message:  "Container and Image Commands:",
			Commands: buildah.AllSubCommands(),
		},
	}
	groups.Add(rootCmd)
	filters := []string{}
	templates.ActsAsRootCommand(rootCmd, filters, groups...)
}
