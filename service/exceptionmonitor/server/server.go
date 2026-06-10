package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/labring/sealos/service/exceptionmonitor/api"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	metav1unstructured "k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

type DatabaseInfo struct {
	Name    string `json:"name"`
	Status  string `json:"status"`
	Reason  string `json:"reason"`
	Details string `json:"details"`
}

type UpdateReplicasRequest struct {
	Namespace    string `json:"namespace"`
	DatabaseName string `json:"database_name"`
	Replicas     int    `json:"replicas"`
}

// GroupVersionResource for KubeBlocks clusters
var databaseClusterGVR = schema.GroupVersionResource{
	Group:    "apps.kubeblocks.io",
	Version:  "v1alpha1",
	Resource: "clusters",
}

var instancesetGVR = schema.GroupVersionResource{
	Group:    "workloads.kubeblocks.io",
	Version:  "v1alpha1",
	Resource: "instancesets",
}

func StartServer() {
	mux := http.NewServeMux()
	mux.HandleFunc("/v1/databases", authMiddleware(handleListDatabases))
	mux.HandleFunc("/v1/replicas", authMiddleware(handleUpdateReplicas))

	addr := ":8000"
	log.Printf("exceptionmonitor HTTP server listening on %s", addr)
	// nosemgrep: go.lang.security.audit.net.use-tls.use-tls
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("HTTP server failed: %v", err)
	}
}

func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(rw http.ResponseWriter, req *http.Request) {
		// Get API key from query parameter
		providedKey := req.URL.Query().Get("key")

		// Check if API key is provided and matches
		if providedKey == "" || providedKey != api.APIKey {
			log.Printf("Unauthorized access attempt from %s with key: %s", req.RemoteAddr, providedKey)
			http.Error(rw, "Unauthorized: Invalid or missing API key", http.StatusUnauthorized)
			return
		}

		// Log authorized access
		log.Printf("Authorized access to %s from %s", req.URL.Path, req.RemoteAddr)

		// Call the original handler
		next(rw, req)
	}
}

func handleListDatabases(rw http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		http.Error(rw, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ns := req.URL.Query().Get("namespace")
	if ns == "" {
		http.Error(rw, "missing required query parameter: namespace", http.StatusBadRequest)
		return
	}

	ctx := context.Background()
	clusters, err := api.DynamicClient.Resource(databaseClusterGVR).Namespace(ns).List(ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(rw, fmt.Sprintf("failed to list clusters: %v", err), http.StatusInternalServerError)
		return
	}

	result := make([]DatabaseInfo, 0, len(clusters.Items))
	for _, c := range clusters.Items {
		info := collectDatabaseInfo(ctx, ns, c)
		result = append(result, info)
	}

	response := result

	rw.Header().Set("Content-Type", "application/json")
	encoder := json.NewEncoder(rw)
	if err := encoder.Encode(response); err != nil {
		http.Error(rw, fmt.Sprintf("failed to encode response: %v", err), http.StatusInternalServerError)
		return
	}
}

func collectDatabaseInfo(ctx context.Context, namespace string, cluster metav1unstructured.Unstructured) DatabaseInfo {
	name := cluster.GetName()
	status, _, _ := metav1unstructured.NestedString(cluster.Object, "status", "phase")

	// Gather related events as details
	events, err := api.ClientSet.CoreV1().Events(namespace).List(ctx, metav1.ListOptions{
		FieldSelector: fmt.Sprintf("involvedObject.name=%s", name),
	})
	details := ""
	if err == nil {
		var lines []string
		for _, e := range events.Items {
			lines = append(lines, fmt.Sprintf("%s - %s", e.Reason, e.Message))
		}
		details = strings.Join(lines, "\n")
	}

	reason := deriveReason(status, details)

	return DatabaseInfo{
		Name:    name,
		Status:  status,
		Reason:  reason,
		Details: details,
	}
}

func deriveReason(status, details string) string {
	if strings.Contains(details, api.ExceededQuotaException) {
		return api.ExceededQuotaException
	}
	if strings.Contains(details, api.DiskException) {
		return "disk is full"
	}
	// Mark abnormal statuses
	switch status {
	case "Abnormal", "Failed":
		return "cluster status abnormal"
	}
	return ""
}

func handleUpdateReplicas(rw http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		http.Error(rw, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request UpdateReplicasRequest
	if err := json.NewDecoder(req.Body).Decode(&request); err != nil {
		http.Error(rw, fmt.Sprintf("failed to decode request: %v", err), http.StatusBadRequest)
		return
	}

	if request.Namespace == "" || request.DatabaseName == "" || request.Replicas < 0 {
		http.Error(rw, "missing required parameters: namespace, database_name, replicas (must be >= 0)", http.StatusBadRequest)
		return
	}

	ctx := context.Background()

	log.Printf("Namespace: %s, DatabaseName: %s, Replicas: %d", request.Namespace, request.DatabaseName, request.Replicas)

	// Step 1: Update instanceset replicas
	if err := updateInstanceSetReplicas(ctx, request.Namespace, request.DatabaseName, request.Replicas); err != nil {
		http.Error(rw, fmt.Sprintf("failed to update instanceset replicas: %v", err), http.StatusInternalServerError)
		return
	}

	// Step 2: Update pod labels
	if err := updatePodLabels(ctx, request.Namespace, request.DatabaseName); err != nil {
		http.Error(rw, fmt.Sprintf("failed to update pod labels: %v", err), http.StatusInternalServerError)
		return
	}

	rw.WriteHeader(http.StatusOK)
	rw.Write([]byte("Replicas updated successfully"))
}

func updateInstanceSetReplicas(ctx context.Context, namespace, databaseName string, replicas int) error {
	instancesetName := databaseName + "-mongodb"

	instanceset, err := api.DynamicClient.Resource(instancesetGVR).Namespace(namespace).Get(ctx, instancesetName, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get instanceset %s: %w", instancesetName, err)
	}

	currentReplicas, found, err := metav1unstructured.NestedInt64(instanceset.Object, "spec", "replicas")
	if err != nil {
		return fmt.Errorf("failed to get current replicas: %w", err)
	}

	if found && int(currentReplicas) == replicas {
		log.Printf("instanceset %s already has %d replicas, no update needed", instancesetName, replicas)
		return nil
	}

	if err := metav1unstructured.SetNestedField(instanceset.Object, int64(replicas), "spec", "replicas"); err != nil {
		return fmt.Errorf("failed to set replicas: %w", err)
	}

	_, err = api.DynamicClient.Resource(instancesetGVR).Namespace(namespace).Update(ctx, instanceset, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("failed to update instanceset: %w", err)
	}

	log.Printf("instanceset info %s replicas to %d", instancesetName, replicas)

	return nil
}

func updatePodLabels(ctx context.Context, namespace, databaseName string) error {
	labelSelector := "app.kubernetes.io/instance=" + databaseName

	pods, err := api.ClientSet.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: labelSelector,
	})
	if err != nil {
		return fmt.Errorf("failed to list pods: %w", err)
	}

	if len(pods.Items) == 0 {
		log.Printf("no pods found with label selector: %s", labelSelector)
		return nil
	}

	// Handle different scenarios based on pod count and existing labels
	if len(pods.Items) == 1 {
		return handleSinglePodScenario(ctx, namespace, databaseName, pods.Items[0])
	} else {
		return handleMultiplePodsScenario(ctx, namespace, databaseName, pods.Items)
	}
}

