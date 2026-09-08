// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package standalone

import (
	"context"
	"crypto/sha256"
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

	"github.com/Masterminds/semver/v3"
	clientv3 "go.etcd.io/etcd/client/v3"
	"go.etcd.io/etcd/client/v3/snapshot"
	"go.uber.org/zap"
	"golang.org/x/sys/unix"
	v1 "k8s.io/api/core/v1"
	kubeversion "k8s.io/apimachinery/pkg/version"
	cri "k8s.io/cri-api/pkg/apis/runtime/v1"
	"sigs.k8s.io/yaml"
)

type Options struct {
	Config     string
	Version    string
	BinaryDir  string
	PatchesDir string
	CheckOnly  bool
	Timeout    time.Duration
	Output     io.Writer
}

const CompletedConfigPath = "/var/lib/sealos/standalone-upgrades/completed.yaml"

type upgrade struct {
	Options
	dir           string
	config        string
	args          []string
	name          string
	endpoint      string
	kubeletConfig string
	components    []string
	old           map[string]*v1.Pod
	next          map[string]*v1.Pod
	sandboxes     map[string]string
	images        map[string]string
	runtime       *runtimeClient
	etcd          *clientv3.Client
	etcdCfg       clientv3.Config
	localEtcd     bool
	checkV2Store  bool
	etcdDataDir   string
	etcdWALDir    string
	etcdMemberID  uint64
	etcdClusterID uint64
	fingerprints  map[string][32]byte
}

func Run(ctx context.Context, options Options) error {
	if runtime.GOOS != "linux" {
		return fmt.Errorf("standalone upgrades must execute on the Linux control-plane host")
	}
	if options.Timeout <= 0 || !filepath.IsAbs(options.Config) || !filepath.IsAbs(options.BinaryDir) {
		return fmt.Errorf("absolute configuration and binary paths and a positive timeout are required")
	}
	if options.Output == nil {
		options.Output = io.Discard
	}
	if options.PatchesDir != "" && !filepath.IsAbs(options.PatchesDir) {
		return fmt.Errorf("patches directory must be an absolute path")
	}
	root := "/var/lib/sealos/standalone-upgrades"
	if err := os.MkdirAll(root, 0o700); err != nil {
		return err
	}
	lock, err := os.OpenFile(filepath.Join(root, "lock"), os.O_CREATE|os.O_RDWR, 0o600)
	if err != nil {
		return err
	}
	defer lock.Close()
	if err := unix.Flock(int(lock.Fd()), unix.LOCK_EX|unix.LOCK_NB); err != nil {
		return fmt.Errorf("another standalone upgrade is in progress: %w", err)
	}
	defer unix.Flock(int(lock.Fd()), unix.LOCK_UN) //nolint:errcheck
	if err := checkPendingMaintenance("upgrade"); err != nil {
		return err
	}
	if data, err := os.ReadFile(filepath.Join(modeRoot, "state.json")); err == nil {
		var state modeState
		if err := json.Unmarshal(data, &state); err != nil {
			return err
		}
		if state.Target != "" {
			return fmt.Errorf("finish the pending control-plane conversion before upgrading")
		}
	} else if !os.IsNotExist(err) {
		return err
	}
	dir, err := os.MkdirTemp(root, "upgrade-")
	if err != nil {
		return err
	}
	u := &upgrade{
		Options:      options,
		dir:          dir,
		old:          make(map[string]*v1.Pod),
		next:         make(map[string]*v1.Pod),
		sandboxes:    make(map[string]string),
		images:       make(map[string]string),
		fingerprints: make(map[string][32]byte),
	}
	defer func() {
		if u.runtime != nil {
			u.runtime.close()
		}
		if u.etcd != nil {
			u.etcd.Close()
		}
	}()
	if err := u.prepare(ctx); err != nil {
		return fmt.Errorf("standalone preflight failed (diagnostics: %s): %w", dir, err)
	}
	if options.CheckOnly {
		return os.RemoveAll(dir)
	}
	if err := u.apply(ctx); err != nil {
		return fmt.Errorf("standalone upgrade stopped; backups are in %s; etcd data was not restored: %w", dir, err)
	}
	if err := copyAtomic(u.config, CompletedConfigPath, 0o600); err != nil {
		return err
	}
	fmt.Fprintf(options.Output, "Standalone control plane upgraded to %s; backups: %s\n", options.Version, dir)
	return nil
}

