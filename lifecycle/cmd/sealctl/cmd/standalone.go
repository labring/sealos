// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package cmd

import (
	"encoding/json"
	"time"

	"github.com/labring/sealos/pkg/runtime/kubernetes/standalone"
	"github.com/spf13/cobra"
)

func newStandaloneCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "standalone",
		Short: "Maintain a standalone control-plane host",
	}
	bootstrap := standalone.BootstrapOptions{}
	bootstrapCmd := &cobra.Command{
		Use:   "bootstrap",
		Short: "Initialize or join without registering a control-plane Node",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			bootstrap.Output = cmd.OutOrStdout()
			return standalone.Bootstrap(cmd.Context(), bootstrap)
		},
	}
	bootstrapCmd.Flags().StringVar(&bootstrap.PlanPath, "plan", "", "Private bootstrap plan file")
	_ = bootstrapCmd.MarkFlagRequired("plan")
	bootstrapCmd.Flags().
		BoolVar(&bootstrap.CheckOnly, "check-only", false, "Check bootstrap prerequisites")
	bootstrapCmd.Flags().
		DurationVar(&bootstrap.Timeout, "timeout", 10*time.Minute, "Bootstrap timeout")
	reset := standalone.ResetOptions{}
	resetCmd := &cobra.Command{
		Use:   "reset",
		Short: "Remove a standalone control plane and its managed routes",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			reset.Output = cmd.OutOrStdout()
			return standalone.Reset(cmd.Context(), reset)
		},
	}
	resetCmd.Flags().
		BoolVar(&reset.DestroyCluster, "destroy-cluster", false, "Destroy this host as part of a whole-cluster reset")
	resetCmd.Flags().
		BoolVar(&reset.AllowUninitialized, "allow-uninitialized", false, "Allow whole-cluster reset to include hosts without Kubernetes credentials or manifests")
	resetCmd.Flags().BoolVar(&reset.CheckOnly, "check-only", false, "Check removal prerequisites")
	resetCmd.Flags().DurationVar(&reset.Timeout, "timeout", 10*time.Minute, "Removal timeout")
	controllerCmd := &cobra.Command{
		Use:   "controller-config",
		Short: "Print the managed controller deployment settings",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			options, err := standalone.SavedRouteControllerOptions()
			if err != nil {
				return err
			}
			return json.NewEncoder(cmd.OutOrStdout()).Encode(options)
		},
	}
	etcdCmd := &cobra.Command{
		Use:   "etcd-endpoints",
		Short: "Print voting member client endpoints from the local etcd cluster",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			endpoints, err := standalone.EtcdEndpoints(cmd.Context())
			if err != nil {
				return err
			}
			return json.NewEncoder(cmd.OutOrStdout()).Encode(endpoints)
		},
	}
	cmd.AddCommand(bootstrapCmd, resetCmd, controllerCmd, etcdCmd)
	return cmd
}
