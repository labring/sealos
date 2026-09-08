package kubernetes

import (
	"strings"
	"testing"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

func TestStandaloneControlPlaneMode(t *testing.T) {
	cluster := &v2.Cluster{
		Spec: v2.ClusterSpec{
			ControlPlaneMode: v2.ControlPlaneModeStandalone,
		},
	}
	if !cluster.IsStandaloneControlPlane() {
		t.Fatal("standalone control-plane mode was not recognized")
	}
	if (&v2.Cluster{}).IsStandaloneControlPlane() {
		t.Fatal("empty control-plane mode must preserve registered behavior")
	}
}

func TestStandaloneMembershipRejectsMissingSurvivor(t *testing.T) {
	runtime := &KubeadmRuntime{
		cluster: &v2.Cluster{
			Spec: v2.ClusterSpec{
				ControlPlaneMode: v2.ControlPlaneModeStandalone,
			},
		},
	}
	operations := map[string]func() error{
		"add master": func() error {
			return runtime.ScaleUp([]string{"192.0.2.1"}, nil)
		},
		"delete master": func() error {
			return runtime.ScaleDown([]string{"192.0.2.1"}, nil)
		},
	}
	for name, operation := range operations {
		t.Run(name, func(t *testing.T) {
			err := operation()
			if err == nil {
				t.Fatal("accepted membership change without an existing survivor")
			}
			if strings.Contains(err.Error(), "unsupported") {
				t.Fatalf("membership operation did not enter standalone validation: %v", err)
			}
		})
	}
}
