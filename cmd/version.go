// Copyright © 2019 NAME HERE <EMAIL ADDRESS>
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

	"github.com/fanux/sealos/version"
	"github.com/spf13/cobra"
	"github.com/wangle201210/githubapi/repos"
	"github.com/ysicing/ext/utils/exmisc"
)

// versionCmd represents the version command
var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "show sealos version",
	Long:  `show sealos version`,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println(version.VersionStr)
		lastversion := GetVersion()
		if lastversion != nil {
			fmt.Printf("sealos current latest version is %v\n", exmisc.SGreen(*lastversion))
		}
	},
}

func init() {
	rootCmd.AddCommand(versionCmd)

	// Here you will define your flags and configuration settings.

	// Cobra supports Persistent Flags which will work for this command
	// and all subcommands, e.g.:
	// versionCmd.PersistentFlags().String("foo", "", "A help for foo")

	// Cobra supports local flags which will only run when this command
	// is called directly, e.g.:
	// versionCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")
}

// GetVersion 获取最新版本
func GetVersion() *string {
	pkg := repos.Pkg{
		Owner: "fanux",
		Repo:  "sealos",
	}
	lasttag, _ := pkg.LastTag()
	if lasttag.Name != version.Version {
		return &lasttag.Name
	}
	return nil
}
