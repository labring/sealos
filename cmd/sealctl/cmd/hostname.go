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
	"os"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/spf13/cobra"
)

// hostnameCmd represents the cert command
var hostnameCmd = &cobra.Command{
	Use:   "hostname",
	Short: "get os.hostname",
	Run: func(cmd *cobra.Command, args []string) {
		hostname, err := os.Hostname()
		if err != nil {
			logger.Error(err)
			os.Exit(1)
		}
		print(hostname)
	},
}

func init() {
	rootCmd.AddCommand(hostnameCmd)

	// Here you will define your flags and configuration settings.

	// Cobra supports Persistent Flags which will work for this command
	// and all subcommands, e.g.:
	// hostnameCmd.PersistentFlags().String("foo", "", "A help for foo")

	// Cobra supports local flags which will only run when this command
	// is called directly, e.g.:
	// hostnameCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")
}
