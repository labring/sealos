// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package standalone

import (
	"context"
	"flag"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/vishvananda/netlink"
	"golang.org/x/sys/unix"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	clientset "k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

// This fixture implements only the static Pod readiness and route ownership
// contract. It has no CNI behavior and is not route-controller E2E.
func TestModeControllerFixture(t *testing.T) {
	if os.Getenv("SEALOS_MODE_CONTROLLER_FIXTURE") != "1" {
		t.Skip("only runs inside a disposable static Pod")
	}
	table, err := strconv.Atoi(flagValue(flag.Args(), "route-table"))
	if err != nil {
		t.Fatal(err)
	}
	protocol, err := strconv.Atoi(flagValue(flag.Args(), "route-protocol"))
	if err != nil {
		t.Fatal(err)
	}
	_, destination, err := net.ParseCIDR("198.18.0.1/32")
	if err != nil {
		t.Fatal(err)
	}
	if err := netlink.RouteReplace(&netlink.Route{
		Dst:      destination,
		Type:     unix.RTN_BLACKHOLE,
		Table:    table,
		Protocol: protocol,
	}); err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	mux.HandleFunc("/readyz", func(w http.ResponseWriter, _ *http.Request) {
		data, err := os.ReadFile(controllerConfigMount)
		if err != nil || string(data) != "ready" {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
	})
	server := &http.Server{
		Addr:              "127.0.0.1:9919",
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	t.Fatal(server.ListenAndServe())
}

func TestModeRoundTripE2E(t *testing.T) {
	if os.Getenv("SEALOS_MODE_ROUNDTRIP_E2E") != "1" {
		t.Skip("requires an explicitly selected disposable kubeadm cluster")
	}
	ctx := context.Background()
	config, err := clientcmd.BuildConfigFromFlags("", "/etc/kubernetes/admin.conf")
	if err != nil {
		t.Fatal(err)
	}
	client, err := clientset.NewForConfig(config)
	if err != nil {
		t.Fatal(err)
	}
	name, err := os.Hostname()
	if err != nil {
		t.Fatal(err)
	}
	node, err := client.CoreV1().Nodes().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		t.Fatal(err)
	}
	node.Labels["example.com/mode-test"] = "preserved"
	node.Annotations["example.com/mode-test"] = "preserved"
	node, err = client.CoreV1().Nodes().Update(ctx, node, metav1.UpdateOptions{})
	if err != nil {
		t.Fatal(err)
	}
	originalUID := node.UID
	originalUnschedulable := node.Spec.Unschedulable
	var upgradeConfig []byte
	for _, source := range []struct {
		name string
		key  string
	}{
		{
			name: "kubeadm-config",
			key:  "ClusterConfiguration",
		},
		{
			name: "kubelet-config",
			key:  "kubelet",
		},
		{
			name: "kube-proxy",
			key:  "config.conf",
		},
	} {
		cm, err := client.CoreV1().ConfigMaps("kube-system").Get(ctx, source.name, metav1.GetOptions{})
		if err != nil {
			t.Fatal(err)
		}
		upgradeConfig = append(upgradeConfig, []byte(cm.Data[source.key]+"\n---\n")...)
	}
	if err := os.WriteFile("/opt/mode-upgrade.yaml", upgradeConfig, 0o600); err != nil {
		t.Fatal(err)
	}
	controller := DefaultRouteControllerOptions()
	controller.Image = os.Getenv("SEALOS_MODE_CONTROLLER_IMAGE")
	controller.Kubeconfig = "/etc/kubernetes/admin.conf"
	controller.Config = "/opt/mode-controller-config.yaml"
	controller.Table = 200
	controller.Protocol = 111
	setReadiness := func(value string) {
		t.Helper()
		if err := os.WriteFile(controller.Config, []byte(value), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	setReadiness("ready")
	_, destination, err := net.ParseCIDR("198.18.0.2/32")
	if err != nil {
		t.Fatal(err)
	}
	unrelated := netlink.Route{
		Dst:      destination,
		Type:     unix.RTN_BLACKHOLE,
		Table:    controller.Table,
		Protocol: 112,
	}
	if err := netlink.RouteAdd(&unrelated); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_ = netlink.RouteDel(&unrelated)
	})
	verifyCleanup := func() {
		t.Helper()
		if err := reservedRoutesEmpty(controller.Table, controller.Protocol); err != nil {
			t.Fatal(err)
		}
		if err := reservedRoutesEmpty(controller.Table, int(unrelated.Protocol)); err == nil {
			t.Fatal("reverse conversion removed an unrelated route")
		}
		if _, err := os.Stat(routeManifestPath); !os.IsNotExist(err) {
			t.Fatalf("controller manifest remains after reverse: %v", err)
		}
	}
	options := ModeOptions{
		Mode:            ModeStandalone,
		RouteController: &controller,
		Timeout:         4 * time.Minute,
		Output:          os.Stdout,
		CheckOnly:       true,
	}
	if err := SwitchMode(ctx, options); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(modeRoot, "state.json")); !os.IsNotExist(err) {
		t.Fatal("preflight wrote the conversion baseline")
	}
	options.CheckOnly = false
	for round := 0; round < 2; round++ {
		t.Logf("round %d: registered -> standalone", round+1)
		options.Mode = ModeStandalone
		options.RouteController = &controller
		if err := SwitchMode(ctx, options); err != nil {
			t.Fatal(err)
		}
		if err := SwitchMode(ctx, options); err != nil {
			t.Fatalf("standalone retry: %v", err)
		}
		retained, err := client.CoreV1().Nodes().Get(ctx, name, metav1.GetOptions{})
		if err != nil || retained.UID != originalUID || retained.Spec.Unschedulable != originalUnschedulable {
			t.Fatalf("standalone conversion changed the administrator-owned Node: %v", err)
		}
		if round == 1 && os.Getenv("SEALOS_MODE_UPGRADE_BINARIES") != "" {
			t.Log("upgrade while standalone before switching back")
			if err := Run(ctx, Options{
				Config:    "/opt/mode-upgrade.yaml",
				Version:   "v1.31.9",
				BinaryDir: os.Getenv("SEALOS_MODE_UPGRADE_BINARIES"),
				Timeout:   4 * time.Minute,
				Output:    os.Stdout,
			}); err != nil {
				t.Fatal(err)
			}
		}
		t.Logf("round %d: standalone -> registered", round+1)
		options.Mode = ModeRegistered
		options.RouteController = nil
		if err := SwitchMode(ctx, options); err != nil {
			t.Fatal(err)
		}
		if err := SwitchMode(ctx, options); err != nil {
			t.Fatalf("registered retry: %v", err)
		}
		node, err = client.CoreV1().Nodes().Get(ctx, name, metav1.GetOptions{})
		if err != nil {
			t.Fatal(err)
		}
		if node.UID != originalUID || node.Labels["example.com/mode-test"] != "preserved" || node.Annotations["example.com/mode-test"] != "preserved" || node.Spec.Unschedulable != originalUnschedulable {
			t.Fatalf("incorrect registered node restoration: %+v", node)
		}
		verifyCleanup()
		if round == 1 && os.Getenv("SEALOS_MODE_UPGRADE_BINARIES") != "" && !strings.HasPrefix(node.Status.NodeInfo.KubeletVersion, "v1.31.9") {
			t.Fatalf("reverse conversion reverted upgraded kubelet: %s", node.Status.NodeInfo.KubeletVersion)
		}
	}
	for _, recoverForward := range []bool{true, false} {
		t.Logf("readiness failure, resume forward=%t", recoverForward)
		setReadiness("not-ready")
		options.Mode = ModeStandalone
		options.RouteController = &controller
		options.Timeout = 40 * time.Second
		if err := SwitchMode(ctx, options); err == nil {
			t.Fatal("accepted an unready route-controller")
		}
		retained, err := client.CoreV1().Nodes().Get(ctx, name, metav1.GetOptions{})
		if err != nil || retained.UID != originalUID {
			t.Fatalf("standalone conversion removed or replaced the administrator-owned Node: %v", err)
		}
		args, err := kubeletArgv(ctx)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := standaloneArgs(args); err != nil {
			t.Fatalf("failed conversion re-enabled kubelet API access: %v", err)
		}
		options.Timeout = 4 * time.Minute
		if recoverForward {
			setReadiness("ready")
			if err := SwitchMode(ctx, options); err != nil {
				t.Fatalf("resume failed conversion: %v", err)
			}
		}
		options.Mode = ModeRegistered
		options.RouteController = nil
		if err := SwitchMode(ctx, options); err != nil {
			t.Fatalf("reverse failed conversion: %v", err)
		}
		verifyCleanup()
		setReadiness("ready")
	}
}
