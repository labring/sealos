// Copyright © 2026 sealos.
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
	"time"

	"github.com/labring/sealos/pkg/runtime/kubernetes/standalone"
	"github.com/spf13/cobra"
)

func newStandaloneUpgradeCmd() *cobra.Command {
	var options standalone.Options
	cmd := &cobra.Command{
		Use:   "standalone-upgrade",
		Short: "Upgrade a standalone control plane on the local host",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			options.Output = cmd.OutOrStdout()
			return standalone.Run(cmd.Context(), options)
		},
	}
	cmd.Flags().StringVar(&options.Config, "config", "", "ClusterConfiguration file")
	cmd.Flags().StringVar(&options.Version, "version", "", "Target Kubernetes version")
	cmd.Flags().
		StringVar(&options.BinaryDir, "binary-dir", "", "Directory containing the target kubeadm, kubelet and kubectl")
	cmd.Flags().
		StringVar(&options.PatchesDir, "patches", "", "Absolute directory of kubeadm static Pod patches on this host")
	cmd.Flags().
		BoolVar(&options.CheckOnly, "check-only", false, "Check prerequisites and prepare manifests without replacing running components")
	cmd.Flags().
		DurationVar(&options.Timeout, "timeout", 5*time.Minute, "Timeout for snapshot and component readiness")
	return cmd
}