func (u *upgrade) command(ctx context.Context, name string, args ...string) error {
	ctx, cancel := context.WithTimeout(ctx, u.Timeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Stdout, cmd.Stderr = u.Output, u.Output
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("%s %v: %w", filepath.Base(name), args, err)
	}
	return nil
}

func (u *upgrade) prepare(ctx context.Context) error {
	pidBytes, err := exec.CommandContext(ctx, "systemctl", "show", "--property=MainPID", "--value", "kubelet").Output()
	if err != nil {
		return err
	}
	pid, err := strconv.Atoi(strings.TrimSpace(string(pidBytes)))
	if err != nil || pid <= 0 {
		return fmt.Errorf("kubelet must be running")
	}
	cmdline, err := os.ReadFile(fmt.Sprintf("/proc/%d/cmdline", pid))
	if err != nil {
		return err
	}
	argv := strings.Split(strings.TrimRight(string(cmdline), "\x00"), "\x00")
	if len(argv) < 2 {
		return fmt.Errorf("cannot read kubelet arguments")
	}
	u.args, err = standaloneArgs(argv[1:])
	if err != nil {
		return err
	}
	u.kubeletConfig = flagValue(u.args, "config")
	data, err := os.ReadFile(u.kubeletConfig)
	if err != nil {
		return err
	}
	var kc struct {
		StaticPodPath            string
		StaticPodURL             string
		ContainerRuntimeEndpoint string
		RotateCertificates       bool
		ServerTLSBootstrap       bool
		Authentication           struct {
			Webhook struct {
				Enabled bool
			}
		}
		Authorization struct {
			Mode string
		}
	}
	if err := yaml.Unmarshal(data, &kc); err != nil {
		return err
	}
	if kc.StaticPodPath != manifestDir || kc.StaticPodURL != "" || flagValue(u.args, "pod-manifest-path") != "" || flagValue(u.args, "manifest-url") != "" {
		return fmt.Errorf("standalone upgrade requires staticPodPath=%s and no additional manifest source", manifestDir)
	}
	if kc.RotateCertificates || kc.ServerTLSBootstrap || kc.Authentication.Webhook.Enabled || kc.Authorization.Mode == "Webhook" {
		return fmt.Errorf("standalone kubelet configuration must disable certificate bootstrap/rotation and API webhook authentication/authorization")
	}
	u.endpoint = flagValue(u.args, "container-runtime-endpoint")
	if u.endpoint == "" {
		u.endpoint = kc.ContainerRuntimeEndpoint
	}
	if u.endpoint == "" {
		return fmt.Errorf("kubelet must declare containerRuntimeEndpoint")
	}
	u.name = flagValue(u.args, "hostname-override")
	if u.name == "" {
		u.name, err = os.Hostname()
		if err != nil {
			return err
		}
	}
	u.name = strings.ToLower(strings.TrimSpace(u.name))
	current, err := exec.CommandContext(ctx, fmt.Sprintf("/proc/%d/exe", pid), "--version").Output()
	if err != nil {
		return err
	}
	if err := ValidateVersionChange(strings.TrimPrefix(strings.TrimSpace(string(current)), "Kubernetes "), u.Version); err != nil {
		return err
	}
	for _, binary := range []string{"kubeadm", "kubelet", "kubectl"} {
		args := []string{"--version"}
		if binary == "kubeadm" {
			args = []string{"version", "-o", "short"}
		}
		if binary == "kubectl" {
			args = []string{"version", "--client=true", "-o", "json"}
		}
		out, err := exec.CommandContext(ctx, filepath.Join(u.BinaryDir, binary), args...).Output()
		if err != nil {
			return err
		}
		actual := strings.TrimSpace(strings.TrimPrefix(string(out), "Kubernetes "))
		if binary == "kubectl" {
			var info struct {
				ClientVersion kubeversion.Info `json:"clientVersion"`
			}
			if err := json.Unmarshal(out, &info); err != nil {
				return err
			}
			actual = info.ClientVersion.GitVersion
		}
		a, err := semver.NewVersion(actual)
		if err != nil {
			return err
		}
		b, err := semver.NewVersion(u.Version)
		if err != nil {
			return err
		}
		if !a.Equal(b) {
			return fmt.Errorf("target %s does not report %s", binary, u.Version)
		}
	}
	// pflag validates that all preserved command-line options exist in the target kubelet.
	if out, err := exec.CommandContext(ctx, filepath.Join(u.BinaryDir, "kubelet"), append(append([]string{}, u.args...), "--help")...).CombinedOutput(); err != nil {
		return fmt.Errorf("target kubelet rejects preserved flags: %w: %s", err, out)
	}
	u.components = append([]string{}, controlPlaneComponents...)
	if _, err := os.Stat(filepath.Join(manifestDir, "etcd.yaml")); err == nil {
		u.localEtcd = true
		u.components = append([]string{"etcd"}, u.components...)
	} else if !os.IsNotExist(err) {
		return err
	}
	for _, component := range u.components {
		pod, err := readPod(filepath.Join(manifestDir, component+".yaml"))
		if err != nil {
			return err
		}
		if pod.Name != component || pod.Spec.Containers[0].Name != component {
			return fmt.Errorf("unexpected component manifest: %s", component)
		}
		u.old[component] = pod
	}
	currentAPI, err := apiVersion(ctx, u.old["kube-apiserver"])
	if err != nil {
		return err
	}
	if err := ValidateVersionChange(currentAPI, u.Version); err != nil {
		return err
	}
	data, err = os.ReadFile(u.Config)
	if err != nil {
		return err
	}
	data, err = nodeConfig(data, u.Version, u.name, u.endpoint, u.old["kube-apiserver"])
	if err != nil {
		return err
	}
	draft := filepath.Join(u.dir, "input.yaml")
	if err := os.WriteFile(draft, data, 0o600); err != nil {
		return err
	}
	u.config = filepath.Join(u.dir, "kubeadm.yaml")
	kubeadm := filepath.Join(u.BinaryDir, "kubeadm")
	if err := u.command(ctx, kubeadm, "config", "migrate", "--old-config", draft, "--new-config", u.config); err != nil {
		return err
	}
	// kubeadm migrates only its own kinds. Preserve the existing worker and
	// kube-proxy configuration when the generated file is used for addon phases.
	if err := appendComponentConfigs(data, u.config); err != nil {
		return err
	}
	migrated, err := os.ReadFile(u.config)
	if err != nil {
		return err
	}
	kubelet, err := os.ReadFile(u.kubeletConfig)
	if err != nil {
		return err
	}
	validation, err := withLocalKubeletConfig(migrated, kubelet)
	if err != nil {
		return err
	}
	validationPath := filepath.Join(u.dir, "kubelet-validation.yaml")
	if err := os.WriteFile(validationPath, validation, 0o600); err != nil {
		return err
	}
	if err := u.command(ctx, kubeadm, "config", "validate", "--config", validationPath); err != nil {
		return fmt.Errorf("target kubeadm rejected the local kubelet configuration: %w", err)
	}
	newDir := filepath.Join(u.dir, "manifests")
	if err := os.Mkdir(newDir, 0o700); err != nil {
		return err
	}
	// mount namespaces isolate the output path without kubeadm private APIs,
	// dry-run manifest differences, or changes to kubelet's watched directory.
	phases := [][]string{
		{"control-plane", "all"},
		{"etcd", "local"},
	}
	for _, phase := range phases {
		if phase[0] == "etcd" && !u.localEtcd {
			continue
		}
		args := []string{
			"--mount", "--propagation", "private", "--",
			"sh", "-eu", "-c",
			`mount --bind "$1" "$2"; shift 2; exec "$@"`,
			"sh", newDir, manifestDir,
			kubeadm, "init", "phase",
		}
		args = append(args, phase...)
		args = append(args, "--config", u.config)
		if u.PatchesDir != "" {
			args = append(args, "--patches", u.PatchesDir)
		}
		if err := u.command(ctx, "unshare", args...); err != nil {
			return err
		}
	}
	u.runtime, err = connectKubeletRuntime(ctx, u.endpoint, u.args, kubelet)
	if err != nil {
		return err
	}
	for _, component := range u.components {
		pod, err := readPod(filepath.Join(newDir, component+".yaml"))
		if err != nil {
			return err
		}
		u.next[component] = pod
		check, cancel := context.WithTimeout(ctx, 15*time.Second)
		sandbox, err := u.runtime.sandbox(check, component+"-"+u.name)
		if err == nil {
			err = u.runtime.runningImage(check, sandbox.Id, component, "")
		}
		if err == nil {
			err = probe(check, u.old[component])
		}
		cancel()
		if err != nil {
			return err
		}
		u.sandboxes[component] = sandbox.Id
		pull, cancel := context.WithTimeout(ctx, 10*time.Minute)
		image, err := u.runtime.PullImage(pull, &cri.PullImageRequest{
			Image: &cri.ImageSpec{
				Image: pod.Spec.Containers[0].Image,
			},
		})
		cancel()
		if err != nil {
			return err
		}
		if image.ImageRef == "" {
			return fmt.Errorf("CRI returned an empty image reference")
		}
		u.images[component] = image.ImageRef
	}
	u.etcdCfg, err = etcdConfig(u.old["kube-apiserver"])
	if err != nil {
		return err
	}
	u.etcd, err = clientv3.New(u.etcdCfg)
	if err != nil {
		return err
	}
	check, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	if err := etcdHealthy(check, u.etcd); err != nil {
		return err
	}
	if u.localEtcd {
		if err := u.checkEtcd(check); err != nil {
			return err
		}
	}
	files := []string{u.kubeletConfig, u.config}
	if u.checkV2Store {
		files = append(files, filepath.Join(u.BinaryDir, "etcdutl"))
	}
	for _, component := range u.components {
		files = append(files, filepath.Join(manifestDir, component+".yaml"), filepath.Join(newDir, component+".yaml"))
	}
	for _, binary := range []string{"kubeadm", "kubelet", "kubectl"} {
		files = append(files, filepath.Join(u.BinaryDir, binary))
	}
	for _, file := range files {
		data, err := os.ReadFile(file)
		if err != nil {
			return err
		}
		u.fingerprints[file] = sha256.Sum256(data)
	}
	return nil
}

