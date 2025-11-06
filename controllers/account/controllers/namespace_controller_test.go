package controllers

import (
	"context"
	"testing"

	"github.com/go-logr/logr"
	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic/fake"
	"k8s.io/utils/ptr"
	"sigs.k8s.io/controller-runtime/pkg/client"
	clientfake "sigs.k8s.io/controller-runtime/pkg/client/fake"
)

// Test suspendOrphanDeployments and resumeOrphanDeployments
func TestSuspendResumeOrphanDeployments(t *testing.T) {
	tests := []struct {
		name            string
		initialReplicas int32
		expectSuspended bool
		expectResumed   int32
		skipIfZero      bool
	}{
		{
			name:            "deployment with 3 replicas",
			initialReplicas: 3,
			expectSuspended: true,
			expectResumed:   3,
		},
		{
			name:            "deployment with 1 replica",
			initialReplicas: 1,
			expectSuspended: true,
			expectResumed:   1,
		},
		{
			name:            "deployment with 0 replicas",
			initialReplicas: 0,
			expectSuspended: true,
			expectResumed:   0,
			skipIfZero:      true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			scheme := runtime.NewScheme()
			_ = appsv1.AddToScheme(scheme)

			deploy := &appsv1.Deployment{
				ObjectMeta: v1.ObjectMeta{
					Name:      "test-deploy",
					Namespace: "test-ns",
				},
				Spec: appsv1.DeploymentSpec{
					Replicas: ptr.To(tt.initialReplicas),
				},
			}

			fakeClient := clientfake.NewClientBuilder().
				WithScheme(scheme).
				WithObjects(deploy).
				Build()

			reconciler := &NamespaceReconciler{
				Client: fakeClient,
				Log:    logr.Discard(),
			}

			ctx := context.Background()

			// Test suspend
			err := reconciler.suspendOrphanDeployments(ctx, "test-ns")
			if err != nil {
				t.Fatalf("suspendOrphanDeployments failed: %v", err)
			}

			// Verify suspended state
			var suspendedDeploy appsv1.Deployment
			err = fakeClient.Get(
				ctx,
				client.ObjectKey{Name: "test-deploy", Namespace: "test-ns"},
				&suspendedDeploy,
			)
			if err != nil {
				t.Fatalf("failed to get suspended deployment: %v", err)
			}

			if tt.expectSuspended {
				if *suspendedDeploy.Spec.Replicas != 0 {
					t.Errorf("expected replicas to be 0, got %d", *suspendedDeploy.Spec.Replicas)
				}

				// Check if original state was saved
				annotations := suspendedDeploy.GetAnnotations()
				if _, hasState := annotations[OriginalSuspendStateAnnotation]; !hasState {
					t.Error("expected original state annotation to be saved")
				}
			}

			// Test resume
			err = reconciler.resumeOrphanDeployments(ctx, "test-ns")
			if err != nil {
				t.Fatalf("resumeOrphanDeployments failed: %v", err)
			}

			// Verify resumed state
			var resumedDeploy appsv1.Deployment
			err = fakeClient.Get(
				ctx,
				client.ObjectKey{Name: "test-deploy", Namespace: "test-ns"},
				&resumedDeploy,
			)
			if err != nil {
				t.Fatalf("failed to get resumed deployment: %v", err)
			}

			if tt.skipIfZero && tt.initialReplicas == 0 {
				// If original was 0, replicas should still be 0
				if *resumedDeploy.Spec.Replicas != 0 {
					t.Errorf("expected replicas to remain 0, got %d", *resumedDeploy.Spec.Replicas)
				}
			} else {
				// Otherwise, replicas should be restored
				if *resumedDeploy.Spec.Replicas != tt.expectResumed {
					t.Errorf("expected replicas to be %d, got %d", tt.expectResumed, *resumedDeploy.Spec.Replicas)
				}
			}

			// Check if original state annotation was removed
			annotations := resumedDeploy.GetAnnotations()
			if _, hasState := annotations[OriginalSuspendStateAnnotation]; hasState {
				t.Error("expected original state annotation to be removed")
			}
		})
	}
}

