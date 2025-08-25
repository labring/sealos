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

	"github.com/spf13/cobra"
	"k8s.io/apimachinery/pkg/util/json"

	runtimeutils "github.com/labring/sealos/pkg/runtime/utils"
	"github.com/labring/sealos/pkg/utils/logger"
)

func newTokenCmd() *cobra.Command {
	var tokenCmd = &cobra.Command{
		Use:   "token",
		Short: "token generator",
		Run: func(cmd *cobra.Command, args []string) {
			var config, certificateKey string
			if len(args) > 0 {
				config = args[0]
			}
			if len(args) > 1 {
				certificateKey = args[1]
			}
			t, err := runtimeutils.GenerateToken(config, certificateKey)
			if err != nil {
				logger.Error("exec token error: " + err.Error())
				os.Exit(1)
			}
			data, _ := json.Marshal(t)
			fmt.Println(string(data))
		},
	}
	return tokenCmd
}