func handleSinglePodScenario(ctx context.Context, namespace, databaseName string, pod corev1.Pod) error {
	podName := pod.GetName()
	role := pod.Labels["kubeblocks.io/role"]

	// Case 1: No kubeblocks.io/role label, add primary
	if role == "" {
		return addPodRoleLabel(ctx, namespace, podName, "primary")
	}

	// Case 2: Role is secondary, change to primary
	if role == "secondary" {
		return updatePodRoleLabel(ctx, namespace, podName, "primary")
	}

	// If role is already primary, no change needed
	log.Printf("pod %s already has role: primary", podName)
	return nil
}

func handleMultiplePodsScenario(ctx context.Context, namespace, databaseName string, pods []corev1.Pod) error {
	primaryPodName := databaseName + "-mongodb-0"
	var needsUpdate []struct {
		name string
		role string
	}

	// Analyze current state
	for _, pod := range pods {
		podName := pod.GetName()
		role := pod.Labels["kubeblocks.io/role"]

		if podName == primaryPodName {
			if role != "primary" {
				needsUpdate = append(needsUpdate, struct {
					name string
					role string
				}{name: podName, role: "primary"})
			}
		} else {
			if role != "secondary" {
				needsUpdate = append(needsUpdate, struct {
					name string
					role string
				}{name: podName, role: "secondary"})
			}
		}
	}

	// Apply updates
	for _, update := range needsUpdate {
		if err := updatePodRoleLabel(ctx, namespace, update.name, update.role); err != nil {
			return fmt.Errorf("failed to update pod %s role to %s: %w", update.name, update.role, err)
		}
	}

	return nil
}

func addPodRoleLabel(ctx context.Context, namespace, podName, role string) error {
	pod, err := api.ClientSet.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get pod %s: %w", podName, err)
	}

	if pod.Labels == nil {
		pod.Labels = make(map[string]string)
	}
	pod.Labels["kubeblocks.io/role"] = role

	_, err = api.ClientSet.CoreV1().Pods(namespace).Update(ctx, pod, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("failed to add role label to pod %s: %w", podName, err)
	}

	log.Printf("added role label %s to pod %s", role, podName)
	return nil
}

func updatePodRoleLabel(ctx context.Context, namespace, podName, role string) error {
	pod, err := api.ClientSet.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get pod %s: %w", podName, err)
	}

	if pod.Labels == nil {
		pod.Labels = make(map[string]string)
	}
	pod.Labels["kubeblocks.io/role"] = role

	_, err = api.ClientSet.CoreV1().Pods(namespace).Update(ctx, pod, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("failed to update role label on pod %s: %w", podName, err)
	}

	log.Printf("updated role label to %s on pod %s", role, podName)
	return nil
}
