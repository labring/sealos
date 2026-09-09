// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package standalone

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/Masterminds/semver/v3"
	"go.etcd.io/etcd/api/v3/v3rpc/rpctypes"
	"go.etcd.io/etcd/client/pkg/v3/transport"
	clientv3 "go.etcd.io/etcd/client/v3"
	v1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/uuid"
	"k8s.io/apimachinery/pkg/util/wait"
	utilyaml "k8s.io/apimachinery/pkg/util/yaml"
	clientset "k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	cri "k8s.io/cri-api/pkg/apis/runtime/v1"
	"sigs.k8s.io/yaml"
)

// BootstrapPlan is transported privately to the new host. Kubernetes config
// remains serialized in its public schema so newer fields survive unchanged.
type BootstrapPlan struct {
	Config        []byte                 `json:"Config"`
	Controller    RouteControllerOptions `json:"Controller"`
	Join          bool                   `json:"Join"`
	EtcdEndpoints []string               `json:"EtcdEndpoints"`
}

type BootstrapOptions struct {
	PlanPath  string
	CheckOnly bool
	Timeout   time.Duration
	Output    io.Writer
}

type bootstrapState struct {
	Plan      BootstrapPlan `json:"Plan"`
	MemberID  uint64        `json:"MemberID"`
	ClusterID uint64        `json:"ClusterID"`
	Complete  bool          `json:"Complete"`
	Baseline  *modeState    `json:"Baseline"`
}

type preparedBootstrap struct {
	state            *bootstrapState
	cluster          map[string]any
	init             map[string]any
	kubelet          map[string]any
	version          string
	name             string
	endpoint         string
	address          string
	args             []string
	node             *v1.Node
	kubeletData      []byte
	standaloneConfig []byte
	settings         map[string]json.RawMessage
	manifest         []byte
}

const (
	bootstrapStatePath = modeRoot + "/bootstrap.json"
	registeredDropin   = "/etc/systemd/system/kubelet.service.d/90-sealos-registered.conf"
)

func BootstrapConfig(
	data []byte,
	version, name, address, endpoint string,
	port int,
) ([]byte, error) {
	api := &v1.Pod{
		Spec: v1.PodSpec{
			Containers: []v1.Container{
				{
					Args: []string{
						"--advertise-address=" + address,
						"--secure-port=" + strconv.Itoa(port),
					},
				},
			},
		},
	}
	return nodeConfig(data, version, name, endpoint, api)
}

func Bootstrap(ctx context.Context, options BootstrapOptions) error {
	return maintenance(ctx, options.Timeout, func(ctx context.Context) error {
		return bootstrapStandalone(ctx, options)
	})
}

