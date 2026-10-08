// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package cmd

import "github.com/spf13/cobra"

func newSwitchCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "switch",
		Short: "Switch cluster configuration",
	}
	cmd.PersistentFlags().StringP("cluster", "c", "default", "Cluster inventory name")
	cmd.AddCommand(newControlPlaneModeCmd())
	return cmd
}
