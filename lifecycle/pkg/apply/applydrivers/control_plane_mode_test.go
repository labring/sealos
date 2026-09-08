// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package applydrivers

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/constants"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

func TestModeGuardsRunBeforeApplyAndResetWriteBack(t *testing.T) {
	previousRoot := constants.DefaultRuntimeRootDir
	constants.DefaultRuntimeRootDir = t.TempDir()
	t.Cleanup(func() {
		constants.DefaultRuntimeRootDir = previousRoot
	})
	current := &v2.Cluster{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "mode-guard-test",
			CreationTimestamp: metav1.Now(),
		},
	}
	desired := current.DeepCopy()
	desired.Spec.ControlPlaneMode = v2.ControlPlaneModeStandalone
	applier := &Applier{
		Context:        context.Background(),
		ClusterCurrent: current,
		ClusterDesired: desired,
	}
	if err := applier.Apply(); err == nil || !strings.Contains(err.Error(), "sealos switch") {
		t.Fatalf("direct mode edit was not rejected: %v", err)
	}
	if desired.Status.Phase != "" {
		t.Fatal("rejected apply changed cluster status")
	}
	desired.Spec.ControlPlaneMode = ""
	marker := filepath.Join(constants.ClusterDir(current.Name), clusterfile.ModeTransitionFilename)
	if err := os.WriteFile(marker, []byte("{}"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := applier.Apply(); err == nil {
		t.Fatal("apply bypassed a pending conversion")
	}
	if err := applier.Delete(); err == nil {
		t.Fatal("reset bypassed a pending conversion")
	}
	if desired.DeletionTimestamp != nil {
		t.Fatal("rejected reset marked the cluster deleted")
	}
	if _, err := os.Stat(constants.Clusterfile(current.Name)); !os.IsNotExist(err) {
		t.Fatal("rejected lifecycle command wrote a Clusterfile")
	}
}
