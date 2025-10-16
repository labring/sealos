package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/labring/sealos/service/exceptionmonitor/api"

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

// GroupVersionResource for KubeBlocks clusters
var databaseClusterGVR = schema.GroupVersionResource{
	Group:    "apps.kubeblocks.io",
	Version:  "v1alpha1",
	Resource: "clusters",
}

func StartServer() {
	mux := http.NewServeMux()
	mux.HandleFunc("/v1/databases", handleListDatabases)

	addr := ":8000"
	log.Printf("exceptionmonitor HTTP server listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("HTTP server failed: %v", err)
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
