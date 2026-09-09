// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package standalone

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"

	"golang.org/x/sys/unix"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/wait"
	clientset "k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	cri "k8s.io/cri-api/pkg/apis/runtime/v1"
	"sigs.k8s.io/yaml"
)

type ModeOptions struct {
	Mode             string
	RouteController  *RouteControllerOptions
	CheckOnly        bool
	Timeout          time.Duration
	Output           io.Writer
	UpdateController bool
	ControllerFields []string
}

type modeState struct {
	Version          int                        `json:"Version"`
	Mode             string                     `json:"Mode"`
	Target           string                     `json:"Target"`
	Node             *v1.Node                   `json:"Node"`
	RegisteredUID    types.UID                  `json:"RegisteredUID"`
	Args             []string                   `json:"Args"`
	ConfigPath       string                     `json:"ConfigPath"`
	KubeconfigPath   string                     `json:"KubeconfigPath"`
	Kubeconfig       []byte                     `json:"Kubeconfig"`
	Settings         map[string]json.RawMessage `json:"Settings"`
	Endpoint         string                     `json:"Endpoint"`
	RouteManifest    []byte                     `json:"RouteManifest"`
	RouteTable       int                        `json:"RouteTable"`
	RouteProtocol    int                        `json:"RouteProtocol"`
	ManagedService   bool                       `json:"ManagedService"`
	ControllerUpdate *controllerUpdate          `json:"ControllerUpdate"`
}

type modeSwitch struct {
	ModeOptions
	state      *modeState
	client     clientset.Interface
	runtime    *runtimeClient
	controller *v1.Pod
}

// SwitchMode runs on a control-plane host. The persistent baseline survives
// upgrades and failures; only an explicit registered request reconnects kubelet.
func SwitchMode(ctx context.Context, options ModeOptions) error {
	if runtime.GOOS != "linux" {
		return errors.New("control-plane conversion requires Linux")
	}
	if options.Mode != ModeStandalone && options.Mode != ModeRegistered {
		return errors.New("mode must be registered or standalone")
	}
	if options.Mode == ModeRegistered &&
		(options.RouteController != nil || options.UpdateController) {
		return errors.New("route-controller options are only valid for standalone mode")
	}
	if options.Timeout <= 0 {
		return errors.New("timeout must be positive")
	}
	if options.Output == nil {
		options.Output = io.Discard
	}
	ctx, cancel := context.WithTimeout(ctx, options.Timeout)
	defer cancel()
	lockDir := filepath.Dir(CompletedConfigPath)
	if err := os.MkdirAll(lockDir, 0o700); err != nil {
		return err
	}
	lock, err := os.OpenFile(filepath.Join(lockDir, "lock"), os.O_CREATE|os.O_RDWR, 0o600)
	if err != nil {
		return err
	}
	defer lock.Close()
	if err := unix.Flock(int(lock.Fd()), unix.LOCK_EX|unix.LOCK_NB); err != nil {
		return fmt.Errorf("another control-plane maintenance operation is running: %w", err)
	}
	defer unix.Flock(int(lock.Fd()), unix.LOCK_UN) //nolint:errcheck
	if err := checkPendingMaintenance("switch"); err != nil {
		return err
	}
	config, err := clientcmd.BuildConfigFromFlags("", "/etc/kubernetes/admin.conf")
	if err != nil {
		return err
	}
	// Admission webhooks may take up to 30 seconds before a fail-open decision.
	// The host operation context still bounds the complete conversion.
	config.Timeout = time.Minute
	client, err := clientset.NewForConfig(config)
	if err != nil {
		return err
	}
	m := &modeSwitch{
		ModeOptions: options,
		client:      client,
	}
	defer func() {
		if m.runtime != nil {
			m.runtime.close()
		}
	}()
	if err := m.prepare(ctx); err != nil {
		return fmt.Errorf("mode conversion preflight: %w", err)
	}
	if options.CheckOnly || m.state == nil {
		return nil
	}
	if m.state.Mode == options.Mode && m.state.Target == "" {
		return m.waitReady(ctx, options.UpdateController)
	}
	m.state.Target = options.Mode
	if err := m.save(); err != nil {
		return err
	}
	switch {
	case options.Mode == ModeStandalone && m.state.ControllerUpdate != nil:
		err = m.updateController(ctx)
	case options.Mode == ModeStandalone:
		err = m.toStandalone(ctx)
	default:
		err = m.toRegistered(ctx)
	}
	if err != nil {
		return fmt.Errorf(
			"conversion paused; repeat the command to resume or explicitly request the opposite mode; state: %s: %w",
			modeRoot,
			err,
		)
	}
	// Conversion must allow CNI cleanup after activation. Explicit controller
	// updates still wait for route readiness before committing their settings.
	if err := m.waitReady(ctx, options.UpdateController); err != nil {
		return err
	}
	m.state.Mode = options.Mode
	m.state.Target = ""
	m.state.ControllerUpdate = nil
	return m.save()
}