func bootstrapStandalone(ctx context.Context, options BootstrapOptions) error {
	if err := checkPendingMaintenance("bootstrap"); err != nil {
		return err
	}
	data, err := os.ReadFile(options.PlanPath)
	if err != nil {
		return err
	}
	state := &bootstrapState{}
	if err := json.Unmarshal(data, &state.Plan); err != nil {
		return err
	}
	if err := state.Plan.Controller.Validate(); err != nil {
		return err
	}
	cluster, init, kubelet, err := bootstrapDocuments(state.Plan.Config)
	if err != nil {
		return err
	}
	version, _ := cluster["kubernetesVersion"].(string)
	if err := ValidateVersionChange(version, version); err != nil {
		return err
	}
	registration, _ := init["nodeRegistration"].(map[string]any)
	name, _ := registration["name"].(string)
	endpoint, _ := registration["criSocket"].(string)
	localAPI, _ := init["localAPIEndpoint"].(map[string]any)
	address, _ := localAPI["advertiseAddress"].(string)
	if name == "" || endpoint == "" || net.ParseIP(address) == nil {
		return errors.New(
			"bootstrap config requires a node name, CRI socket, and API advertise address",
		)
	}
	args, err := bootstrapKubeletArgs(registration, endpoint, name)
	if err != nil {
		return err
	}
	node, err := bootstrapNode(registration, args)
	if err != nil {
		return err
	}
	kubelet["staticPodPath"] = manifestDir
	kubelet["containerRuntimeEndpoint"] = endpoint
	kubeletData, err := yaml.Marshal(kubelet)
	if err != nil {
		return err
	}
	standaloneConfig, settings, err := convertKubeletConfig(kubeletData, nil)
	if err != nil {
		return err
	}
	pod, err := routeControllerPod(state.Plan.Controller)
	if err != nil {
		return err
	}
	for _, volume := range pod.Spec.Volumes {
		info, err := os.Stat(volume.HostPath.Path)
		if err != nil || !info.Mode().IsRegular() {
			return fmt.Errorf(
				"controller file %s must be provisioned before bootstrap",
				volume.HostPath.Path,
			)
		}
	}
	manifest, err := yaml.Marshal(pod)
	if err != nil {
		return err
	}
	saved, err := os.ReadFile(bootstrapStatePath)
	switch {
	case err == nil:
		var previous bootstrapState
		if err := json.Unmarshal(saved, &previous); err != nil {
			return err
		}
		if !reflect.DeepEqual(state.Plan, previous.Plan) {
			return errors.New("bootstrap plan changed; resume with the original plan")
		}
		state = &previous
	case os.IsNotExist(err):
		for _, path := range []string{filepath.Join(modeRoot, "state.json"), filepath.Join(manifestDir, "kube-apiserver.yaml"), "/etc/kubernetes/kubelet.conf"} {
			if _, err := os.Stat(path); !os.IsNotExist(err) {
				return fmt.Errorf(
					"bootstrap requires a new control-plane host; existing file %s",
					path,
				)
			}
		}
		if err := reservedRoutesEmpty(
			state.Plan.Controller.Table,
			state.Plan.Controller.Protocol,
		); err != nil {
			return err
		}
	default:
		return err
	}
	if err := validateBootstrapLayout(cluster); err != nil {
		return err
	}
	if state.Plan.Join {
		client, err := bootstrapAPIClientFrom(modeRoot + "/shared/admin.conf")
		if err != nil {
			return err
		}
		_, err = client.CoreV1().
			Nodes().
			Get(ctx, name, metav1.GetOptions{})
		if err == nil {
			return fmt.Errorf("new standalone control-plane name %s already exists", name)
		}
		if !apierrors.IsNotFound(err) {
			return fmt.Errorf(
				"cannot check new standalone control-plane name %s: %w",
				name,
				err,
			)
		}
	}
	if options.CheckOnly {
		return nil
	}
	if state.Complete {
		return verifyBootstrap(ctx, options, state)
	}
	if err := saveBootstrapState(state); err != nil {
		return err
	}
	if err := os.Remove(resetStatePath); err != nil && !os.IsNotExist(err) {
		return err
	}
	prepared := &preparedBootstrap{
		state:            state,
		cluster:          cluster,
		init:             init,
		kubelet:          kubelet,
		version:          version,
		name:             name,
		endpoint:         endpoint,
		address:          address,
		args:             args,
		node:             node,
		kubeletData:      kubeletData,
		standaloneConfig: standaloneConfig,
		settings:         settings,
		manifest:         manifest,
	}
	return prepared.execute(ctx, options)
}

