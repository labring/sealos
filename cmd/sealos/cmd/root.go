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
	"errors"
	"fmt"
	"github.com/labring/sealos/pkg/buildah"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/system"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"os"
	"strconv"

	"github.com/spf13/cobra"
	"k8s.io/kubectl/pkg/util/templates"
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
			Message:  "Container and Image Commands:",
			Commands: buildah.AllSubCommands(),
		},
	}
	groups.Add(rootCmd)
	filters := []string{}
	templates.ActsAsRootCommand(rootCmd, filters, groups...)
	rootCmd.AddCommand(system.NewConfigCmd())
}

// add unrelated command names that don't required buildah sdk.
func setCommandUnrelatedToBuildah(cmd *cobra.Command) {
	buildah.AddUnrelatedCommandNames(cmd.Name())
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
		constants.Workdir(),
	}

	userName := getSudoUser()
	uid, err := GetIntEnv("SUDO_UID")
	if err != nil {
		fmt.Errorf("%v", err)
	}
	gid, err := GetIntEnv("SUDO_GID")
	if err != nil {
		fmt.Errorf("%v", err)
	}
	_ = file.NewSudoEr(userName, uid, gid)
	//sudoEr := file.NewSudoEr(userName, uid, gid)
	//errExit(sudoEr.SudoMkDirs(rootDirs...))

	errExit(file.MkDirs(rootDirs...))
	logger.CfgConsoleAndFileLogger(debug, constants.LogPath(), "sealos", false)
}

func errExit(err error) {
	if err != nil {
		logger.Error(err)
		os.Exit(1)
	}
}

func getSudoUser() string {
	whoAmI, ok := os.LookupEnv("SUDO_USER")
	if !ok {
		fmt.Errorf("%s not set\n", "SUDO_USER")
		return ""
	} else {
		fmt.Errorf("%s=%s\n", "SUDO_USER", whoAmI)
	}
	return whoAmI
}

func GetIntEnv(key string) (int, error) {
	value, ok := os.LookupEnv(key)
	if !ok {
		msg := fmt.Sprintf("env %s not found", key)
		return -1, errors.New(msg)
	}
	intValue, err := strconv.Atoi(value)
	if err != nil {
		msg := fmt.Sprintf("The value of %s cannot covert to int ", key)
		return -1, errors.New(msg)
	}
	return intValue, nil
}
