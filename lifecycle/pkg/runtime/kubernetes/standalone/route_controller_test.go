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
	"reflect"
	"testing"

	v1 "k8s.io/api/core/v1"
)

func TestGeneratedRouteControllerContract(t *testing.T) {
	options := DefaultRouteControllerOptions()
	pod, err := routeControllerPod(options)
	if err != nil {
		t.Fatal(err)
	}
	if pod.Name != "route-controller" || pod.Namespace != "kube-system" || !pod.Spec.HostNetwork ||
		len(pod.Spec.Containers) != 1 {
		t.Fatalf("invalid static Pod identity: %+v", pod)
	}
	container := pod.Spec.Containers[0]
	if container.Image != DefaultRouteControllerImage ||
		container.ImagePullPolicy != v1.PullIfNotPresent {
		t.Fatalf("unexpected image settings: %+v", container)
	}
	security := container.SecurityContext
	if *security.RunAsUser != 0 || *security.AllowPrivilegeEscalation ||
		!*security.ReadOnlyRootFilesystem ||
		!reflect.DeepEqual(security.Capabilities.Add, []v1.Capability{"NET_ADMIN"}) ||
		!reflect.DeepEqual(security.Capabilities.Drop, []v1.Capability{"ALL"}) {
		t.Fatalf("unexpected security context: %+v", security)
	}
	if len(pod.Spec.Volumes) != 1 ||
		pod.Spec.Volumes[0].HostPath.Path != DefaultRouteControllerKubeconfig ||
		*pod.Spec.Volumes[0].HostPath.Type != v1.HostPathFile {
		t.Fatalf("invalid kubeconfig mount: %+v", pod.Spec.Volumes)
	}
	if !container.VolumeMounts[0].ReadOnly ||
		flagValue(container.Args, "kubeconfig") != container.VolumeMounts[0].MountPath {
		t.Fatal("kubeconfig argument does not match its read-only mount")
	}
	for path, probe := range map[string]*v1.Probe{
		"/readyz":  container.ReadinessProbe,
		"/healthz": container.LivenessProbe,
	} {
		if probe == nil || probe.HTTPGet == nil || probe.HTTPGet.Path != path ||
			probe.HTTPGet.Host != "127.0.0.1" ||
			probe.HTTPGet.Port.IntVal != 9919 {
			t.Fatalf("invalid %s probe: %+v", path, probe)
		}
	}
	if container.StartupProbe == nil || container.StartupProbe.HTTPGet.Path != "/healthz" {
		t.Fatal("missing controller startup probe")
	}
}

func TestGeneratedRouteControllerExplicitOwnership(t *testing.T) {
	options := DefaultRouteControllerOptions()
	options.Image = "example.com/controller:v1"
	options.Config = "/etc/kubernetes/route-controller/config.yaml"
	options.Kubeconfig = "/etc/kubernetes/route-controller/custom.conf"
	options.Table = 200
	options.Protocol = 111
	pod, err := routeControllerPod(options)
	if err != nil {
		t.Fatal(err)
	}
	container := pod.Spec.Containers[0]
	for name, want := range map[string]string{
		"route-table":               "200",
		"route-protocol":            "111",
		"health-probe-bind-address": "127.0.0.1:9919",
		"config":                    controllerConfigMount,
		"kubeconfig":                controllerKubeconfigMount,
	} {
		if got := flagValue(container.Args, name); got != want {
			t.Fatalf("%s: got %q, want %q", name, got, want)
		}
	}
	if container.Image != options.Image || len(pod.Spec.Volumes) != 2 ||
		pod.Spec.Volumes[0].HostPath.Path != options.Kubeconfig ||
		pod.Spec.Volumes[1].HostPath.Path != options.Config {
		t.Fatalf("controller options lost: %+v", pod.Spec)
	}
}

func TestRouteControllerRejectsInvalidOptions(t *testing.T) {
	for name, change := range map[string]func(*RouteControllerOptions){
		"image": func(o *RouteControllerOptions) {
			o.Image = ""
		},
		"kubeconfig": func(o *RouteControllerOptions) {
			o.Kubeconfig = "relative.conf"
		},
		"config": func(o *RouteControllerOptions) {
			o.Config = "relative.yaml"
		},
		"table": func(o *RouteControllerOptions) {
			o.Table = 0
		},
		"protocol": func(o *RouteControllerOptions) {
			o.Protocol = 256
		},
	} {
		t.Run(name, func(t *testing.T) {
			options := DefaultRouteControllerOptions()
			change(&options)
			if _, err := routeControllerPod(options); err == nil {
				t.Fatal("accepted invalid controller options")
			}
		})
	}
}