func (b *preparedBootstrap) execute(ctx context.Context, options BootstrapOptions) error {
	state := b.state
	cluster, init, kubelet := b.cluster, b.init, b.kubelet
	version, name, endpoint, address := b.version, b.name, b.endpoint, b.address
	args, node := b.args, b.node
	kubeletData, standaloneConfig := b.kubeletData, b.standaloneConfig
	settings, manifest := b.settings, b.manifest

	runtime, err := connectKubeletRuntime(ctx, endpoint, args, kubeletData)
	if err != nil {
		return err
	}
	image := &cri.ImageSpec{Image: state.Plan.Controller.Image}
	status, pullErr := runtime.ImageStatus(ctx, &cri.ImageStatusRequest{Image: image})
	if pullErr == nil && status.Image == nil {
		_, pullErr = runtime.PullImage(ctx, &cri.PullImageRequest{Image: image})
	}
	defer runtime.close()
	if pullErr != nil {
		return fmt.Errorf("pull route-controller before bootstrap: %w", pullErr)
	}
	if err := maintenanceCommand(ctx, options.Output, "systemctl", "stop", "kubelet"); err != nil {
		return err
	}
	standaloneArgv, err := modeArgs(args)
	if err != nil {
		return err
	}
	if err := atomicModeFile(
		modeDropin,
		[]byte(serviceOverride(standaloneArgv)),
		0o644,
	); err != nil {
		return err
	}
	if err := maintenanceCommand(ctx, options.Output, "systemctl", "daemon-reload"); err != nil {
		return err
	}
	if state.Plan.Join {
		if err := installSharedPKI(); err != nil {
			return err
		}
	}
	configPath := modeRoot + "/bootstrap-kubeadm.yaml"
	if err := atomicModeFile(configPath, state.Plan.Config, 0o600); err != nil {
		return err
	}
	if err := maintenanceCommand(
		ctx,
		options.Output,
		"kubeadm",
		"config",
		"validate",
		"--config",
		configPath,
	); err != nil {
		return err
	}
	for _, phase := range [][]string{{"certs", "all"}, {"kubeconfig", "all"}} {
		command := append([]string{"init", "phase"}, phase...)
		command = append(command, "--config", configPath)
		if err := maintenanceCommand(ctx, options.Output, "kubeadm", command...); err != nil {
			return err
		}
	}
	etcd, _ := cluster["etcd"].(map[string]any)
	_, external := etcd["external"]
	var etcdClient *clientv3.Client
	if state.Plan.Join && !external {
		etcdClient, err = bootstrapEtcdClient(state.Plan.EtcdEndpoints)
		if err != nil {
			return err
		}
		defer etcdClient.Close()
		if err := joinEtcdLearner(ctx, etcdClient, state, cluster, name, address); err != nil {
			return err
		}
	}
	// Write the modified cluster config through the same public schema. The
	// initial-cluster flags describe etcd membership, not Kubernetes Nodes.
	var documents []byte
	for _, doc := range []map[string]any{cluster, init, kubelet} {
		encoded, err := yaml.Marshal(doc)
		if err != nil {
			return err
		}
		documents = append(documents, encoded...)
		documents = append(documents, []byte("\n---\n")...)
	}
	if err := atomicModeFile(configPath, documents, 0o600); err != nil {
		return err
	}
	for _, phase := range [][]string{{"etcd", "local"}, {"control-plane", "all"}} {
		if phase[0] == "etcd" && external {
			continue
		}
		command := append([]string{"init", "phase"}, phase...)
		command = append(command, "--config", configPath)
		if err := maintenanceCommand(ctx, options.Output, "kubeadm", command...); err != nil {
			return err
		}
	}
	baselineData, err := os.ReadFile("/etc/kubernetes/kubelet.conf")
	if err != nil {
		return err
	}
	baseline := &modeState{
		Version:        1,
		Mode:           ModeStandalone,
		Node:           node,
		Args:           args,
		ConfigPath:     "/var/lib/kubelet/config.yaml",
		KubeconfigPath: "/etc/kubernetes/kubelet.conf",
		Kubeconfig:     baselineData,
		Settings:       settings,
		Endpoint:       endpoint,
		RouteManifest:  manifest,
		RouteTable:     state.Plan.Controller.Table,
		RouteProtocol:  state.Plan.Controller.Protocol,
		ManagedService: true,
	}
	if state.Baseline != nil {
		baseline = state.Baseline
	} else {
		state.Baseline = baseline
		if err := saveBootstrapState(state); err != nil {
			return err
		}
	}
	if err := (&modeSwitch{state: baseline}).save(); err != nil {
		return err
	}
	if err := atomicModeFile(baseline.ConfigPath, standaloneConfig, 0o600); err != nil {
		return err
	}
	// A provisioned hostPath file may have been replaced while bootstrap was
	// paused. Recreate the controller sandbox so it sees the current file inode.
	controllerSwitch := &modeSwitch{state: baseline, runtime: runtime}
	if err := controllerSwitch.stopController(ctx); err != nil {
		return err
	}
	if err := atomicModeFile(routeManifestPath, manifest, 0o600); err != nil {
		return err
	}
	if err := maintenanceCommand(ctx, options.Output, "systemctl", "start", "kubelet"); err != nil {
		return err
	}
	if !state.Plan.Join {
		if err := bootstrapAdminAccess(ctx, version); err != nil {
			return err
		}
	}
	if etcdClient != nil {
		if err := wait.PollUntilContextCancel(
			ctx,
			2*time.Second,
			true,
			func(ctx context.Context) (bool, error) {
				list, err := etcdClient.MemberList(ctx)
				if err != nil {
					return false, err
				}
				for _, member := range list.Members {
					if member.ID == state.MemberID {
						if !member.IsLearner {
							return true, nil
						}
						_, err := etcdClient.MemberPromote(ctx, state.MemberID)
						if errors.Is(err, rpctypes.ErrMemberLearnerNotReady) {
							return false, nil
						}
						return err == nil, err
					}
				}
				return false, errors.New("joining etcd member disappeared")
			},
		); err != nil {
			return err
		}
		if err := etcdHealthy(ctx, etcdClient); err != nil {
			return err
		}
	}
	if err := verifyBootstrap(ctx, options, state); err != nil {
		return err
	}
	state.Complete = true
	return saveBootstrapState(state)
}

