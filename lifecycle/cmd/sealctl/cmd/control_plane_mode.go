// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package cmd

import (
	"time"

	"github.com/labring/sealos/pkg/runtime/kubernetes/standalone"
	"github.com/spf13/cobra"
)

func newControlPlaneModeCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "switch",
		Short: "Switch the local control-plane kubelet mode",
	}
	for _, mode := range []string{standalone.ModeStandalone, standalone.ModeRegistered} {
		options := standalone.ModeOptions{
			Mode: mode,
		}
		subcommand := &cobra.Command{
			Use:   mode,
			Short: "Switch the local control plane to " + mode + " mode",
			Args:  cobra.NoArgs,
			RunE: func(cmd *cobra.Command, _ []string) error {
				options.ControllerFields = []string{}
				for _, name := range standalone.RouteControllerFlags {
					if cmd.Flags().Changed(name) {
						options.ControllerFields = append(options.ControllerFields, name)
					}
				}
				options.Output = cmd.OutOrStdout()
				return standalone.SwitchMode(cmd.Context(), options)
			},
		}
		subcommand.Flags().
			BoolVar(&options.CheckOnly, "check-only", false, "Check prerequisites without switching")
		subcommand.Flags().
			DurationVar(&options.Timeout, "timeout", 10*time.Minute, "Timeout for this host's conversion")
		if mode == standalone.ModeStandalone {
			subcommand.Flags().
				BoolVar(&options.UpdateController, "update-controller", false, "Update explicitly selected controller settings on a standalone host")
			controller := standalone.DefaultRouteControllerOptions()
			options.RouteController = &controller
			subcommand.Flags().
				StringVar(&controller.Image, "route-controller-image", controller.Image, "Route-controller image")
			subcommand.Flags().
				StringVar(&controller.Kubeconfig, "route-controller-kubeconfig", controller.Kubeconfig, "Dedicated controller kubeconfig path on this host")
			subcommand.Flags().
				StringVar(&controller.Config, "route-controller-config", "", "Optional controller configuration file on this host")
			subcommand.Flags().
				IntVar(&controller.Table, "route-table", controller.Table, "Routing table owned by route-controller")
			subcommand.Flags().
				IntVar(&controller.Protocol, "route-protocol", controller.Protocol, "Routing protocol owned by route-controller")
		}
		cmd.AddCommand(subcommand)
	}

	return cmd
}
