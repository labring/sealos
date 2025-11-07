package controllers

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/go-logr/logr"
	appsv1 "k8s.io/api/apps/v1"
	autoscalingv2 "k8s.io/api/autoscaling/v2"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
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

// Test HPA suspend and resume with frontend deployment
func TestSuspendResumeHPAWithFrontendDeployment(t *testing.T) {
	tests := []struct {
		name               string
		hasHPA             bool
		hpaTarget          string
		hpaValue           int32
		hpaMinReplicas     int32
		hpaMaxReplicas     int32
		deploymentReplicas int32
		expectPauseKey     bool
		expectHPADeleted   bool
		expectHPARestored  bool
	}{
		{
			name:               "deployment with HPA",
			hasHPA:             true,
			hpaTarget:          "cpu",
			hpaValue:           80,
			hpaMinReplicas:     2,
			hpaMaxReplicas:     10,
			deploymentReplicas: 3,
			expectPauseKey:     true,
			expectHPADeleted:   true,
			expectHPARestored:  true,
		},
		{
			name:               "deployment without HPA",
			hasHPA:             false,
			deploymentReplicas: 3,
			expectPauseKey:     true,
			expectHPADeleted:   false,
			expectHPARestored:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			scheme := runtime.NewScheme()
			_ = appsv1.AddToScheme(scheme)
			_ = autoscalingv2.AddToScheme(scheme)

			// Create deployment with frontend annotations
			deploy := &appsv1.Deployment{
				ObjectMeta: v1.ObjectMeta{
					Name:      "test-deploy",
					Namespace: "test-ns",
					Annotations: map[string]string{
						MinReplicasKey: "2",
						MaxReplicasKey: "10",
					},
				},
				Spec: appsv1.DeploymentSpec{
					Replicas: ptr.To(tt.deploymentReplicas),
				},
			}

			objects := []client.Object{deploy}

			// Create HPA if needed
			if tt.hasHPA {
				hpa := &autoscalingv2.HorizontalPodAutoscaler{
					ObjectMeta: v1.ObjectMeta{
						Name:      "test-deploy",
						Namespace: "test-ns",
					},
					Spec: autoscalingv2.HorizontalPodAutoscalerSpec{
						ScaleTargetRef: autoscalingv2.CrossVersionObjectReference{
							APIVersion: "apps/v1",
							Kind:       "Deployment",
							Name:       "test-deploy",
						},
						MinReplicas: ptr.To(tt.hpaMinReplicas),
						MaxReplicas: tt.hpaMaxReplicas,
						Metrics: []autoscalingv2.MetricSpec{
							{
								Type: autoscalingv2.ResourceMetricSourceType,
								Resource: &autoscalingv2.ResourceMetricSource{
									Name: corev1.ResourceName(tt.hpaTarget),
									Target: autoscalingv2.MetricTarget{
										Type:               autoscalingv2.UtilizationMetricType,
										AverageUtilization: ptr.To(tt.hpaValue),
									},
								},
							},
						},
					},
				}
				objects = append(objects, hpa)
			}

			fakeClient := clientfake.NewClientBuilder().
				WithScheme(scheme).
				WithObjects(objects...).
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

			// Check replicas are 0
			if *suspendedDeploy.Spec.Replicas != 0 {
				t.Errorf("expected replicas to be 0, got %d", *suspendedDeploy.Spec.Replicas)
			}

			// Check pause annotation
			annotations := suspendedDeploy.GetAnnotations()
			if tt.expectPauseKey {
				pauseJSON, hasPause := annotations[PauseKey]
				if !hasPause {
					t.Error("expected pause annotation to be set")
				}

				// Verify pause data
				var pauseData PauseData
				if err := json.Unmarshal([]byte(pauseJSON), &pauseData); err != nil {
					t.Fatalf("failed to unmarshal pause data: %v", err)
				}

				if tt.hasHPA {
					if pauseData.Target != tt.hpaTarget {
						t.Errorf("expected target %s, got %s", tt.hpaTarget, pauseData.Target)
					}
					expectedValue := "80"
					if pauseData.Value != expectedValue {
						t.Errorf("expected value %s, got %s", expectedValue, pauseData.Value)
					}
				} else if pauseData.Target != "" || pauseData.Value != "" {
					t.Error("expected empty pause data when no HPA exists")
				}
			}

			// Check if HPA was deleted
			if tt.expectHPADeleted {
				var hpa autoscalingv2.HorizontalPodAutoscaler
				err := fakeClient.Get(
					ctx,
					client.ObjectKey{Name: "test-deploy", Namespace: "test-ns"},
					&hpa,
				)
				if err == nil {
					t.Error("expected HPA to be deleted")
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

			// Check replicas restored
			if *resumedDeploy.Spec.Replicas != tt.deploymentReplicas {
				t.Errorf(
					"expected replicas to be %d, got %d",
					tt.deploymentReplicas,
					*resumedDeploy.Spec.Replicas,
				)
			}

			// Check pause annotation removed
			annotations = resumedDeploy.GetAnnotations()
			if _, hasPause := annotations[PauseKey]; hasPause {
				t.Error("expected pause annotation to be removed")
			}

			// Check if HPA was restored
			if tt.expectHPARestored {
				var restoredHPA autoscalingv2.HorizontalPodAutoscaler
				err := fakeClient.Get(
					ctx,
					client.ObjectKey{Name: "test-deploy", Namespace: "test-ns"},
					&restoredHPA,
				)
				if err != nil {
					t.Fatalf("expected HPA to be restored, got error: %v", err)
				}

				// Verify HPA configuration
				if *restoredHPA.Spec.MinReplicas != tt.hpaMinReplicas {
					t.Errorf(
						"expected minReplicas %d, got %d",
						tt.hpaMinReplicas,
						*restoredHPA.Spec.MinReplicas,
					)
				}
				if restoredHPA.Spec.MaxReplicas != tt.hpaMaxReplicas {
					t.Errorf(
						"expected maxReplicas %d, got %d",
						tt.hpaMaxReplicas,
						restoredHPA.Spec.MaxReplicas,
					)
				}

				if len(restoredHPA.Spec.Metrics) > 0 &&
					restoredHPA.Spec.Metrics[0].Resource != nil {
					resourceName := string(restoredHPA.Spec.Metrics[0].Resource.Name)
					if resourceName != tt.hpaTarget {
						t.Errorf("expected target %s, got %s", tt.hpaTarget, resourceName)
					}

					if restoredHPA.Spec.Metrics[0].Resource.Target.AverageUtilization != nil {
						value := *restoredHPA.Spec.Metrics[0].Resource.Target.AverageUtilization
						if value != tt.hpaValue {
							t.Errorf("expected value %d, got %d", tt.hpaValue, value)
						}
					}
				}
			}
		})
	}
}

// Test HPA suspend and resume with statefulset
func TestSuspendResumeHPAWithFrontendStatefulSet(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = appsv1.AddToScheme(scheme)
	_ = autoscalingv2.AddToScheme(scheme)

	// Create statefulset with frontend annotations
	sts := &appsv1.StatefulSet{
		ObjectMeta: v1.ObjectMeta{
			Name:      "test-sts",
			Namespace: "test-ns",
			Annotations: map[string]string{
				MinReplicasKey: "1",
				MaxReplicasKey: "5",
			},
		},
		Spec: appsv1.StatefulSetSpec{
			Replicas: ptr.To(int32(3)),
		},
	}

	// Create HPA
	hpa := &autoscalingv2.HorizontalPodAutoscaler{
		ObjectMeta: v1.ObjectMeta{
			Name:      "test-sts",
			Namespace: "test-ns",
		},
		Spec: autoscalingv2.HorizontalPodAutoscalerSpec{
			ScaleTargetRef: autoscalingv2.CrossVersionObjectReference{
				APIVersion: "apps/v1",
				Kind:       "StatefulSet",
				Name:       "test-sts",
			},
			MinReplicas: ptr.To(int32(1)),
			MaxReplicas: 5,
			Metrics: []autoscalingv2.MetricSpec{
				{
					Type: autoscalingv2.ResourceMetricSourceType,
					Resource: &autoscalingv2.ResourceMetricSource{
						Name: corev1.ResourceCPU,
						Target: autoscalingv2.MetricTarget{
							Type:               autoscalingv2.UtilizationMetricType,
							AverageUtilization: ptr.To(int32(70)),
						},
					},
				},
			},
		},
	}

	fakeClient := clientfake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(sts, hpa).
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

	// Verify HPA was deleted
	var deletedHPA autoscalingv2.HorizontalPodAutoscaler
	err = fakeClient.Get(ctx, client.ObjectKey{Name: "test-sts", Namespace: "test-ns"}, &deletedHPA)
	if err == nil {
		t.Error("expected HPA to be deleted")
	}

	// Verify pause annotation
	var suspendedSts appsv1.StatefulSet
	err = fakeClient.Get(
		ctx,
		client.ObjectKey{Name: "test-sts", Namespace: "test-ns"},
		&suspendedSts,
	)
	if err != nil {
		t.Fatalf("failed to get suspended statefulset: %v", err)
	}

	annotations := suspendedSts.GetAnnotations()
	pauseJSON, hasPause := annotations[PauseKey]
	if !hasPause {
		t.Fatal("expected pause annotation to be set")
	}

	var pauseData PauseData
	if err := json.Unmarshal([]byte(pauseJSON), &pauseData); err != nil {
		t.Fatalf("failed to unmarshal pause data: %v", err)
	}

	if pauseData.Target != "cpu" {
		t.Errorf("expected target cpu, got %s", pauseData.Target)
	}
	if pauseData.Value != "70" {
		t.Errorf("expected value 70, got %s", pauseData.Value)
	}

	// Test resume
	err = reconciler.resumeOrphanStatefulSets(ctx, "test-ns")
	if err != nil {
		t.Fatalf("resumeOrphanStatefulSets failed: %v", err)
	}

	// Verify HPA was restored
	var restoredHPA autoscalingv2.HorizontalPodAutoscaler
	err = fakeClient.Get(
		ctx,
		client.ObjectKey{Name: "test-sts", Namespace: "test-ns"},
		&restoredHPA,
	)
	if err != nil {
		t.Fatalf("expected HPA to be restored, got error: %v", err)
	}

	// Verify HPA kind is StatefulSet
	if restoredHPA.Spec.ScaleTargetRef.Kind != "StatefulSet" {
		t.Errorf("expected kind StatefulSet, got %s", restoredHPA.Spec.ScaleTargetRef.Kind)
	}
}

// Test deployViaFrontend helper function
func TestDeployViaFrontend(t *testing.T) {
	tests := []struct {
		name        string
		annotations map[string]string
		expected    bool
	}{
		{
			name: "has minReplicas",
			annotations: map[string]string{
				MinReplicasKey: "1",
			},
			expected: true,
		},
		{
			name: "has maxReplicas",
			annotations: map[string]string{
				MaxReplicasKey: "5",
			},
			expected: true,
		},
		{
			name: "has resize",
			annotations: map[string]string{
				DeployPVCResizeKey: "true",
			},
			expected: true,
		},
		{
			name: "has all annotations",
			annotations: map[string]string{
				MinReplicasKey:     "1",
				MaxReplicasKey:     "5",
				DeployPVCResizeKey: "true",
			},
			expected: true,
		},
		{
			name:        "has no frontend annotations",
			annotations: map[string]string{},
			expected:    false,
		},
		{
			name:        "nil annotations",
			annotations: nil,
			expected:    false,
		},
		{
			name: "has other annotations only",
			annotations: map[string]string{
				"app": "test",
			},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := deployViaFrontend(tt.annotations)
			if result != tt.expected {
				t.Errorf("expected %v, got %v", tt.expected, result)
			}
		})
	}
}