func bootstrapNode(registration map[string]any, args []string) (*v1.Node, error) {
	name, _ := registration["name"].(string)
	node := &v1.Node{
		ObjectMeta: metav1.ObjectMeta{
			Name:   name,
			UID:    uuid.NewUUID(),
			Labels: map[string]string{"node-role.kubernetes.io/control-plane": ""},
		},
		Spec: v1.NodeSpec{
			ProviderID: flagValue(args, "provider-id"),
			Taints: []v1.Taint{
				{Key: "node-role.kubernetes.io/control-plane", Effect: v1.TaintEffectNoSchedule},
			},
		},
	}
	if taints := registration["taints"]; taints != nil {
		data, err := yaml.Marshal(taints)
		if err != nil {
			return nil, err
		}
		if err := yaml.Unmarshal(data, &node.Spec.Taints); err != nil {
			return nil, err
		}
	}
	if flagValue(args, "register-with-taints") != "" {
		return nil, errors.New(
			"configure bootstrap taints through nodeRegistration.taints instead of kubeletExtraArgs",
		)
	}
	if labels := flagValue(args, "node-labels"); labels != "" {
		for _, item := range strings.Split(labels, ",") {
			parts := strings.SplitN(item, "=", 2)
			if len(parts) != 2 || parts[0] == "" {
				return nil, fmt.Errorf("invalid bootstrap node label %q", item)
			}
			node.Labels[parts[0]] = parts[1]
		}
	}
	return node, nil
}

func verifyBootstrap(ctx context.Context, options BootstrapOptions, state *bootstrapState) error {
	if state.Baseline == nil {
		return errors.New("bootstrap baseline is missing")
	}
	pod, err := routeControllerPod(state.Plan.Controller)
	if err != nil {
		return err
	}
	client, err := bootstrapAPIClient()
	if err != nil {
		return err
	}
	kubeletConfig, err := os.ReadFile(state.Baseline.ConfigPath)
	if err != nil {
		return err
	}
	runtime, err := connectKubeletRuntime(
		ctx,
		state.Baseline.Endpoint,
		state.Baseline.Args,
		kubeletConfig,
	)
	if err != nil {
		return err
	}
	defer runtime.close()
	m := &modeSwitch{
		ModeOptions: ModeOptions{
			Mode:    ModeStandalone,
			Timeout: options.Timeout,
		},
		state:      state.Baseline,
		client:     client,
		runtime:    runtime,
		controller: pod,
	}
	// Initial installation can precede workers and CNI deployment. Component
	// health and absence of registration are required; controller readiness is
	// checked on join once the cluster already has its network configured.
	if state.Plan.Join {
		err = m.waitReady(ctx, true)
	} else {
		err = wait.PollUntilContextCancel(
			ctx,
			2*time.Second,
			true,
			func(ctx context.Context) (bool, error) {
				if _, err := client.CoreV1().
					Nodes().
					Get(ctx, state.Baseline.Node.Name, metav1.GetOptions{}); !apierrors.IsNotFound(
					err,
				) {
					return false, nil
				}
				for _, component := range controlPlaneComponents {
					pod, err := readPod(filepath.Join(manifestDir, component+".yaml"))
					if err != nil {
						return false, err
					}
					if err := m.podReady(ctx, pod); err != nil {
						return false, nil
					}
				}
				return true, nil
			},
		)
	}
	return err
}

func bootstrapAPIClient() (*clientset.Clientset, error) {
	return bootstrapAPIClientFrom("/etc/kubernetes/admin.conf")
}