func (m *modeSwitch) save() error {
	data, err := json.MarshalIndent(m.state, "", "  ")
	if err != nil {
		return err
	}
	return atomicModeFile(filepath.Join(modeRoot, "state.json"), data, 0o600)
}

func kubeletArgv(ctx context.Context) ([]string, error) {
	data, err := exec.CommandContext(ctx, "systemctl", "show", "--property=MainPID", "--value", "kubelet").
		Output()
	if err != nil {
		return nil, err
	}
	pid, err := strconv.Atoi(strings.TrimSpace(string(data)))
	if err != nil || pid <= 0 {
		return nil, errors.New("kubelet must be running for the first conversion")
	}
	data, err = os.ReadFile(fmt.Sprintf("/proc/%d/cmdline", pid))
	if err != nil {
		return nil, err
	}
	argv := strings.Split(strings.TrimRight(string(data), "\x00"), "\x00")
	if len(argv) < 2 {
		return nil, errors.New("cannot identify kubelet arguments")
	}
	return argv[1:], nil
}

func (m *modeSwitch) prepare(ctx context.Context) error {
	data, err := os.ReadFile(filepath.Join(modeRoot, "state.json"))
	if err == nil {
		m.state = &modeState{}
		if err := json.Unmarshal(data, m.state); err != nil {
			return err
		}
		validMode := m.state.Mode == ModeRegistered || m.state.Mode == ModeStandalone
		validTarget := m.state.Target == "" || m.state.Target == ModeRegistered ||
			m.state.Target == ModeStandalone
		if m.state.Version != 1 || m.state.Node == nil || m.state.Node.UID == "" ||
			!validMode || !validTarget || m.state.Settings == nil ||
			!filepath.IsAbs(m.state.ConfigPath) || !filepath.IsAbs(m.state.KubeconfigPath) {
			return errors.New("invalid mode conversion baseline")
		}
	} else if !os.IsNotExist(err) {
		return err
	}
	if m.UpdateController &&
		(m.state == nil || m.state.Mode != ModeStandalone || m.state.Target == ModeRegistered) {
		return errors.New("controller updates require standalone mode; finish conversion first")
	}
	// Each completed round trip starts a fresh baseline, including administrator
	// changes to the registered node made since its previous conversion.
	if m.state == nil ||
		(m.state.Mode == ModeRegistered && m.state.Target == "" && m.Mode == ModeStandalone) {
		if err := m.capture(ctx); err != nil {
			return err
		}
	}
	if m.state == nil {
		return nil
	}
	if m.UpdateController {
		if err := m.prepareControllerUpdate(); err != nil {
			return err
		}
	} else if m.state.Mode == ModeStandalone && m.RouteController != nil && len(m.ControllerFields) > 0 {
		current, err := routeOptionsFromState(m.state)
		if err != nil {
			return err
		}
		desired, err := mergeControllerOptions(current, *m.RouteController, m.ControllerFields)
		if err != nil {
			return err
		}
		if desired != current {
			return errors.New("use --update-controller to change an active standalone controller")
		}
	}
	kubeletConfig, err := os.ReadFile(m.state.ConfigPath)
	if err != nil {
		return err
	}
	m.runtime, err = connectKubeletRuntime(ctx, m.state.Endpoint, m.state.Args, kubeletConfig)
	if err != nil {
		return err
	}
	m.controller = &v1.Pod{}
	if err := yaml.Unmarshal(m.state.RouteManifest, m.controller); err != nil {
		return err
	}
	if m.controller.Name != "route-controller" || m.controller.Namespace != "kube-system" ||
		len(m.controller.Spec.Containers) != 1 {
		return errors.New("invalid route-controller manifest in the conversion baseline")
	}
	if m.Mode == ModeStandalone {
		container := m.controller.Spec.Containers[0]
		image := &cri.ImageSpec{
			Image: container.Image,
		}
		status, err := m.runtime.ImageStatus(ctx, &cri.ImageStatusRequest{
			Image: image,
		})
		if err != nil {
			return err
		}
		if status.Image == nil || container.ImagePullPolicy == v1.PullAlways {
			if _, err := m.runtime.PullImage(ctx, &cri.PullImageRequest{
				Image: image,
			}); err != nil {
				return fmt.Errorf("pull route-controller image: %w", err)
			}
		}
	}
	return nil
}