// Test deployment without frontend annotations (should not touch HPA)
func TestSuspendResumeNonFrontendDeployment(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = appsv1.AddToScheme(scheme)
	_ = autoscalingv2.AddToScheme(scheme)

	// Create deployment WITHOUT frontend annotations
	deploy := &appsv1.Deployment{
		ObjectMeta: v1.ObjectMeta{
			Name:      "test-deploy",
			Namespace: "test-ns",
			// No frontend annotations
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: ptr.To(int32(3)),
		},
	}

	// Create HPA
	hpa := &autoscalingv2.HorizontalPodAutoscaler{
		ObjectMeta: v1.ObjectMeta{
			Name:      "test-deploy",
			Namespace: "test-ns",
		},
		Spec: autoscalingv2.HorizontalPodAutoscalerSpec{
			ScaleTargetRef: autoscalingv2.CrossVersionObjectReference{
				APIVersion: "apps/v1",
				Kind:       "Deployment",
				Name:       "test-deploy",
			},
			MinReplicas: ptr.To(int32(2)),
			MaxReplicas: 10,
		},
	}

	fakeClient := clientfake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(deploy, hpa).
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

	// Verify HPA was NOT touched (should still exist)
	var existingHPA autoscalingv2.HorizontalPodAutoscaler
	err = fakeClient.Get(
		ctx,
		client.ObjectKey{Name: "test-deploy", Namespace: "test-ns"},
		&existingHPA,
	)
	if err != nil {
		t.Error("HPA should not be deleted for non-frontend deployment")
	}

	// Verify suspended deployment state
	var suspendedDeploy appsv1.Deployment
	err = fakeClient.Get(
		ctx,
		client.ObjectKey{Name: "test-deploy", Namespace: "test-ns"},
		&suspendedDeploy,
	)
	if err != nil {
		t.Fatalf("failed to get deployment: %v", err)
	}

	// Check replicas set to 0
	if *suspendedDeploy.Spec.Replicas != 0 {
		t.Errorf("expected replicas to be 0, got %d", *suspendedDeploy.Spec.Replicas)
	}

	// Verify no pause annotation
	annotations := suspendedDeploy.GetAnnotations()
	if _, hasPause := annotations[PauseKey]; hasPause {
		t.Error("pause annotation should not be set for non-frontend deployment")
	}

	// Verify original suspend state annotation exists
	stateJSON, hasState := annotations[OriginalSuspendStateAnnotation]
	if !hasState {
		t.Fatal("original suspend state annotation should be set")
	}

	// Verify the saved state
	var state DeploymentOriginalState
	if err := json.Unmarshal([]byte(stateJSON), &state); err != nil {
		t.Fatalf("failed to unmarshal state: %v", err)
	}
	if state.Replicas != 3 {
		t.Errorf("expected original replicas to be 3, got %d", state.Replicas)
	}

	// Test resume
	err = reconciler.resumeOrphanDeployments(ctx, "test-ns")
	if err != nil {
		t.Fatalf("resumeOrphanDeployments failed: %v", err)
	}

	// Verify resumed deployment
	var resumedDeploy appsv1.Deployment
	err = fakeClient.Get(
		ctx,
		client.ObjectKey{Name: "test-deploy", Namespace: "test-ns"},
		&resumedDeploy,
	)
	if err != nil {
		t.Fatalf("failed to get resumed deployment: %v", err)
	}

	// Check replicas restored
	if *resumedDeploy.Spec.Replicas != 3 {
		t.Errorf("expected replicas to be 3, got %d", *resumedDeploy.Spec.Replicas)
	}

	// Verify original suspend state annotation removed
	annotations = resumedDeploy.GetAnnotations()
	if _, hasState := annotations[OriginalSuspendStateAnnotation]; hasState {
		t.Error("original suspend state annotation should be removed after resume")
	}

	// Verify HPA still exists and unchanged
	var finalHPA autoscalingv2.HorizontalPodAutoscaler
	err = fakeClient.Get(
		ctx,
		client.ObjectKey{Name: "test-deploy", Namespace: "test-ns"},
		&finalHPA,
	)
	if err != nil {
		t.Error("HPA should still exist after resume for non-frontend deployment")
	}

	// Verify HPA configuration unchanged
	if *finalHPA.Spec.MinReplicas != 2 {
		t.Errorf("expected HPA minReplicas to remain 2, got %d", *finalHPA.Spec.MinReplicas)
	}
	if finalHPA.Spec.MaxReplicas != 10 {
		t.Errorf("expected HPA maxReplicas to remain 10, got %d", finalHPA.Spec.MaxReplicas)
	}
}