func bootstrapAdminAccess(ctx context.Context, version string) error {
	target, err := semver.NewVersion(version)
	if err != nil {
		return err
	}
	if target.Minor() < 29 {
		// Older kubeadm generates admin.conf in system:masters and does not
		// generate super-admin.conf or require a separate administrator binding.
		return nil
	}
	// Since Kubernetes 1.29, kubeadm's admin identity uses this RBAC group.
	// The public super-admin kubeconfig phase provides initial API access until
	// its normal cluster-admin binding exists.
	client, err := bootstrapAPIClientFrom("/etc/kubernetes/super-admin.conf")
	if err != nil {
		return err
	}
	return wait.PollUntilContextCancel(
		ctx,
		2*time.Second,
		true,
		func(ctx context.Context) (bool, error) {
			_, err := client.RbacV1().ClusterRoleBindings().Create(ctx, &rbacv1.ClusterRoleBinding{
				ObjectMeta: metav1.ObjectMeta{Name: "kubeadm:cluster-admins"},
				RoleRef: rbacv1.RoleRef{
					APIGroup: rbacv1.GroupName,
					Kind:     "ClusterRole",
					Name:     "cluster-admin",
				},
				Subjects: []rbacv1.Subject{{
					Kind:     rbacv1.GroupKind,
					APIGroup: rbacv1.GroupName,
					Name:     "kubeadm:cluster-admins",
				}},
			}, metav1.CreateOptions{})
			if err == nil || apierrors.IsAlreadyExists(err) {
				return true, nil
			}
			if apierrors.IsForbidden(err) || apierrors.IsUnauthorized(err) {
				return false, err
			}
			return false, nil
		},
	)
}

func bootstrapAPIClientFrom(path string) (*clientset.Clientset, error) {
	config, err := clientcmd.BuildConfigFromFlags("", path)
	if err != nil {
		return nil, err
	}
	config.Timeout = 10 * time.Second
	return clientset.NewForConfig(config)
}

func installSharedPKI() error {
	for _, name := range []string{"ca.crt", "ca.key", "front-proxy-ca.crt", "front-proxy-ca.key", "sa.pub", "sa.key", "etcd/ca.crt", "etcd/ca.key"} {
		data, err := os.ReadFile(filepath.Join(modeRoot, "shared/pki", name))
		if os.IsNotExist(err) && strings.HasPrefix(name, "etcd/") {
			continue
		}
		if err != nil {
			return err
		}
		target := filepath.Join("/etc/kubernetes/pki", name)
		existing, err := os.ReadFile(target)
		if err == nil && !bytes.Equal(existing, data) {
			return fmt.Errorf("existing PKI file differs from the cluster identity: %s", target)
		}
		if err != nil && !os.IsNotExist(err) {
			return err
		}
		if err := atomicModeFile(target, data, 0o600); err != nil {
			return err
		}
	}
	return nil
}

func bootstrapEtcdClient(endpoints []string) (*clientv3.Client, error) {
	if len(endpoints) == 0 {
		return nil, errors.New("stacked etcd join requires an existing etcd endpoint")
	}
	tlsInfo := transport.TLSInfo{
		TrustedCAFile: "/etc/kubernetes/pki/etcd/ca.crt",
		CertFile:      "/etc/kubernetes/pki/apiserver-etcd-client.crt",
		KeyFile:       "/etc/kubernetes/pki/apiserver-etcd-client.key",
	}
	config, err := tlsInfo.ClientConfig()
	if err != nil {
		return nil, err
	}
	return clientv3.New(clientv3.Config{
		Endpoints:   endpoints,
		TLS:         config,
		DialTimeout: 5 * time.Second,
	})
}

func joinEtcdLearner(
	ctx context.Context,
	client *clientv3.Client,
	state *bootstrapState,
	cluster map[string]any,
	name, address string,
) error {
	peer := "https://" + net.JoinHostPort(address, "2380")
	list, err := client.MemberList(ctx)
	if err != nil {
		return err
	}
	if state.ClusterID != 0 && state.ClusterID != list.Header.ClusterId {
		return errors.New("etcd cluster identity changed during bootstrap")
	}
	member, err := memberByPeer(list.Members, peer)
	if err != nil {
		return err
	}
	if member == nil {
		if state.MemberID != 0 {
			return errors.New(
				"joining etcd member was removed; reset this host before joining again",
			)
		}
		if err := etcdHealthy(ctx, client); err != nil {
			return err
		}
		state.ClusterID = list.Header.ClusterId
		if err := saveBootstrapState(state); err != nil {
			return err
		}
		response, err := client.MemberAddAsLearner(ctx, []string{peer})
		if err != nil {
			return err
		}
		member = response.Member
		list.Members = response.Members
	} else if state.ClusterID == 0 || (state.MemberID != 0 && state.MemberID != member.ID) {
		return errors.New("the requested peer URL belongs to another etcd member")
	}
	state.MemberID = member.ID
	if err := saveBootstrapState(state); err != nil {
		return err
	}
	initial, err := initialEtcdCluster(list.Members, member.ID, name)
	if err != nil {
		return err
	}
	etcd, _ := cluster["etcd"].(map[string]any)
	if etcd == nil {
		etcd = make(map[string]any)
		cluster["etcd"] = etcd
	}
	local, _ := etcd["local"].(map[string]any)
	if local == nil {
		local = make(map[string]any)
		etcd["local"] = local
	}
	return setPublicExtraArgs(cluster, local, map[string]string{
		"initial-cluster":       initial,
		"initial-cluster-state": "existing",
	})
}