// Test suspendOrphanStatefulSets and resumeOrphanStatefulSets
func TestSuspendResumeOrphanStatefulSets(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = appsv1.AddToScheme(scheme)

	sts := &appsv1.StatefulSet{
		ObjectMeta: v1.ObjectMeta{
			Name:      "test-sts",
			Namespace: "test-ns",
		},
		Spec: appsv1.StatefulSetSpec{
			Replicas: ptr.To(int32(3)),
		},
	}

	fakeClient := clientfake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(sts).
		Build()

	reconciler := &NamespaceReconciler{
		Client: fakeClient,
		Log:    logr.Discard(),
	}

	ctx := context.Background()

	// Test suspend
	err := reconciler.suspendOrphanStatefulSets(ctx, "test-ns")
	if err != nil {
		t.Fatalf("suspendOrphanStatefulSets failed: %v", err)
	}

	// Verify suspended
	var suspendedSts appsv1.StatefulSet
	err = fakeClient.Get(
		ctx,
		client.ObjectKey{Name: "test-sts", Namespace: "test-ns"},
		&suspendedSts,
	)
	if err != nil {
		t.Fatalf("failed to get suspended statefulset: %v", err)
	}

	if *suspendedSts.Spec.Replicas != 0 {
		t.Errorf("expected replicas to be 0, got %d", *suspendedSts.Spec.Replicas)
	}

	// Test resume
	err = reconciler.resumeOrphanStatefulSets(ctx, "test-ns")
	if err != nil {
		t.Fatalf("resumeOrphanStatefulSets failed: %v", err)
	}

	// Verify resumed
	var resumedSts appsv1.StatefulSet
	err = fakeClient.Get(ctx, client.ObjectKey{Name: "test-sts", Namespace: "test-ns"}, &resumedSts)
	if err != nil {
		t.Fatalf("failed to get resumed statefulset: %v", err)
	}

	if *resumedSts.Spec.Replicas != 3 {
		t.Errorf("expected replicas to be 3, got %d", *resumedSts.Spec.Replicas)
	}
}

// Test suspendOrphanReplicaSets and resumeOrphanReplicaSets
func TestSuspendResumeOrphanReplicaSets(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = appsv1.AddToScheme(scheme)

	rs := &appsv1.ReplicaSet{
		ObjectMeta: v1.ObjectMeta{
			Name:      "test-rs",
			Namespace: "test-ns",
		},
		Spec: appsv1.ReplicaSetSpec{
			Replicas: ptr.To(int32(2)),
		},
	}

	fakeClient := clientfake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(rs).
		Build()

	reconciler := &NamespaceReconciler{
		Client: fakeClient,
		Log:    logr.Discard(),
	}

	ctx := context.Background()

	// Test suspend
	err := reconciler.suspendOrphanReplicaSets(ctx, "test-ns")
	if err != nil {
		t.Fatalf("suspendOrphanReplicaSets failed: %v", err)
	}

	// Verify suspended
	var suspendedRs appsv1.ReplicaSet
	err = fakeClient.Get(ctx, client.ObjectKey{Name: "test-rs", Namespace: "test-ns"}, &suspendedRs)
	if err != nil {
		t.Fatalf("failed to get suspended replicaset: %v", err)
	}

	if *suspendedRs.Spec.Replicas != 0 {
		t.Errorf("expected replicas to be 0, got %d", *suspendedRs.Spec.Replicas)
	}

	// Test resume
	err = reconciler.resumeOrphanReplicaSets(ctx, "test-ns")
	if err != nil {
		t.Fatalf("resumeOrphanReplicaSets failed: %v", err)
	}

	// Verify resumed
	var resumedRs appsv1.ReplicaSet
	err = fakeClient.Get(ctx, client.ObjectKey{Name: "test-rs", Namespace: "test-ns"}, &resumedRs)
	if err != nil {
		t.Fatalf("failed to get resumed replicaset: %v", err)
	}

	if *resumedRs.Spec.Replicas != 2 {
		t.Errorf("expected replicas to be 2, got %d", *resumedRs.Spec.Replicas)
	}
}