// Test statefulset without frontend annotations (should not touch HPA)
func TestSuspendResumeNonFrontendStatefulSet(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = appsv1.AddToScheme(scheme)
	_ = autoscalingv2.AddToScheme(scheme)

	// Create statefulset WITHOUT frontend annotations
	sts := &appsv1.StatefulSet{
		ObjectMeta: v1.ObjectMeta{
			Name:      "test-sts",
			Namespace: "test-ns",
			// No frontend annotations
		},
		Spec: appsv1.StatefulSetSpec{
			Replicas: ptr.To(int32(5)),
		},
	}

	// Create HPA
	hpa := &autoscalingv2.HorizontalPodAutoscaler{
		ObjectMeta: v1.ObjectMeta{
			Name:      "test-sts",
			Namespace: "test-ns",
		},
		Spec: autoscalingv2.HorizontalPodAutoscalerSpec{
			ScaleTargetRef: autoscalingv2.CrossVersionObjectReference{
				APIVersion: "apps/v1",
				Kind:       "StatefulSet",
				Name:       "test-sts",
			},
			MinReplicas: ptr.To(int32(3)),
			MaxReplicas: 15,
		},
	}

	fakeClient := clientfake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(sts, hpa).
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

	// Verify suspended statefulset
	var suspendedSts appsv1.StatefulSet
	err = fakeClient.Get(
		ctx,
		client.ObjectKey{Name: "test-sts", Namespace: "test-ns"},
		&suspendedSts,
	)
	if err != nil {
		t.Fatalf("failed to get statefulset: %v", err)
	}

	// Check replicas set to 0
	if *suspendedSts.Spec.Replicas != 0 {
		t.Errorf("expected replicas to be 0, got %d", *suspendedSts.Spec.Replicas)
	}

	// Verify no pause annotation
	annotations := suspendedSts.GetAnnotations()
	if _, hasPause := annotations[PauseKey]; hasPause {
		t.Error("pause annotation should not be set for non-frontend statefulset")
	}

	// Verify original suspend state annotation exists
	if _, hasState := annotations[OriginalSuspendStateAnnotation]; !hasState {
		t.Error("original suspend state annotation should be set")
	}

	// Verify HPA was NOT touched
	var existingHPA autoscalingv2.HorizontalPodAutoscaler
	err = fakeClient.Get(
		ctx,
		client.ObjectKey{Name: "test-sts", Namespace: "test-ns"},
		&existingHPA,
	)
	if err != nil {
		t.Error("HPA should not be deleted for non-frontend statefulset")
	}

	// Test resume
	err = reconciler.resumeOrphanStatefulSets(ctx, "test-ns")
	if err != nil {
		t.Fatalf("resumeOrphanStatefulSets failed: %v", err)
	}

	// Verify resumed statefulset
	var resumedSts appsv1.StatefulSet
	err = fakeClient.Get(ctx, client.ObjectKey{Name: "test-sts", Namespace: "test-ns"}, &resumedSts)
	if err != nil {
		t.Fatalf("failed to get resumed statefulset: %v", err)
	}

	// Check replicas restored
	if *resumedSts.Spec.Replicas != 5 {
		t.Errorf("expected replicas to be 5, got %d", *resumedSts.Spec.Replicas)
	}

	// Verify HPA still exists
	var finalHPA autoscalingv2.HorizontalPodAutoscaler
	err = fakeClient.Get(ctx, client.ObjectKey{Name: "test-sts", Namespace: "test-ns"}, &finalHPA)
	if err != nil {
		t.Error("HPA should still exist after resume for non-frontend statefulset")
	}
}