func (m *modeSwitch) capture(ctx context.Context) error {
	args, err := kubeletArgv(ctx)
	if err != nil {
		return err
	}
	if !filepath.IsAbs(flagValue(args, "kubeconfig")) {
		return errors.New(
			"a registered kubelet with an absolute --kubeconfig is required; an existing standalone installation needs a registered baseline before it can be adopted",
		)
	}
	if _, err := modeArgs(args); err != nil {
		return err
	}
	name := flagValue(args, "hostname-override")
	if name == "" {
		name, err = os.Hostname()
		if err != nil {
			return err
		}
	}
	node, err := m.client.CoreV1().
		Nodes().
		Get(ctx, strings.ToLower(strings.TrimSpace(name)), metav1.GetOptions{})
	if err != nil {
		return err
	}
	if err := ValidateVersionChange(
		node.Status.NodeInfo.KubeletVersion,
		node.Status.NodeInfo.KubeletVersion,
	); err != nil {
		return err
	}
	if m.Mode == ModeRegistered {
		if !nodeReady(node) {
			return errors.New("registered Node is not Ready")
		}
		m.state = nil
		return nil
	}
	if _, err := os.Stat(modeDropin); !os.IsNotExist(err) {
		return fmt.Errorf("unmanaged standalone systemd override already exists: %s", modeDropin)
	}
	if _, err := os.Stat(routeManifestPath); !os.IsNotExist(err) {
		return fmt.Errorf(
			"unmanaged route-controller manifest already exists: %s",
			routeManifestPath,
		)
	}
	configPath := flagValue(args, "config")
	data, err := os.ReadFile(configPath)
	if err != nil {
		return err
	}
	var config struct {
		StaticPodPath            string
		StaticPodURL             string
		ContainerRuntimeEndpoint string
	}
	if err := yaml.Unmarshal(data, &config); err != nil {
		return err
	}
	if config.StaticPodPath != manifestDir || config.StaticPodURL != "" ||
		flagValue(args, "pod-manifest-path") != "" ||
		flagValue(args, "manifest-url") != "" {
		return fmt.Errorf(
			"conversion requires staticPodPath=%s and no other manifest source",
			manifestDir,
		)
	}
	_, settings, err := convertKubeletConfig(data, nil)
	if err != nil {
		return err
	}
	endpoint := flagValue(args, "container-runtime-endpoint")
	if endpoint == "" {
		endpoint = config.ContainerRuntimeEndpoint
	}
	if endpoint == "" {
		return errors.New("kubelet must declare its CRI endpoint")
	}
	controller := DefaultRouteControllerOptions()
	if m.state != nil {
		controller, err = routeOptionsFromState(m.state)
		if err != nil {
			return err
		}
	}
	if m.RouteController != nil {
		controller, err = mergeControllerOptions(controller, *m.RouteController, m.ControllerFields)
		if err != nil {
			return err
		}
	}
	pod, err := routeControllerPod(controller)
	if err != nil {
		return err
	}
	for _, volume := range pod.Spec.Volumes {
		info, err := os.Stat(volume.HostPath.Path)
		if err != nil {
			return fmt.Errorf("route-controller hostPath: %w", err)
		}
		if !info.Mode().IsRegular() {
			return fmt.Errorf(
				"route-controller hostPath must be a regular file: %s",
				volume.HostPath.Path,
			)
		}
	}
	manifest, err := yaml.Marshal(pod)
	if err != nil {
		return err
	}
	if err := reservedRoutesEmpty(controller.Table, controller.Protocol); err != nil {
		return err
	}
	kubeconfigPath := flagValue(args, "kubeconfig")
	kubeconfig, err := os.ReadFile(kubeconfigPath)
	if err != nil {
		return err
	}
	m.state = &modeState{
		Version:        1,
		Mode:           ModeRegistered,
		Target:         ModeStandalone,
		Node:           node,
		RegisteredUID:  node.UID,
		Args:           args,
		ConfigPath:     configPath,
		KubeconfigPath: kubeconfigPath,
		Kubeconfig:     kubeconfig,
		Settings:       settings,
		Endpoint:       endpoint,
		RouteManifest:  manifest,
		RouteTable:     controller.Table,
		RouteProtocol:  controller.Protocol,
	}
	return nil
}