func (u *upgrade) checkEtcd(ctx context.Context) error {
	oldArgs, nextArgs := componentArgs(u.old["etcd"]), componentArgs(u.next["etcd"])
	for _, flag := range []string{"name", "data-dir", "initial-advertise-peer-urls", "listen-peer-urls", "advertise-client-urls"} {
		if flagValue(oldArgs, flag) == "" || flagValue(oldArgs, flag) != flagValue(nextArgs, flag) {
			return fmt.Errorf("etcd --%s must be preserved during upgrade", flag)
		}
	}
	for _, arg := range nextArgs {
		if arg == "--force-new-cluster" || strings.HasPrefix(arg, "--force-new-cluster=") {
			return fmt.Errorf("remove etcd force-new-cluster before upgrading")
		}
	}
	for _, flag := range []string{"data-dir", "wal-dir"} {
		oldPath := flagValue(oldArgs, flag)
		nextPath := flagValue(nextArgs, flag)
		if oldPath != nextPath {
			return fmt.Errorf("etcd --%s must be preserved during upgrade", flag)
		}
		if oldPath == "" {
			continue
		}
		oldHostPath, err := mountedHostPath(u.old["etcd"], oldPath)
		if err != nil {
			return err
		}
		nextHostPath, err := mountedHostPath(u.next["etcd"], nextPath)
		if err != nil {
			return err
		}
		if oldHostPath != nextHostPath {
			return fmt.Errorf("etcd --%s hostPath must be preserved during upgrade", flag)
		}
		if flag == "data-dir" {
			u.etcdDataDir = oldHostPath
		} else {
			u.etcdWALDir = oldHostPath
		}
	}
	if _, err := os.Stat(filepath.Join(u.etcdDataDir, "member")); err != nil {
		return fmt.Errorf("existing etcd member data is required: %w", err)
	}
	next, err := etcdImageVersion(u.next["etcd"].Spec.Containers[0].Image)
	if err != nil {
		return err
	}
	status, err := u.etcd.Status(ctx, u.etcdCfg.Endpoints[0])
	if err != nil {
		return err
	}
	u.etcdMemberID = status.Header.MemberId
	u.etcdClusterID = status.Header.ClusterId
	current, err := semver.NewVersion(status.Version)
	if err != nil {
		return err
	}
	if current.Major() != next.Major() || next.LessThan(current) || next.Minor() > current.Minor()+1 {
		return fmt.Errorf("unsupported etcd version change: %s -> %s", current, next)
	}
	if current.Minor() != next.Minor() {
		if current.Major() != 3 || current.Minor() != 5 || next.Minor() != 6 {
			return fmt.Errorf("etcd minor transition %s -> %s requires a version-specific upgrade procedure", current, next)
		}
		if err := u.prepareV2StoreCheck(ctx, current); err != nil {
			return err
		}
	}
	members, err := u.etcd.MemberList(ctx)
	if err != nil {
		return err
	}
	for _, member := range members.Members {
		for _, endpoint := range member.ClientURLs {
			status, err := u.etcd.Status(ctx, endpoint)
			if err != nil {
				return err
			}
			if err := validateEtcdPeerVersion(current, next, status.Version); err != nil {
				return err
			}
		}
	}
	return nil
}

