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

	"github.com/labring/sealos/pkg/utils/exec"
	"github.com/labring/sealos/pkg/utils/logger"
)

func newKubeCmd() *cobra.Command {
	var fieldSelector, selector, kubeConfig, sources, namespace string
	var allNamespace bool
	var kubeCmd = &cobra.Command{
		Use:   "kube",
		Short: "kube resource list json",
		Run: func(cmd *cobra.Command, args []string) {
			template := "kubectl get %s %s %s %s %s -o json"
			ns := ""
			c := ""
			fs := ""
			ls := ""
			if allNamespace {
				ns = "--all-namespaces"
			} else {
				if namespace != "" {
					ns = "-n " + namespace
				}
			}

			if kubeConfig != "" {
				c = "--kubeconfig=" + kubeConfig
			}
			if fieldSelector != "" {
				c = "--field-selector=" + fieldSelector
			}
			if selector != "" {
				c = "--selector=" + selector
			}
			data, err := exec.RunBashCmd(fmt.Sprintf(template, sources, ns, c, fs, ls))
			if err != nil {
				logger.Error(err)
				os.Exit(1)
			}
			println(data)
		},
	}
	kubeCmd.Flags().BoolVar(&allNamespace, "--all-namespaces", false, " If present, list the requested object(s) across all namespaces. Namespace in current\ncontext is ignored even if specified with --namespace.")
	kubeCmd.Flags().StringVar(&namespace, "namespace", "", "kubernetes namespace")
	kubeCmd.Flags().StringVar(&sources, "sources", "nodes", "e.g. pods,deployments")
	kubeCmd.Flags().StringVar(&fieldSelector, "field-selector", "", "Selector (field query) to filter on, supports '=', '==', and '!='.(e.g. --field-selector\nkey1=value1,key2=value2). The server only supports a limited number of field queries per type.")
	kubeCmd.Flags().StringVar(&selector, "selector", "", "Selector (label query) to filter on, supports '=', '==', and '!='.(e.g. -l key1=value1,key2=value2)")
	kubeCmd.Flags().StringVar(&kubeConfig, "kubeconfig", "", "Path to the kubeconfig file to use for CLI requests.")

	return kubeCmd
}

func init() {
	rootCmd.AddCommand(newKubeCmd())
}
