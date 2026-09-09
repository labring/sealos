// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package standalone

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"

	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
	"sigs.k8s.io/yaml"
)

func SavedRouteControllerOptions() (RouteControllerOptions, error) {
	data, err := os.ReadFile(filepath.Join(modeRoot, "state.json"))
	if err != nil {
		return RouteControllerOptions{}, err
	}
	var state modeState
	if err := json.Unmarshal(data, &state); err != nil {
		return RouteControllerOptions{}, err
	}
	if state.Mode != ModeStandalone || state.Target != "" {
		return RouteControllerOptions{}, errors.New(
			"controller baseline is not a completed standalone deployment",
		)
	}
	return routeOptionsFromState(&state)
}

func routeOptionsFromState(state *modeState) (RouteControllerOptions, error) {
	var pod v1.Pod
	if err := yaml.Unmarshal(state.RouteManifest, &pod); err != nil {
		return RouteControllerOptions{}, err
	}
	if len(pod.Spec.Containers) != 1 {
		return RouteControllerOptions{}, errors.New("invalid controller baseline")
	}
	options := RouteControllerOptions{
		Image:    pod.Spec.Containers[0].Image,
		Table:    state.RouteTable,
		Protocol: state.RouteProtocol,
	}
	for _, volume := range pod.Spec.Volumes {
		if volume.HostPath == nil {
			continue
		}
		switch volume.Name {
		case "kubeconfig":
			options.Kubeconfig = volume.HostPath.Path
		case "config":
			options.Config = volume.HostPath.Path
		}
	}
	return options, options.Validate()
}

const (
	DefaultRouteControllerImage      = "ghcr.io/zijiren233/route-controller:main"
	DefaultRouteControllerKubeconfig = "/etc/kubernetes/route-controller/kubeconfig"
	controllerKubeconfigMount        = "/etc/route-controller/kubeconfig"
	controllerConfigMount            = "/etc/route-controller/config.yaml"
)

type RouteControllerOptions struct {
	Image      string `json:"Image"`
	Kubeconfig string `json:"Kubeconfig"`
	Config     string `json:"Config"`
	Table      int    `json:"Table"`
	Protocol   int    `json:"Protocol"`
}

func DefaultRouteControllerOptions() RouteControllerOptions {
	return RouteControllerOptions{
		Image:      DefaultRouteControllerImage,
		Kubeconfig: DefaultRouteControllerKubeconfig,
		Table:      254,
		Protocol:   99,
	}
}

func (o RouteControllerOptions) Validate() error {
	if o.Image == "" || !filepath.IsAbs(o.Kubeconfig) {
		return errors.New("route-controller requires an image and an absolute kubeconfig path")
	}
	if o.Config != "" && !filepath.IsAbs(o.Config) {
		return errors.New("route-controller config path must be absolute")
	}
	if o.Table <= 0 || o.Table > 2147483647 || o.Protocol < 1 || o.Protocol > 255 {
		return errors.New("route-controller requires route table 1..2147483647 and protocol 1..255")
	}
	return nil
}

func routeControllerPod(options RouteControllerOptions) (*v1.Pod, error) {
	if err := options.Validate(); err != nil {
		return nil, err
	}
	root := int64(0)
	disabled := false
	enabled := true
	grace := int64(15)
	fileType := v1.HostPathFile
	args := []string{
		"run",
		"--kubeconfig=" + controllerKubeconfigMount,
		"--route-table=" + strconv.Itoa(options.Table),
		"--route-protocol=" + strconv.Itoa(options.Protocol),
		"--health-probe-bind-address=127.0.0.1:9919",
	}
	if options.Config != "" {
		args = append(args, "--config="+controllerConfigMount)
	}
	pod := &v1.Pod{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "v1",
			Kind:       "Pod",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "route-controller",
			Namespace: "kube-system",
		},
		Spec: v1.PodSpec{
			HostNetwork:                   true,
			PriorityClassName:             "system-node-critical",
			RestartPolicy:                 v1.RestartPolicyAlways,
			TerminationGracePeriodSeconds: &grace,
			Containers: []v1.Container{
				{
					Name:            "controller",
					Image:           options.Image,
					ImagePullPolicy: v1.PullIfNotPresent,
					Args:            args,
					SecurityContext: &v1.SecurityContext{
						RunAsUser:                &root,
						RunAsGroup:               &root,
						RunAsNonRoot:             &disabled,
						AllowPrivilegeEscalation: &disabled,
						ReadOnlyRootFilesystem:   &enabled,
						SeccompProfile: &v1.SeccompProfile{
							Type: v1.SeccompProfileTypeRuntimeDefault,
						},
						Capabilities: &v1.Capabilities{
							Drop: []v1.Capability{"ALL"},
							Add:  []v1.Capability{"NET_ADMIN"},
						},
					},
					StartupProbe:   controllerProbe("/healthz", 2, 30),
					LivenessProbe:  controllerProbe("/healthz", 10, 3),
					ReadinessProbe: controllerProbe("/readyz", 5, 3),
					Resources: v1.ResourceRequirements{
						Requests: v1.ResourceList{
							v1.ResourceCPU:    resource.MustParse("20m"),
							v1.ResourceMemory: resource.MustParse("32Mi"),
						},
						Limits: v1.ResourceList{
							v1.ResourceCPU:    resource.MustParse("200m"),
							v1.ResourceMemory: resource.MustParse("128Mi"),
						},
					},
					VolumeMounts: []v1.VolumeMount{
						{
							Name:      "kubeconfig",
							MountPath: controllerKubeconfigMount,
							ReadOnly:  true,
						},
					},
				},
			},
			Volumes: []v1.Volume{
				{
					Name: "kubeconfig",
					VolumeSource: v1.VolumeSource{
						HostPath: &v1.HostPathVolumeSource{
							Path: options.Kubeconfig,
							Type: &fileType,
						},
					},
				},
			},
		},
	}
	if options.Config != "" {
		pod.Spec.Containers[0].VolumeMounts = append(
			pod.Spec.Containers[0].VolumeMounts,
			v1.VolumeMount{
				Name:      "config",
				MountPath: controllerConfigMount,
				ReadOnly:  true,
			},
		)
		pod.Spec.Volumes = append(pod.Spec.Volumes, v1.Volume{
			Name: "config",
			VolumeSource: v1.VolumeSource{
				HostPath: &v1.HostPathVolumeSource{
					Path: options.Config,
					Type: &fileType,
				},
			},
		})
	}
	return pod, nil
}

// The administrator provisions these host files before any lifecycle operation.
func prepareRouteController(options RouteControllerOptions) ([]byte, error) {
	pod, err := routeControllerPod(options)
	if err != nil {
		return nil, err
	}
	for _, volume := range pod.Spec.Volumes {
		info, err := os.Stat(volume.HostPath.Path)
		if err != nil {
			return nil, fmt.Errorf("route-controller hostPath: %w", err)
		}
		if !info.Mode().IsRegular() {
			return nil, fmt.Errorf(
				"route-controller hostPath must be a regular file: %s",
				volume.HostPath.Path,
			)
		}
	}
	return yaml.Marshal(pod)
}

func controllerProbe(path string, period, failures int32) *v1.Probe {
	return &v1.Probe{
		ProbeHandler: v1.ProbeHandler{
			HTTPGet: &v1.HTTPGetAction{
				Host: "127.0.0.1",
				Path: path,
				Port: intstr.FromInt32(9919),
			},
		},
		PeriodSeconds:    period,
		FailureThreshold: failures,
		TimeoutSeconds:   2,
	}
}