// Test that originally paused deployments (replicas=0) don't restore HPA
func TestResumeAlreadyPausedDeploymentWithHPA(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = appsv1.AddToScheme(scheme)
	_ = autoscalingv2.AddToScheme(scheme)

	// Create deployment that was originally paused (replicas=0) with frontend annotations
	originalState := &DeploymentOriginalState{
		Replicas: 0, // Originally paused
	}
	stateJSON, _ := encodeDeploymentState(originalState)

	pauseData := &PauseData{
		Target: "cpu",
		Value:  "80",
	}
	//nolint:errchkjson
	pauseJSON, _ := json.Marshal(pauseData)

	deploy := &appsv1.Deployment{
		ObjectMeta: v1.ObjectMeta{
			Name:      "test-deploy",
			Namespace: "test-ns",
			Annotations: map[string]string{
				MinReplicasKey:                 "1",
				MaxReplicasKey:                 "5",
				OriginalSuspendStateAnnotation: stateJSON,
				PauseKey:                       string(pauseJSON),
			},
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: ptr.To(int32(0)),
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

	// Test resume
	err := reconciler.resumeOrphanDeployments(ctx, "test-ns")
	if err != nil {
		t.Fatalf("resumeOrphanDeployments failed: %v", err)
	}

	// Verify resumed deployment
	var resumedDeploy appsv1.Deployment
	err = fakeClient.Get(
		ctx,
		client.ObjectKey{Name: "test-deploy", Namespace: "test-ns"},
		&resumedDeploy,
	)
	if err != nil {
		t.Fatalf("failed to get resumed deployment: %v", err)
	}

	// Check replicas should remain 0 (since original was 0)
	if *resumedDeploy.Spec.Replicas != 0 {
		t.Errorf("expected replicas to remain 0, got %d", *resumedDeploy.Spec.Replicas)
	}

	// Check original state annotation was removed
	annotations := resumedDeploy.GetAnnotations()
	if _, hasState := annotations[OriginalSuspendStateAnnotation]; hasState {
		t.Error("original suspend state annotation should be removed")
	}

	// Check pause annotation was NOT removed (since replicas was 0)
	if _, hasPause := annotations[PauseKey]; !hasPause {
		t.Error("pause annotation should NOT be removed when original replicas was 0")
	}

	// Verify HPA was NOT created (since original replicas was 0)
	var hpa autoscalingv2.HorizontalPodAutoscaler
	err = fakeClient.Get(
		ctx,
		client.ObjectKey{Name: "test-deploy", Namespace: "test-ns"},
		&hpa,
	)
	if err == nil {
		t.Error("HPA should NOT be created when original replicas was 0")
	}
}

// Test that originally paused statefulsets (replicas=0) don't restore HPA
func TestResumeAlreadyPausedStatefulSetWithHPA(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = appsv1.AddToScheme(scheme)
	_ = autoscalingv2.AddToScheme(scheme)

	// Create statefulset that was originally paused (replicas=0) with frontend annotations
	originalState := &DeploymentOriginalState{
		Replicas: 0, // Originally paused
	}
	stateJSON, _ := encodeDeploymentState(originalState)

	pauseData := &PauseData{
		Target: "memory",
		Value:  "70",
	}
	//nolint:errchkjson
	pauseJSON, _ := json.Marshal(pauseData)

	sts := &appsv1.StatefulSet{
		ObjectMeta: v1.ObjectMeta{
			Name:      "test-sts",
			Namespace: "test-ns",
			Annotations: map[string]string{
				MinReplicasKey:                 "2",
				MaxReplicasKey:                 "10",
				OriginalSuspendStateAnnotation: stateJSON,
				PauseKey:                       string(pauseJSON),
			},
		},
		Spec: appsv1.StatefulSetSpec{
			Replicas: ptr.To(int32(0)),
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

	// Test resume
	err := reconciler.resumeOrphanStatefulSets(ctx, "test-ns")
	if err != nil {
		t.Fatalf("resumeOrphanStatefulSets failed: %v", err)
	}

	// Verify resumed statefulset
	var resumedSts appsv1.StatefulSet
	err = fakeClient.Get(
		ctx,
		client.ObjectKey{Name: "test-sts", Namespace: "test-ns"},
		&resumedSts,
	)
	if err != nil {
		t.Fatalf("failed to get resumed statefulset: %v", err)
	}

	// Check replicas should remain 0 (since original was 0)
	if *resumedSts.Spec.Replicas != 0 {
		t.Errorf("expected replicas to remain 0, got %d", *resumedSts.Spec.Replicas)
	}

	// Check original state annotation was removed
	annotations := resumedSts.GetAnnotations()
	if _, hasState := annotations[OriginalSuspendStateAnnotation]; hasState {
		t.Error("original suspend state annotation should be removed")
	}

	// Check pause annotation was NOT removed (since replicas was 0)
	if _, hasPause := annotations[PauseKey]; !hasPause {
		t.Error("pause annotation should NOT be removed when original replicas was 0")
	}

	// Verify HPA was NOT created (since original replicas was 0)
	var hpa autoscalingv2.HorizontalPodAutoscaler
	err = fakeClient.Get(
		ctx,
		client.ObjectKey{Name: "test-sts", Namespace: "test-ns"},
		&hpa,
	)
	if err == nil {
		t.Error("HPA should NOT be created when original replicas was 0")
	}
}

// Test that HPA restore errors don't block other deployments from being resumed
func TestResumeDeploymentContinuesOnHPAError(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = appsv1.AddToScheme(scheme)

	// Create first deployment with original replicas > 0 and invalid pause data
	originalState1 := &DeploymentOriginalState{
		Replicas: 3,
	}
	stateJSON1, _ := encodeDeploymentState(originalState1)

	// Invalid pause data that will cause error during HPA restoration
	invalidPauseData := `{invalid json}`

	deploy1 := &appsv1.Deployment{
		ObjectMeta: v1.ObjectMeta{
			Name:      "test-deploy-1",
			Namespace: "test-ns",
			Annotations: map[string]string{
				MinReplicasKey:                 "2",
				MaxReplicasKey:                 "8",
				OriginalSuspendStateAnnotation: stateJSON1,
				PauseKey:                       invalidPauseData, // Invalid JSON
			},
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: ptr.To(int32(0)),
		},
	}

	// Create second deployment with valid data
	originalState2 := &DeploymentOriginalState{
		Replicas: 2,
	}
	stateJSON2, _ := encodeDeploymentState(originalState2)

	deploy2 := &appsv1.Deployment{
		ObjectMeta: v1.ObjectMeta{
			Name:      "test-deploy-2",
			Namespace: "test-ns",
			Annotations: map[string]string{
				OriginalSuspendStateAnnotation: stateJSON2,
			},
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: ptr.To(int32(0)),
		},
	}

	fakeClient := clientfake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(deploy1, deploy2).
		Build()

	reconciler := &NamespaceReconciler{
		Client: fakeClient,
		Log:    logr.Discard(),
	}

	ctx := context.Background()

	// Test resume - should not fail even though first deployment has invalid pause data
	err := reconciler.resumeOrphanDeployments(ctx, "test-ns")
	if err != nil {
		t.Fatalf("resumeOrphanDeployments should not fail on HPA error, got: %v", err)
	}

	// Verify first deployment was still updated (replicas restored despite HPA error)
	var resumedDeploy1 appsv1.Deployment
	err = fakeClient.Get(
		ctx,
		client.ObjectKey{Name: "test-deploy-1", Namespace: "test-ns"},
		&resumedDeploy1,
	)
	if err != nil {
		t.Fatalf("failed to get first deployment: %v", err)
	}

	if *resumedDeploy1.Spec.Replicas != 3 {
		t.Errorf(
			"expected first deployment replicas to be 3, got %d",
			*resumedDeploy1.Spec.Replicas,
		)
	}

	// Verify second deployment was also updated
	var resumedDeploy2 appsv1.Deployment
	err = fakeClient.Get(
		ctx,
		client.ObjectKey{Name: "test-deploy-2", Namespace: "test-ns"},
		&resumedDeploy2,
	)
	if err != nil {
		t.Fatalf("failed to get second deployment: %v", err)
	}

	if *resumedDeploy2.Spec.Replicas != 2 {
		t.Errorf(
			"expected second deployment replicas to be 2, got %d",
			*resumedDeploy2.Spec.Replicas,
		)
	}

	// Verify both original state annotations were removed
	annotations1 := resumedDeploy1.GetAnnotations()
	if _, hasState := annotations1[OriginalSuspendStateAnnotation]; hasState {
		t.Error("first deployment should have state annotation removed")
	}

	annotations2 := resumedDeploy2.GetAnnotations()
	if _, hasState := annotations2[OriginalSuspendStateAnnotation]; hasState {
		t.Error("second deployment should have state annotation removed")
	}
}

// Test that HPA restore errors don't block other statefulsets from being resumed
func TestResumeStatefulSetContinuesOnHPAError(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = appsv1.AddToScheme(scheme)

	// Create first statefulset with original replicas > 0 and invalid pause data
	originalState1 := &DeploymentOriginalState{
		Replicas: 5,
	}
	stateJSON1, _ := encodeDeploymentState(originalState1)

	invalidPauseData := `{invalid json}`

	sts1 := &appsv1.StatefulSet{
		ObjectMeta: v1.ObjectMeta{
			Name:      "test-sts-1",
			Namespace: "test-ns",
			Annotations: map[string]string{
				MinReplicasKey:                 "3",
				MaxReplicasKey:                 "10",
				OriginalSuspendStateAnnotation: stateJSON1,
				PauseKey:                       invalidPauseData, // Invalid JSON
			},
		},
		Spec: appsv1.StatefulSetSpec{
			Replicas: ptr.To(int32(0)),
		},
	}

	// Create second statefulset with valid data
	originalState2 := &DeploymentOriginalState{
		Replicas: 3,
	}
	stateJSON2, _ := encodeDeploymentState(originalState2)

	sts2 := &appsv1.StatefulSet{
		ObjectMeta: v1.ObjectMeta{
			Name:      "test-sts-2",
			Namespace: "test-ns",
			Annotations: map[string]string{
				OriginalSuspendStateAnnotation: stateJSON2,
			},
		},
		Spec: appsv1.StatefulSetSpec{
			Replicas: ptr.To(int32(0)),
		},
	}

	fakeClient := clientfake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(sts1, sts2).
		Build()

	reconciler := &NamespaceReconciler{
		Client: fakeClient,
		Log:    logr.Discard(),
	}

	ctx := context.Background()

	// Test resume - should not fail even though first statefulset has invalid pause data
	err := reconciler.resumeOrphanStatefulSets(ctx, "test-ns")
	if err != nil {
		t.Fatalf("resumeOrphanStatefulSets should not fail on HPA error, got: %v", err)
	}

	// Verify first statefulset was still updated (replicas restored despite HPA error)
	var resumedSts1 appsv1.StatefulSet
	err = fakeClient.Get(
		ctx,
		client.ObjectKey{Name: "test-sts-1", Namespace: "test-ns"},
		&resumedSts1,
	)
	if err != nil {
		t.Fatalf("failed to get first statefulset: %v", err)
	}

	if *resumedSts1.Spec.Replicas != 5 {
		t.Errorf("expected first statefulset replicas to be 5, got %d", *resumedSts1.Spec.Replicas)
	}

	// Verify second statefulset was also updated
	var resumedSts2 appsv1.StatefulSet
	err = fakeClient.Get(
		ctx,
		client.ObjectKey{Name: "test-sts-2", Namespace: "test-ns"},
		&resumedSts2,
	)
	if err != nil {
		t.Fatalf("failed to get second statefulset: %v", err)
	}

	if *resumedSts2.Spec.Replicas != 3 {
		t.Errorf("expected second statefulset replicas to be 3, got %d", *resumedSts2.Spec.Replicas)
	}

	// Verify both original state annotations were removed
	annotations1 := resumedSts1.GetAnnotations()
	if _, hasState := annotations1[OriginalSuspendStateAnnotation]; hasState {
		t.Error("first statefulset should have state annotation removed")
	}

	annotations2 := resumedSts2.GetAnnotations()
	if _, hasState := annotations2[OriginalSuspendStateAnnotation]; hasState {
		t.Error("second statefulset should have state annotation removed")
	}
}

// Test HPA is restored AFTER deployment is updated
func TestHPARestoredAfterDeploymentUpdate(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = appsv1.AddToScheme(scheme)
	_ = autoscalingv2.AddToScheme(scheme)

	// Create deployment with original replicas > 0
	originalState := &DeploymentOriginalState{
		Replicas: 3, // Originally running
	}
	//nolint:errchkjson
	stateJSON, _ := encodeDeploymentState(originalState)

	pauseData := &PauseData{
		Target: "cpu",
		Value:  "75",
	}
	pauseJSON, _ := json.Marshal(pauseData)

	deploy := &appsv1.Deployment{
		ObjectMeta: v1.ObjectMeta{
			Name:      "test-deploy",
			Namespace: "test-ns",
			Annotations: map[string]string{
				MinReplicasKey:                 "2",
				MaxReplicasKey:                 "8",
				OriginalSuspendStateAnnotation: stateJSON,
				PauseKey:                       string(pauseJSON),
			},
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: ptr.To(int32(0)),
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

	// Test resume
	err := reconciler.resumeOrphanDeployments(ctx, "test-ns")
	if err != nil {
		t.Fatalf("resumeOrphanDeployments failed: %v", err)
	}

	// Verify deployment was updated with correct replicas
	var resumedDeploy appsv1.Deployment
	err = fakeClient.Get(
		ctx,
		client.ObjectKey{Name: "test-deploy", Namespace: "test-ns"},
		&resumedDeploy,
	)
	if err != nil {
		t.Fatalf("failed to get resumed deployment: %v", err)
	}

	// Check replicas restored to original value
	if *resumedDeploy.Spec.Replicas != 3 {
		t.Errorf("expected replicas to be 3, got %d", *resumedDeploy.Spec.Replicas)
	}

	// Check original state annotation was removed
	annotations := resumedDeploy.GetAnnotations()
	if _, hasState := annotations[OriginalSuspendStateAnnotation]; hasState {
		t.Error("original suspend state annotation should be removed")
	}

	// Check pause annotation was removed (since replicas > 0)
	if _, hasPause := annotations[PauseKey]; hasPause {
		t.Error("pause annotation should be removed when original replicas was > 0")
	}

	// Verify HPA was created (since original replicas > 0)
	var hpa autoscalingv2.HorizontalPodAutoscaler
	err = fakeClient.Get(
		ctx,
		client.ObjectKey{Name: "test-deploy", Namespace: "test-ns"},
		&hpa,
	)
	if err != nil {
		t.Fatalf("HPA should be created when original replicas was > 0, got error: %v", err)
	}

	// Verify HPA configuration
	if *hpa.Spec.MinReplicas != 2 {
		t.Errorf("expected HPA minReplicas to be 2, got %d", *hpa.Spec.MinReplicas)
	}
	if hpa.Spec.MaxReplicas != 8 {
		t.Errorf("expected HPA maxReplicas to be 8, got %d", hpa.Spec.MaxReplicas)
	}
	if len(hpa.Spec.Metrics) > 0 && hpa.Spec.Metrics[0].Resource != nil {
		if string(hpa.Spec.Metrics[0].Resource.Name) != "cpu" {
			t.Errorf("expected HPA target to be cpu, got %s", hpa.Spec.Metrics[0].Resource.Name)
		}
		if hpa.Spec.Metrics[0].Resource.Target.AverageUtilization != nil {
			if *hpa.Spec.Metrics[0].Resource.Target.AverageUtilization != 75 {
				t.Errorf(
					"expected HPA value to be 75, got %d",
					*hpa.Spec.Metrics[0].Resource.Target.AverageUtilization,
				)
			}
		}
	}
}
