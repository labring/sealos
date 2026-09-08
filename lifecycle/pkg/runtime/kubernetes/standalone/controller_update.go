// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package standalone

import (
	"context"
	"fmt"
	"os"

	cri "k8s.io/cri-api/pkg/apis/runtime/v1"
	"sigs.k8s.io/yaml"
)

var RouteControllerFlags = []string{
	"route-controller-image",
	"route-controller-kubeconfig",
	"route-controller-config",
	"route-table",
	"route-protocol",
}

type controllerUpdate struct {
	PreviousTable    int
	PreviousProtocol int
}

func mergeControllerOptions(current, requested RouteControllerOptions, fields []string) (RouteControllerOptions, error) {
	if fields == nil {
		return requested, requested.Validate()
	}
	for _, field := range fields {
		switch field {
		case "route-controller-image":
			current.Image = requested.Image
		case "route-controller-kubeconfig":
			current.Kubeconfig = requested.Kubeconfig
		case "route-controller-config":
			current.Config = requested.Config
		case "route-table":
			current.Table = requested.Table
		case "route-protocol":
			current.Protocol = requested.Protocol
		default:
			return RouteControllerOptions{}, fmt.Errorf("unknown controller field %q", field)
		}
	}
	return current, current.Validate()
}

func (m *modeSwitch) prepareControllerUpdate() error {
	if m.RouteController == nil {
		return fmt.Errorf("controller update requires deployment options")
	}
	current, err := routeOptionsFromState(m.state)
	if err != nil {
		return err
	}
	desired, err := mergeControllerOptions(current, *m.RouteController, m.ControllerFields)
	if err != nil {
		return err
	}
	if m.state.ControllerUpdate != nil {
		if desired != current {
			return fmt.Errorf("a controller update is pending; repeat its original flags or switch to registered")
		}
		return nil
	}
	if m.state.Target != "" {
		return fmt.Errorf("finish the current mode conversion before updating route-controller")
	}
	pod, err := routeControllerPod(desired)
	if err != nil {
		return err
	}
	for _, volume := range pod.Spec.Volumes {
		info, err := os.Stat(volume.HostPath.Path)
		if err != nil || !info.Mode().IsRegular() {
			return fmt.Errorf("controller file %s must be provisioned before updating", volume.HostPath.Path)
		}
	}
	if desired.Table != current.Table || desired.Protocol != current.Protocol {
		if err := reservedRoutesEmpty(desired.Table, desired.Protocol); err != nil {
			return err
		}
	}
	manifest, err := yaml.Marshal(pod)
	if err != nil {
		return err
	}
	m.state.ControllerUpdate = &controllerUpdate{
		PreviousTable:    current.Table,
		PreviousProtocol: current.Protocol,
	}
	m.state.RouteManifest = manifest
	m.state.RouteTable = desired.Table
	m.state.RouteProtocol = desired.Protocol
	m.state.Target = ModeStandalone
	return nil
}

func (m *modeSwitch) stopController(ctx context.Context) error {
	if err := os.Remove(routeManifestPath); err != nil && !os.IsNotExist(err) {
		return err
	}
	sandboxes, err := m.runtime.ListPodSandbox(ctx, &cri.ListPodSandboxRequest{})
	if err != nil {
		return err
	}
	for _, sandbox := range sandboxes.Items {
		if sandbox.Metadata.GetNamespace() != "kube-system" || sandbox.Metadata.GetName() != "route-controller-"+m.state.Node.Name {
			continue
		}
		if _, err := m.runtime.StopPodSandbox(ctx, &cri.StopPodSandboxRequest{PodSandboxId: sandbox.Id}); err != nil {
			return err
		}
	}
	return nil
}

func (m *modeSwitch) updateController(ctx context.Context) error {
	if err := m.command(ctx, "stop", "kubelet"); err != nil {
		return err
	}
	if err := m.stopController(ctx); err != nil {
		return err
	}
	previous := m.state.ControllerUpdate
	if err := removeReservedRoutes(previous.PreviousTable, previous.PreviousProtocol); err != nil {
		return err
	}
	if err := atomicModeFile(routeManifestPath, m.state.RouteManifest, 0o600); err != nil {
		return err
	}
	return m.command(ctx, "start", "kubelet")
}
