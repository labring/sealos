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

package standalone

import (
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	v1 "k8s.io/api/core/v1"
	cri "k8s.io/cri-api/pkg/apis/runtime/v1"
	"sigs.k8s.io/yaml"
)

var RouteControllerFlags = []string{
	"route-controller-enabled",
	"route-controller-image",
	"route-controller-kubeconfig",
	"route-controller-config",
	"route-controller-pod-cidr",
	"route-controller-service-cidr",
	"route-controller-router-cidr",
	"route-table",
	"route-protocol",
}

type controllerUpdate struct {
	PreviousTable    int `json:"PreviousTable"`
	PreviousProtocol int `json:"PreviousProtocol"`
	// ManagedCredentials records whether the replaced deployment generated
	// the managed kubeconfig, so a disable can drop the file.
	ManagedCredentials bool `json:"ManagedCredentials"`
}

func mergeControllerOptions(
	current, requested RouteControllerOptions,
	fields []string,
) (RouteControllerOptions, error) {
	if fields == nil {
		return requested, requested.Validate()
	}
	for _, field := range fields {
		switch field {
		case "route-controller-enabled":
			current.Enabled = requested.Enabled
		case "route-controller-image":
			current.Image = requested.Image
		case "route-controller-kubeconfig":
			current.Kubeconfig = requested.Kubeconfig
		case "route-controller-config":
			current.Config = requested.Config
		case "route-controller-pod-cidr":
			current.PodCIDR = requested.PodCIDR
		case "route-controller-service-cidr":
			current.ServiceCIDR = requested.ServiceCIDR
		case "route-controller-router-cidr":
			current.RouterCIDR = requested.RouterCIDR
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
		return errors.New("controller update requires deployment options")
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
			return errors.New(
				"a controller update is pending; repeat its original flags or switch to registered",
			)
		}
		return nil
	}
	if m.state.Target != "" {
		return errors.New("finish the current mode conversion before updating route-controller")
	}
	var previous v1.Pod
	managedCredentials := false
	if len(m.state.RouteManifest) != 0 {
		if err := yaml.Unmarshal(m.state.RouteManifest, &previous); err != nil {
			return err
		}
		managedCredentials = previous.Annotations[controllerCredentialsAnnotation] == "managed"
	}
	manifest, err := prepareRouteController(desired)
	if err != nil {
		return err
	}
	if desired.Enabled &&
		(desired.Table != current.Table || desired.Protocol != current.Protocol) {
		if err := reservedRoutesEmpty(desired.Table, desired.Protocol); err != nil {
			return err
		}
	}
	m.state.ControllerUpdate = &controllerUpdate{
		PreviousTable:      current.Table,
		PreviousProtocol:   current.Protocol,
		ManagedCredentials: managedCredentials,
	}
	m.state.ControllerDisabled = !desired.Enabled
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
		if sandbox.Metadata.GetNamespace() != "kube-system" ||
			sandbox.Metadata.GetName() != "route-controller-"+m.state.Node.Name {
			continue
		}
		if _, err := m.runtime.StopPodSandbox(
			ctx,
			&cri.StopPodSandboxRequest{PodSandboxId: sandbox.Id},
		); err != nil {
			return err
		}
	}
	return nil
}

func (m *modeSwitch) updateController(ctx context.Context) (err error) {
	if !m.state.ControllerDisabled {
		if err := ensureControllerCredentials(ctx, m.controller); err != nil {
			return err
		}
	}
	if err := m.command(ctx, "stop", "kubelet"); err != nil {
		return err
	}
	defer func() {
		if err != nil {
			recovery, cancel := context.WithTimeout(context.Background(), time.Minute)
			defer cancel()
			err = errors.Join(err, m.command(recovery, "start", "kubelet"))
		}
	}()
	if err := m.stopController(ctx); err != nil {
		return err
	}
	previous := m.state.ControllerUpdate
	if err := removeReservedRoutes(previous.PreviousTable, previous.PreviousProtocol); err != nil {
		return err
	}
	if m.state.ControllerDisabled {
		// Nothing reprograms the table once the controller is gone; drop the
		// routes it owned under the requested pair, and the managed
		// kubeconfig the disabled deployment generated.
		if err := removeReservedRoutes(m.state.RouteTable, m.state.RouteProtocol); err != nil {
			return err
		}
		if previous.ManagedCredentials {
			err := os.Remove(DefaultRouteControllerKubeconfig)
			if err != nil && !os.IsNotExist(err) {
				return err
			}
		}
	}
	if len(m.state.RouteManifest) != 0 {
		if err := atomicModeFile(routeManifestPath, m.state.RouteManifest, 0o600); err != nil {
			return err
		}
	}
	return m.command(ctx, "start", "kubelet")
}