func (u *upgrade) apply(ctx context.Context) (err error) {
	for file, expected := range u.fingerprints {
		data, err := os.ReadFile(file)
		if err != nil {
			return err
		}
		if sha256.Sum256(data) != expected {
			return fmt.Errorf("file changed after preflight: %s", file)
		}
	}
	if err := u.command(ctx, "cp", "-a", "/etc/kubernetes", filepath.Join(u.dir, "kubernetes")); err != nil {
		return err
	}
	if err := writeJSON(filepath.Join(u.dir, "kubelet-args.json"), u.args); err != nil {
		return err
	}
	const dropin = "/etc/systemd/system/kubelet.service.d/99-sealos-standalone.conf"
	if err := os.MkdirAll(filepath.Dir(dropin), 0o755); err != nil {
		return err
	}
	service := filepath.Join(u.dir, "standalone.conf")
	if err := os.WriteFile(service, []byte(serviceOverride(u.args)), 0o600); err != nil {
		return err
	}
	var files []replacement
	for _, component := range u.components {
		files = append(files, replacement{
			Source:      filepath.Join(u.dir, "manifests", component+".yaml"),
			Destination: filepath.Join(manifestDir, component+".yaml"),
			Mode:        0o600,
		})
	}
	for _, binary := range []string{"kubeadm", "kubectl", "kubelet"} {
		files = append(files, replacement{
			Source:      filepath.Join(u.BinaryDir, binary),
			Destination: filepath.Join("/usr/bin", binary),
			Mode:        0o755,
		})
	}
	files = append(files, replacement{
		Source:      service,
		Destination: dropin,
		Mode:        0o644,
	})
	if err := backupReplacements(u.dir, files); err != nil {
		return err
	}
	if u.localEtcd {
		snapCtx, cancel := context.WithTimeout(ctx, u.Timeout)
		err := snapshot.Save(snapCtx, zap.NewNop(), u.etcdCfg, filepath.Join(u.dir, "etcd.db"))
		cancel()
		if err != nil {
			return err
		}
	}
	if err := u.command(ctx, filepath.Join(u.BinaryDir, "kubeadm"), "certs", "renew", "all", "--config", u.config); err != nil {
		return err
	}
	stopped := true
	activated := false
	attempted := 0
	defer func() {
		if stopped {
			recovery, cancel := context.WithTimeout(context.Background(), time.Minute)
			defer cancel()
			if !activated {
				if restoreErr := restoreFiles(files[:attempted]); restoreErr != nil {
					err = errors.Join(err, fmt.Errorf("file recovery failed; kubelet remains stopped: %w", restoreErr))
					return
				}
				if reloadErr := u.command(recovery, "systemctl", "daemon-reload"); reloadErr != nil {
					err = errors.Join(err, reloadErr)
					return
				}
			}
			err = errors.Join(err, u.command(recovery, "systemctl", "start", "kubelet"))
		}
	}()
	if err := u.command(ctx, "systemctl", "stop", "kubelet"); err != nil {
		return err
	}
	// Capture the final sandbox identities after kubelet exits. A component may
	// have restarted while images were being pulled during preflight.
	for _, component := range u.components {
		check, cancel := context.WithTimeout(ctx, 15*time.Second)
		sandbox, lookupErr := u.runtime.sandbox(check, component+"-"+u.name)
		cancel()
		if lookupErr != nil {
			return lookupErr
		}
		u.sandboxes[component] = sandbox.Id
	}
	if u.checkV2Store {
		// etcdutl explicitly requires an offline data directory. Keep the old
		// manifests until this check succeeds so failure can restart old etcd.
		stop, cancel := context.WithTimeout(ctx, u.Timeout)
		_, stopErr := u.runtime.StopPodSandbox(stop, &cri.StopPodSandboxRequest{
			PodSandboxId: u.sandboxes["etcd"],
		})
		cancel()
		if stopErr != nil {
			return stopErr
		}
		checkArgs := []string{"check", "v2store", "--data-dir", u.etcdDataDir}
		if u.etcdWALDir != "" {
			checkArgs = append(checkArgs, "--wal-dir", u.etcdWALDir)
		}
		if err := u.command(ctx, filepath.Join(u.BinaryDir, "etcdutl"), checkArgs...); err != nil {
			return fmt.Errorf("etcd v2store must be cleaned before upgrading to 3.6: %w", err)
		}
	}
	attempted, err = replaceFiles(files)
	if err != nil {
		return err
	}
	if err := u.command(ctx, "systemctl", "daemon-reload"); err != nil {
		return err
	}
	// From this point new etcd data may be written. Keep the complete new file
	// set on failure; reverting files could silently downgrade an etcd member.
	activated = true
	for _, component := range u.components {
		stop, cancel := context.WithTimeout(ctx, u.Timeout)
		_, stopErr := u.runtime.StopPodSandbox(stop, &cri.StopPodSandboxRequest{PodSandboxId: u.sandboxes[component]})
		cancel()
		if stopErr != nil {
			return stopErr
		}
	}
	if err := u.command(ctx, "systemctl", "start", "kubelet"); err != nil {
		return err
	}
	stopped = false
	deadline, cancel := context.WithTimeout(ctx, u.Timeout)
	defer cancel()
	var last error
	for {
		last = u.ready(deadline)
		if last == nil {
			return nil
		}
		select {
		case <-deadline.Done():
			return fmt.Errorf("waiting for new control-plane containers: %w: %v", deadline.Err(), last)
		case <-time.After(2 * time.Second):
		}
	}
}