// Test suspendOrphanCronJob and resumeOrphanCronJob
func TestSuspendResumeOrphanCronJob(t *testing.T) {
	tests := []struct {
		name               string
		initiallySuspended bool
		expectSuspended    bool
	}{
		{
			name:               "active cronjob",
			initiallySuspended: false,
			expectSuspended:    true,
		},
		{
			name:               "already suspended cronjob",
			initiallySuspended: true,
			expectSuspended:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			scheme := runtime.NewScheme()
			_ = batchv1.AddToScheme(scheme)

			cronJob := &batchv1.CronJob{
				ObjectMeta: v1.ObjectMeta{
					Name:      "test-cronjob",
					Namespace: "test-ns",
				},
				Spec: batchv1.CronJobSpec{
					Schedule: "*/5 * * * *",
					Suspend:  ptr.To(tt.initiallySuspended),
				},
			}

			fakeClient := clientfake.NewClientBuilder().
				WithScheme(scheme).
				WithObjects(cronJob).
				Build()

			reconciler := &NamespaceReconciler{
				Client: fakeClient,
				Log:    logr.Discard(),
			}

			ctx := context.Background()

			// Test suspend
			err := reconciler.suspendOrphanCronJob(ctx, "test-ns")
			if err != nil {
				t.Fatalf("suspendOrphanCronJob failed: %v", err)
			}

			// Verify suspended
			var suspendedCronJob batchv1.CronJob
			err = fakeClient.Get(
				ctx,
				client.ObjectKey{Name: "test-cronjob", Namespace: "test-ns"},
				&suspendedCronJob,
			)
			if err != nil {
				t.Fatalf("failed to get suspended cronjob: %v", err)
			}

			if !*suspendedCronJob.Spec.Suspend {
				t.Error("expected cronjob to be suspended")
			}

			// Test resume
			err = reconciler.resumeOrphanCronJob(ctx, "test-ns")
			if err != nil {
				t.Fatalf("resumeOrphanCronJob failed: %v", err)
			}

			// Verify resumed
			var resumedCronJob batchv1.CronJob
			err = fakeClient.Get(
				ctx,
				client.ObjectKey{Name: "test-cronjob", Namespace: "test-ns"},
				&resumedCronJob,
			)
			if err != nil {
				t.Fatalf("failed to get resumed cronjob: %v", err)
			}

			// Should restore to original state
			if *resumedCronJob.Spec.Suspend != tt.initiallySuspended {
				t.Errorf(
					"expected suspend to be %v, got %v",
					tt.initiallySuspended,
					*resumedCronJob.Spec.Suspend,
				)
			}
		})
	}
}

// Test suspendKBCluster and resumeKBCluster
func TestSuspendResumeKBCluster(t *testing.T) {
	tests := []struct {
		name                 string
		clusterPhase         string
		backupEnabled        bool
		expectBackupDisabled bool
		shouldCreateOps      bool
	}{
		{
			name:                 "running cluster with backup",
			clusterPhase:         "Running",
			backupEnabled:        true,
			expectBackupDisabled: true,
			shouldCreateOps:      true,
		},
		{
			name:                 "running cluster without backup",
			clusterPhase:         "Running",
			backupEnabled:        false,
			expectBackupDisabled: false,
			shouldCreateOps:      true,
		},
		{
			name:                 "stopped cluster with backup",
			clusterPhase:         "Stopped",
			backupEnabled:        true,
			expectBackupDisabled: true,
			shouldCreateOps:      false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			scheme := runtime.NewScheme()

			cluster := &unstructured.Unstructured{
				Object: map[string]any{
					"apiVersion": "apps.kubeblocks.io/v1alpha1",
					"kind":       "Cluster",
					"metadata": map[string]any{
						"name":      "test-cluster",
						"namespace": "test-ns",
					},
					"spec": map[string]any{},
					"status": map[string]any{
						"phase": tt.clusterPhase,
					},
				},
			}

			if tt.backupEnabled {
				_ = unstructured.SetNestedField(cluster.Object, true, "spec", "backup", "enabled")
			}

			dynamicClient := fake.NewSimpleDynamicClient(scheme, cluster)

			reconciler := &NamespaceReconciler{
				dynamicClient: dynamicClient,
				Log:           logr.Discard(),
			}

			ctx := context.Background()

			// Test suspend
			err := reconciler.suspendKBCluster(ctx, "test-ns")
			if err != nil {
				t.Fatalf("suspendKBCluster failed: %v", err)
			}

			// Verify suspension
			clusterGVR := schema.GroupVersionResource{
				Group:    "apps.kubeblocks.io",
				Version:  "v1alpha1",
				Resource: "clusters",
			}

			suspendedCluster, err := dynamicClient.Resource(clusterGVR).
				Namespace("test-ns").
				Get(ctx, "test-cluster", v1.GetOptions{})
			if err != nil {
				t.Fatalf("failed to get suspended cluster: %v", err)
			}

			// Check if original state was saved
			annotations := suspendedCluster.GetAnnotations()
			stateJSON, hasState := annotations[OriginalSuspendStateAnnotation]
			if !hasState {
				t.Fatal("expected original state annotation to be saved")
			}

			// Decode and verify state
			state, err := decodeKBClusterState(stateJSON)
			if err != nil {
				t.Fatalf("failed to decode state: %v", err)
			}

			expectedWasRunning := tt.clusterPhase != "Stopped" && tt.clusterPhase != "Stopping"
			if state.WasRunning != expectedWasRunning {
				t.Errorf("expected wasRunning %v, got %v", expectedWasRunning, state.WasRunning)
			}

			if state.BackupEnabled != tt.backupEnabled {
				t.Errorf("expected backupEnabled %v, got %v", tt.backupEnabled, state.BackupEnabled)
			}

			// Check if backup was disabled
			if tt.expectBackupDisabled {
				enabled, found, _ := unstructured.NestedBool(
					suspendedCluster.Object,
					"spec",
					"backup",
					"enabled",
				)
				if !found {
					t.Error("backup.enabled field not found")
				} else if enabled {
					t.Error("expected backup to be disabled")
				}
			}

			// Simulate cluster being stopped
			_ = unstructured.SetNestedField(suspendedCluster.Object, "Stopped", "status", "phase")
			_, err = dynamicClient.Resource(clusterGVR).
				Namespace("test-ns").
				Update(ctx, suspendedCluster, v1.UpdateOptions{})
			if err != nil {
				t.Fatalf("failed to update cluster status: %v", err)
			}

			// Test resume
			err = reconciler.resumeKBCluster(ctx, "test-ns")
			if err != nil {
				t.Fatalf("resumeKBCluster failed: %v", err)
			}

			// Verify resume
			resumedCluster, err := dynamicClient.Resource(clusterGVR).
				Namespace("test-ns").
				Get(ctx, "test-cluster", v1.GetOptions{})
			if err != nil {
				t.Fatalf("failed to get resumed cluster: %v", err)
			}

			// Check if annotation was removed
			annotations = resumedCluster.GetAnnotations()
			if _, hasState := annotations[OriginalSuspendStateAnnotation]; hasState {
				t.Error("expected original state annotation to be removed")
			}

			// Check if backup was restored
			if tt.backupEnabled {
				enabled, found, _ := unstructured.NestedBool(
					resumedCluster.Object,
					"spec",
					"backup",
					"enabled",
				)
				if !found {
					t.Error("backup.enabled field not found after resume")
				} else if !enabled {
					t.Error("expected backup to be restored to enabled")
				}
			}
		})
	}
}