func (m *modeSwitch) command(ctx context.Context, args ...string) error {
	command := exec.CommandContext(ctx, "systemctl", args...)
	command.Stdout = m.Output
	command.Stderr = m.Output
	return command.Run()
}

// Existing API workloads and Node objects remain under administrator control.
// Restarting kubelet applies standalone configuration without issuing evictions
// or deleting registrations. The administrator must still clean up and reboot.
func (m *modeSwitch) toStandalone(ctx context.Context) error {
	data, err := os.ReadFile(m.state.ConfigPath)
	if err != nil {
		return err
	}
	data, _, err = convertKubeletConfig(data, nil)
	if err != nil {
		return err
	}
	if err := atomicModeFile(m.state.ConfigPath, data, 0o600); err != nil {
		return err
	}
	args, err := modeArgs(m.state.Args)
	if err != nil {
		return err
	}
	if err := atomicModeFile(modeDropin, []byte(serviceOverride(args)), 0o644); err != nil {
		return err
	}
	if err := atomicModeFile(routeManifestPath, m.state.RouteManifest, 0o600); err != nil {
		return err
	}
	if err := m.command(ctx, "daemon-reload"); err != nil {
		return err
	}
	return m.command(ctx, "restart", "kubelet")
}

func (m *modeSwitch) waitReady(ctx context.Context, waitForController bool) error {
	var last error
	err := wait.PollUntilContextCancel(
		ctx,
		2*time.Second,
		true,
		func(ctx context.Context) (bool, error) {
			last = m.ready(ctx, waitForController)
			return last == nil, nil
		},
	)
	if err != nil {
		return fmt.Errorf("waiting for %s: %w (last check: %w)", m.Mode, err, last)
	}
	return nil
}

func (m *modeSwitch) ready(ctx context.Context, waitForController bool) error {
	args, err := kubeletArgv(ctx)
	if err != nil {
		return err
	}
	if m.Mode == ModeStandalone {
		if _, err := standaloneArgs(args); err != nil {
			return err
		}
		if waitForController {
			if err := m.podReady(ctx, m.controller); err != nil {
				return err
			}
		}
	} else {
		if flagValue(args, "kubeconfig") == "" {
			return errors.New("registered kubelet has no kubeconfig")
		}
		node, err := m.client.CoreV1().Nodes().Get(ctx, m.state.Node.Name, metav1.GetOptions{})
		if err != nil {
			return err
		}
		if node.UID != m.state.RegisteredUID || !nodeReady(node) {
			return errors.New("registered Node has not become Ready")
		}
	}
	pods, err := m.client.CoreV1().Pods("").List(ctx, metav1.ListOptions{
		FieldSelector: "spec.nodeName=" + m.state.Node.Name,
	})
	if err != nil {
		return err
	}
	mirrors := make(map[string]bool)
	for _, pod := range pods.Items {
		if pod.Annotations[v1.MirrorPodAnnotationKey] != "" {
			mirrors[pod.Name] = true
		}
	}
	for _, component := range append(append([]string{}, controlPlaneComponents...), "etcd") {
		pod, err := readPod(filepath.Join(manifestDir, component+".yaml"))
		if component == "etcd" && os.IsNotExist(err) {
			continue
		}
		if err != nil {
			return err
		}
		if err := m.podReady(ctx, pod); err != nil {
			return err
		}
		if m.Mode == ModeRegistered && !mirrors[pod.Name+"-"+m.state.Node.Name] {
			return fmt.Errorf("waiting for %s mirror Pod", component)
		}
	}
	return nil
}

func (m *modeSwitch) podReady(ctx context.Context, pod *v1.Pod) error {
	sandbox, err := m.runtime.sandbox(ctx, pod.Name+"-"+m.state.Node.Name)
	if err != nil {
		return err
	}
	container := pod.Spec.Containers[0]
	if err := m.runtime.runningImage(ctx, sandbox.Id, container.Name, container.Image); err != nil {
		return err
	}
	return probe(ctx, pod)
}

func nodeReady(node *v1.Node) bool {
	for _, condition := range node.Status.Conditions {
		if condition.Type == v1.NodeReady {
			return condition.Status == v1.ConditionTrue
		}
	}
	return false
}