func (u *upgrade) prepareV2StoreCheck(ctx context.Context, current *semver.Version) error {
	if current.Patch() < 32 {
		return fmt.Errorf("etcd 3.6 upgrade requires all 3.5 members at 3.5.32 or later; found %s", current)
	}
	for _, pod := range []*v1.Pod{u.old["etcd"], u.next["etcd"]} {
		args := componentArgs(pod)
		for _, arg := range args {
			if arg == "--enable-v2" || strings.HasPrefix(arg, "--enable-v2=") {
				return fmt.Errorf("remove --enable-v2 from all etcd manifests before upgrading to 3.6")
			}
		}
		for _, env := range pod.Spec.Containers[0].Env {
			if env.Name == "ETCD_ENABLE_V2" {
				return fmt.Errorf("remove ETCD_ENABLE_V2 from all etcd manifests before upgrading to 3.6")
			}
		}
	}
	out, err := exec.CommandContext(ctx, filepath.Join(u.BinaryDir, "etcdutl"), "version").Output()
	if err != nil {
		return fmt.Errorf("etcd 3.6 upgrade requires etcdutl 3.5.32 or later in the target binary directory: %w", err)
	}
	for _, line := range strings.Split(string(out), "\n") {
		if !strings.HasPrefix(line, "etcdutl version:") {
			continue
		}
		version, err := semver.NewVersion(strings.TrimSpace(strings.TrimPrefix(line, "etcdutl version:")))
		if err != nil {
			return err
		}
		if version.Major() != 3 || version.Minor() != 5 || version.Patch() < 32 || version.Prerelease() != "" {
			return fmt.Errorf("v2store checking requires etcdutl from the 3.5 series, version 3.5.32 or later")
		}
		u.checkV2Store = true
		return nil
	}
	return fmt.Errorf("cannot identify etcdutl version")
}

