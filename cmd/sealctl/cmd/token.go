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
	"github.com/fanux/sealos/pkg/token"
	"os"

	"github.com/fanux/sealos/pkg/utils/logger"
	"github.com/spf13/cobra"
	"k8s.io/apimachinery/pkg/util/json"
)

func NewTokenCmd() *cobra.Command {
	var master bool
	var cmd = &cobra.Command{
		Use:   "token",
		Short: "token generator",
		Run: func(cmd *cobra.Command, args []string) {
			var t *token.Token
			var err error
			if master {
				t, err = token.Master()
			} else {
				t, err = token.Node()
			}
			if err != nil {
				logger.Error("exec token error: " + err.Error())
				os.Exit(1)
			}
			data, _ := json.Marshal(t)
			println(string(data))
		},
	}
	cmd.Flags().BoolVar(&master, "master", false, "generator token type")

	return cmd
}

func init() {
	rootCmd.AddCommand(NewTokenCmd())

	// Here you will define your flags and configuration settings.

	// Cobra supports Persistent Flags which will work for this command
	// and all subcommands, e.g.:
	// hostnameCmd.PersistentFlags().String("foo", "", "A help for foo")

	// Cobra supports local flags which will only run when this command
	// is called directly, e.g.:
	// hostnameCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")
}
