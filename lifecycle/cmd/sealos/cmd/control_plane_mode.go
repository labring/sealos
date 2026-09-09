// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package cmd

import (
	"errors"
	"fmt"
	"time"

	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/runtime/factory"
	"github.com/labring/sealos/pkg/runtime/kubernetes"
	"github.com/labring/sealos/pkg/runtime/kubernetes/standalone"
	"github.com/labring/sealos/pkg/utils/confirm"
	"github.com/spf13/cobra"
)

func newControlPlaneModeCmd() *cobra.Command {
	return newControlPlaneModeCmdWithConfirm(confirm.Confirm)
}

func newControlPlaneModeCmdWithConfirm(ask func(string, string) (bool, error)) *cobra.Command {
	var name string
	cmd := &cobra.Command{
		Use:   "switch",
		Short: "Switch the control-plane kubelet mode",
	}
	cmd.PersistentFlags().StringVarP(&name, "cluster", "c", "default", "Cluster inventory name")
	for _, mode := range []string{standalone.ModeStandalone, standalone.ModeRegistered} {
		var yes bool
		options := standalone.ModeOptions{
			Mode: mode,
		}
		subcommand := &cobra.Command{
			Use:   mode,
			Short: "Switch all control planes to " + mode + " mode",
			Args:  cobra.NoArgs,
			PreRunE: func(_ *cobra.Command, _ []string) error {
				if yes || options.CheckOnly {
					return nil
				}
				prompt := fmt.Sprintf(
					"Switch all control-plane kubelets in cluster %q to %s mode?",
					name,
					options.Mode,
				)
				prompt += " This writes configuration and restarts kubelet. The administrator is responsible for workload and Node cleanup and must reboot each host afterwards."
				accepted, err := ask(prompt, "Control-plane mode switch cancelled")
				if err != nil {
					return fmt.Errorf("confirm control-plane mode switch: %w", err)
				}
				if !accepted {
					return errors.New("control-plane mode switch cancelled")
				}
				return nil
			},
			RunE: func(cmd *cobra.Command, _ []string) error {
				options.ControllerFields = []string{}
				for _, name := range standalone.RouteControllerFlags {
					if cmd.Flags().Changed(name) {
						options.ControllerFields = append(options.ControllerFields, name)
					}
				}
				release, err := clusterfile.LockMaintenance(name, true)
				if err != nil {
					return err
				}
				defer release()
				cf := clusterfile.NewClusterFile(constants.Clusterfile(name))
				if err := cf.Process(); err != nil {
					return err
				}
				rt, err := factory.New(cf.GetCluster(), cf.GetRuntimeConfig())
				if err != nil {
					return err
				}
				kubeadm, ok := rt.(*kubernetes.KubeadmRuntime)
				if !ok {
					return errors.New(
						"control-plane conversion is supported only for kubeadm clusters",
					)
				}
				if err := kubeadm.SwitchControlPlaneMode(cmd.Context(), options); err != nil {
					return err
				}
				if !options.CheckOnly {
					cmd.Println(
						"Kubelet configuration applied and kubelet restarted. The administrator must clean up old workloads and Node objects as appropriate, then reboot the control-plane hosts.",
					)
					if options.Mode == standalone.ModeStandalone && !options.UpdateController {
						cmd.Println(
							"Route-controller reconciliation is asynchronous. Verify its readiness and Pod/Service connectivity after cleanup and reboot.",
						)
					}
				}
				return nil
			},
		}
		subcommand.Flags().
			BoolVar(&options.CheckOnly, "check-only", false, "Check every master without switching")
		subcommand.Flags().
			BoolVarP(&yes, "yes", "y", false, "Skip the interactive mode switch confirmation")
		subcommand.Flags().
			DurationVar(&options.Timeout, "timeout", 10*time.Minute, "Timeout for each master's conversion")
		if mode == standalone.ModeStandalone {
			subcommand.Flags().
				BoolVar(&options.UpdateController, "update-controller", false, "Update explicitly selected controller settings while remaining standalone")
			controller := standalone.DefaultRouteControllerOptions()
			options.RouteController = &controller
			subcommand.Flags().
				StringVar(&controller.Image, "route-controller-image", controller.Image, "Route-controller image; a pinned version or digest is recommended")
			subcommand.Flags().
				StringVar(&controller.Kubeconfig, "route-controller-kubeconfig", controller.Kubeconfig, "Dedicated controller kubeconfig path on every master")
			subcommand.Flags().
				StringVar(&controller.Config, "route-controller-config", "", "Optional controller configuration file on every master")
			subcommand.Flags().
				IntVar(&controller.Table, "route-table", controller.Table, "Routing table owned by route-controller")
			subcommand.Flags().
				IntVar(&controller.Protocol, "route-protocol", controller.Protocol, "Routing protocol owned by route-controller")
		}
		cmd.AddCommand(subcommand)
	}
	return cmd
}