func (u *upgrade) ready(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	for _, component := range u.components {
		sandbox, err := u.runtime.sandbox(ctx, component+"-"+u.name)
		if err != nil {
			return err
		}
		if sandbox.Id == u.sandboxes[component] {
			return fmt.Errorf("old %s sandbox is still running", component)
		}
		if err := u.runtime.runningImage(ctx, sandbox.Id, component, u.images[component]); err != nil {
			return err
		}
		if err := probe(ctx, u.next[component]); err != nil {
			return err
		}
	}
	if err := etcdHealthy(ctx, u.etcd); err != nil {
		return err
	}
	api, err := apiVersion(ctx, u.next["kube-apiserver"])
	if err != nil {
		return err
	}
	actualAPI, err := semver.NewVersion(api)
	if err != nil {
		return err
	}
	targetAPI, err := semver.NewVersion(u.Version)
	if err != nil {
		return err
	}
	if !actualAPI.Equal(targetAPI) {
		return fmt.Errorf("API server version is not yet %s", u.Version)
	}
	if u.localEtcd {
		expected, err := etcdImageVersion(u.next["etcd"].Spec.Containers[0].Image)
		if err != nil {
			return err
		}
		status, err := u.etcd.Status(ctx, u.etcdCfg.Endpoints[0])
		if err != nil {
			return err
		}
		if status.Header.MemberId != u.etcdMemberID || status.Header.ClusterId != u.etcdClusterID {
			return fmt.Errorf("etcd member or cluster identity changed during upgrade")
		}
		actual, err := semver.NewVersion(status.Version)
		if err != nil || !expected.Equal(actual) {
			return fmt.Errorf("etcd version is not yet %s", expected)
		}
	}
	return nil
}

func copyAtomic(src, dst string, mode os.FileMode) error {
	source, err := os.Open(src)
	if err != nil {
		return err
	}
	defer source.Close()
	file, err := os.CreateTemp(filepath.Dir(dst), ".sealos-upgrade-")
	if err != nil {
		return err
	}
	defer os.Remove(file.Name())
	defer file.Close()
	if _, err := io.Copy(file, source); err != nil {
		return err
	}
	if err := file.Chmod(mode); err != nil {
		return err
	}
	if err := file.Sync(); err != nil {
		return err
	}
	if err := file.Close(); err != nil {
		return err
	}
	return os.Rename(file.Name(), dst)
}