func saveBootstrapState(state *bootstrapState) error {
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	return atomicModeFile(bootstrapStatePath, data, 0o600)
}

func bootstrapDocuments(data []byte) (map[string]any, map[string]any, map[string]any, error) {
	documents := make(map[string]map[string]any)
	decoder := utilyaml.NewYAMLOrJSONDecoder(bytes.NewReader(data), 4096)
	for {
		var document map[string]any
		err := decoder.Decode(&document)
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return nil, nil, nil, err
		}
		kind, _ := document["kind"].(string)
		if kind == "" {
			continue
		}
		if documents[kind] != nil {
			return nil, nil, nil, fmt.Errorf("duplicate %s in bootstrap config", kind)
		}
		documents[kind] = document
	}
	for _, kind := range []string{"ClusterConfiguration", "InitConfiguration", "KubeletConfiguration"} {
		if documents[kind] == nil {
			return nil, nil, nil, fmt.Errorf("bootstrap requires %s", kind)
		}
	}
	return documents["ClusterConfiguration"], documents["InitConfiguration"], documents["KubeletConfiguration"], nil
}

func bootstrapKubeletArgs(registration map[string]any, endpoint, name string) ([]string, error) {
	args := []string{
		"--config=/var/lib/kubelet/config.yaml",
		"--kubeconfig=/etc/kubernetes/kubelet.conf",
		"--container-runtime-endpoint=" + endpoint,
		"--hostname-override=" + name,
	}
	switch extra := registration["kubeletExtraArgs"].(type) {
	case nil:
	case map[string]any:
		keys := make([]string, 0, len(extra))
		for key := range extra {
			keys = append(keys, key)
		}
		sort.Strings(keys)
		for _, key := range keys {
			args = append(args, "--"+key+"="+fmt.Sprint(extra[key]))
		}
	case []any:
		for _, value := range extra {
			arg, ok := value.(map[string]any)
			if !ok {
				return nil, errors.New("invalid kubeletExtraArgs entry")
			}
			key, _ := arg["name"].(string)
			value, _ := arg["value"].(string)
			args = append(args, "--"+key+"="+value)
		}
	default:
		return nil, errors.New("invalid kubeletExtraArgs format")
	}
	if flagValue(args, "config") != "/var/lib/kubelet/config.yaml" ||
		flagValue(args, "kubeconfig") != "/etc/kubernetes/kubelet.conf" ||
		flagValue(args, "hostname-override") != name ||
		flagValue(args, "container-runtime-endpoint") != endpoint {
		return nil, errors.New("kubeletExtraArgs must not override bootstrap paths or identity")
	}
	return args, nil
}

func setPublicExtraArgs(cluster, component map[string]any, values map[string]string) error {
	version, _ := cluster["apiVersion"].(string)
	if strings.HasSuffix(version, "/v1beta4") {
		args, _ := component["extraArgs"].([]any)
		var result []any
		for _, item := range args {
			arg, ok := item.(map[string]any)
			if !ok {
				return errors.New("invalid extraArgs entry")
			}
			name, _ := arg["name"].(string)
			if _, replace := values[name]; !replace {
				result = append(result, arg)
			}
		}
		for name, value := range values {
			result = append(result, map[string]any{
				"name":  name,
				"value": value,
			})
		}
		component["extraArgs"] = result
		return nil
	}
	if !strings.HasSuffix(version, "/v1beta3") {
		return fmt.Errorf("unsupported kubeadm config API %s", strconv.Quote(version))
	}
	args, _ := component["extraArgs"].(map[string]any)
	if args == nil {
		args = make(map[string]any)
	}
	for name, value := range values {
		args[name] = value
	}
	component["extraArgs"] = args
	return nil
}