// Test suspendCertificates and resumeCertificates
func TestSuspendResumeCertificates(t *testing.T) {
	tests := []struct {
		name                       string
		initialDisableReissue      string
		hasInitialAnnotation       bool
		expectDisabledAfterSuspend bool
	}{
		{
			name:                       "certificate without disable annotation",
			initialDisableReissue:      "",
			hasInitialAnnotation:       false,
			expectDisabledAfterSuspend: true,
		},
		{
			name:                       "certificate with disable=true",
			initialDisableReissue:      "true",
			hasInitialAnnotation:       true,
			expectDisabledAfterSuspend: true,
		},
		{
			name:                       "certificate with disable=false",
			initialDisableReissue:      "false",
			hasInitialAnnotation:       true,
			expectDisabledAfterSuspend: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			scheme := runtime.NewScheme()

			cert := &unstructured.Unstructured{
				Object: map[string]any{
					"apiVersion": "cert-manager.io/v1",
					"kind":       "Certificate",
					"metadata": map[string]any{
						"name":      "test-cert",
						"namespace": "test-ns",
					},
					"spec": map[string]any{
						"secretName": "test-secret",
						"dnsNames":   []any{"example.com"},
					},
				},
			}

			if tt.hasInitialAnnotation {
				annotations := map[string]any{
					CertManagerDisableReissueAnnotation: tt.initialDisableReissue,
				}
				_ = unstructured.SetNestedMap(cert.Object, annotations, "metadata", "annotations")
			}

			dynamicClient := fake.NewSimpleDynamicClient(scheme, cert)

			reconciler := &NamespaceReconciler{
				dynamicClient: dynamicClient,
				Log:           logr.Discard(),
			}

			ctx := context.Background()

			// Test suspend
			err := reconciler.suspendCertificates(ctx, "test-ns")
			if err != nil {
				t.Fatalf("suspendCertificates failed: %v", err)
			}

			// Verify suspension
			certGVR := schema.GroupVersionResource{
				Group:    "cert-manager.io",
				Version:  "v1",
				Resource: "certificates",
			}

			suspendedCert, err := dynamicClient.Resource(certGVR).
				Namespace("test-ns").
				Get(ctx, "test-cert", v1.GetOptions{})
			if err != nil {
				t.Fatalf("failed to get suspended certificate: %v", err)
			}

			// Check annotations
			annotations := suspendedCert.GetAnnotations()
			if _, hasState := annotations[OriginalSuspendStateAnnotation]; !hasState {
				t.Error("expected original state annotation to be saved")
			}

			disableValue, hasDisable := annotations[CertManagerDisableReissueAnnotation]
			if !hasDisable || disableValue != "true" {
				t.Error("expected disable-reissue annotation to be set to true")
			}

			// Test resume
			err = reconciler.resumeCertificates(ctx, "test-ns")
			if err != nil {
				t.Fatalf("resumeCertificates failed: %v", err)
			}

			// Verify resume
			resumedCert, err := dynamicClient.Resource(certGVR).
				Namespace("test-ns").
				Get(ctx, "test-cert", v1.GetOptions{})
			if err != nil {
				t.Fatalf("failed to get resumed certificate: %v", err)
			}

			// Check if annotation was removed
			annotations = resumedCert.GetAnnotations()
			if _, hasState := annotations[OriginalSuspendStateAnnotation]; hasState {
				t.Error("expected original state annotation to be removed")
			}

			// Check if disable-reissue was restored correctly
			disableValue, hasDisable = annotations[CertManagerDisableReissueAnnotation]
			wasDisabled := tt.hasInitialAnnotation && tt.initialDisableReissue == "true"

			if wasDisabled {
				// Should still have the annotation set to "true"
				if !hasDisable || disableValue != "true" {
					t.Error("expected disable-reissue annotation to remain true")
				}
			} else {
				// Should not have the annotation
				if hasDisable {
					t.Error("expected disable-reissue annotation to be removed")
				}
			}
		})
	}
}

