/*
Copyright © 2020 NAME HERE <EMAIL ADDRESS>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/fanux/sealos/install"
	"github.com/wonderivan/logger"
)

func init() {
	rootCmd.AddCommand(NewUpgradeCmd())
}

var (
	newVersion string
	newPkgUrl  string
)

func NewUpgradeCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:    "upgrade",
		Short:  "upgrade your kubernetes version by sealos",
		Run:    UpgradeCmdFunc,
		PreRun: PreRunUpgradeCmdFunc,
	}
	cmd.Flags().StringVar(&newVersion, "version", "", "upgrade version for kubernetes version")
	cmd.Flags().StringVar(&newPkgUrl, "pkg-url", "", "http://store.lameleg.com/kube1.14.1.tar.gz download offline package url, or file location ex. /root/kube1.14.1.tar.gz")
	cmd.Flags().BoolVarP(&force, "force", "f", false, "upgrade need interactive to confirm")
	return cmd
}

func UpgradeCmdFunc(cmd *cobra.Command, args []string) {
	if !force {
		prompt := fmt.Sprintf("upgrade cmd will upgrade your kubernetes cluster immediately \n" +
			"Are you sure you want to proceed with the upgrade?  (y/n)?")
		result := install.Confirm(prompt)
		if !result {
			logger.Info("upgrade is skip, Exit")
			os.Exit(-1)
		}
	}
	u := install.NewUpgrade(newVersion, newPkgUrl)
	u.SetUP()
	u.Dump(cfgFile)
}

func PreRunUpgradeCmdFunc(cmd *cobra.Command, args []string) {
	if err := install.ExitUpgradeCase(newVersion, newPkgUrl, cfgFile); err != nil {
		logger.Error("PreRun error: ", err)
		os.Exit(1)
	}
}