// Test roundtrip: suspend -> resume
func TestSuspendResumeRoundtrip(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = appsv1.AddToScheme(scheme)
	_ = batchv1.AddToScheme(scheme)

	// Create resources
	deploy := &appsv1.Deployment{
		ObjectMeta: v1.ObjectMeta{
			Name:      "test-deploy",
			Namespace: "test-ns",
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: ptr.To(int32(3)),
		},
	}

	cronJob := &batchv1.CronJob{
		ObjectMeta: v1.ObjectMeta{
			Name:      "test-cronjob",
			Namespace: "test-ns",
		},
		Spec: batchv1.CronJobSpec{
			Schedule: "*/5 * * * *",
			Suspend:  ptr.To(false),
		},
	}

	fakeClient := clientfake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(deploy, cronJob).
		Build()

	reconciler := &NamespaceReconciler{
		Client: fakeClient,
		Log:    logr.Discard(),
	}

	ctx := context.Background()

	// Suspend all
	if err := reconciler.suspendOrphanDeployments(ctx, "test-ns"); err != nil {
		t.Fatalf("suspendOrphanDeployments failed: %v", err)
	}
	if err := reconciler.suspendOrphanCronJob(ctx, "test-ns"); err != nil {
		t.Fatalf("suspendOrphanCronJob failed: %v", err)
	}

	// Verify all suspended
	var suspendedDeploy appsv1.Deployment
	_ = fakeClient.Get(
		ctx,
		client.ObjectKey{Name: "test-deploy", Namespace: "test-ns"},
		&suspendedDeploy,
	)
	if *suspendedDeploy.Spec.Replicas != 0 {
		t.Error("deployment should be suspended")
	}

	var suspendedCronJob batchv1.CronJob
	_ = fakeClient.Get(
		ctx,
		client.ObjectKey{Name: "test-cronjob", Namespace: "test-ns"},
		&suspendedCronJob,
	)
	if !*suspendedCronJob.Spec.Suspend {
		t.Error("cronjob should be suspended")
	}

	// Resume all
	if err := reconciler.resumeOrphanDeployments(ctx, "test-ns"); err != nil {
		t.Fatalf("resumeOrphanDeployments failed: %v", err)
	}
	if err := reconciler.resumeOrphanCronJob(ctx, "test-ns"); err != nil {
		t.Fatalf("resumeOrphanCronJob failed: %v", err)
	}

	// Verify all resumed
	var resumedDeploy appsv1.Deployment
	_ = fakeClient.Get(
		ctx,
		client.ObjectKey{Name: "test-deploy", Namespace: "test-ns"},
		&resumedDeploy,
	)
	if *resumedDeploy.Spec.Replicas != 3 {
		t.Error("deployment should be resumed to 3 replicas")
	}

	var resumedCronJob batchv1.CronJob
	_ = fakeClient.Get(
		ctx,
		client.ObjectKey{Name: "test-cronjob", Namespace: "test-ns"},
		&resumedCronJob,
	)
	if *resumedCronJob.Spec.Suspend {
		t.Error("cronjob should be resumed")
	}
}
