package monitor

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/labring/sealos/service/exceptionmonitor/api"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	metav1unstructured "k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

var instancesetGVR = schema.GroupVersionResource{
	Group:    "workloads.kubeblocks.io",
	Version:  "v1alpha1",
	Resource: "instancesets",
}

// RoleMapping defines role mappings for different database types
var RoleMapping = map[string]map[string]string{
	"mongodb": {
		"primary":   "primary",
		"secondary": "secondary",
	},
	"apecloud-mysql": {
		"primary":   "leader",
		"secondary": "follower",
	},
	"postgresql": {
		"primary":   "primary",
		"secondary": "secondary",
	},
	"mysql": {
		"primary":   "primary",
		"secondary": "secondary",
	},
}

// DatabaseRoleMonitor monitors and fixes role labels for database pods
func DatabaseRoleMonitor() {
	for {
		// Monitor all namespaces
		if err := monitorDatabaseRoles(); err != nil {
			log.Printf("Failed to monitor database roles: %v", err)
		}

		// Sleep for 2 minutes before next check
		log.Printf("Database role monitoring completed, next check in 2 minutes")
		time.Sleep(2 * time.Minute)
	}
}

// monitorDatabaseRoles monitors and fixes role labels for all databases across all namespaces
func monitorDatabaseRoles() error {
	ctx := context.Background()

	// List all database clusters in the namespace
	clusters, err := api.DynamicClient.Resource(databaseClusterGVR).List(ctx, metav1.ListOptions{})
	if err != nil {
		log.Printf("Failed to list clusters: %v", err)
	}

	for _, cluster := range clusters.Items {
		clusterName := cluster.GetName()
		namespace := cluster.GetNamespace()
		clusterType := ""
		// First try to get cluster type from componentSpecs.componentDef
		componentSpecs, found, err := metav1unstructured.NestedSlice(cluster.Object, "spec", "componentSpecs")
		if err == nil && found && len(componentSpecs) > 0 {
			// Get the first componentSpec and extract componentDef
			if componentSpec, ok := componentSpecs[0].(map[string]interface{}); ok {
				if componentDef, exists := componentSpec["componentDef"]; exists {
					if cd, ok := componentDef.(string); ok {
						clusterType = cd
					}
				}
			}
		}

		// Fallback to clusterDefinitionRef if componentSpecs method didn't work
		if clusterType == "" {
			clusterType, _, err = metav1unstructured.NestedString(cluster.Object, "spec", "clusterDefinitionRef")
			if err != nil {
				log.Printf("Failed to get cluster type for %s: %v", clusterName, err)
				continue
			}
		}

		if clusterType == "" {
			continue
		}

		// Get database status and skip if it's in certain states
		clusterStatus, _, err := metav1unstructured.NestedString(cluster.Object, "status", "phase")
		if err != nil {
			log.Printf("Failed to get cluster status for %s: %v", clusterName, err)
			continue
		}

		// Skip clusters that are Running, Stopped, Stopping, or Deleting
		switch clusterStatus {
		case "Running", "Stopped", "Stopping", "Deleting":
			continue
		}

		// Check if this database type has role mapping
		if _, exists := RoleMapping[clusterType]; !exists {
			log.Printf("Cluster type %s not configured for role monitoring", clusterType)
			continue
		}

		if err := monitorClusterRoles(ctx, namespace, clusterName, clusterType); err != nil {
			log.Printf("Failed to monitor roles for cluster %s: %v", clusterName, err)
		}
	}

	return nil
}

// monitorClusterRoles monitors and fixes role labels for a specific cluster
func monitorClusterRoles(ctx context.Context, namespace, clusterName, clusterType string) error {
	labelSelector := "app.kubernetes.io/instance=" + clusterName

	// List all pods for this cluster
	pods, err := api.ClientSet.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: labelSelector,
	})
	if err != nil {
		return fmt.Errorf("failed to list pods for cluster %s: %w", clusterName, err)
	}

	if len(pods.Items) == 0 {
		log.Printf("No pods found for cluster %s with label selector: %s", clusterName, labelSelector)
		return nil
	}

	// Handle different scenarios based on pod count
	if len(pods.Items) == 1 {
		return handleSinglePodRole(ctx, namespace, clusterName, clusterType, pods.Items[0])
	} else {
		return handleMultiplePodsRoles(ctx, namespace, clusterName, clusterType, pods.Items)
	}
}

// handleSinglePodRole handles role assignment for single pod scenarios
func handleSinglePodRole(ctx context.Context, namespace, clusterName, clusterType string, pod corev1.Pod) error {
	podName := pod.GetName()
	currentRole := pod.Labels["kubeblocks.io/role"]
	expectedRole := RoleMapping[clusterType]["primary"]

	// Case 1: No kubeblocks.io/role label, add primary role
	if currentRole == "" {
		log.Printf("Adding role label %s to pod %s", expectedRole, podName)
		return updatePodRoleLabel(ctx, namespace, podName, expectedRole)
	}

	// Case 2: Role is not primary, change to primary
	if currentRole != expectedRole {
		log.Printf("Updating pod %s role from %s to %s", podName, currentRole, expectedRole)
		return updatePodRoleLabel(ctx, namespace, podName, expectedRole)
	}

	// If role is already correct, no change needed
	return nil
}

// handleMultiplePodsRoles handles role assignment for multiple pod scenarios
func handleMultiplePodsRoles(ctx context.Context, namespace, clusterName, clusterType string, pods []corev1.Pod) error {
	primaryRole := RoleMapping[clusterType]["primary"]
	secondaryRole := RoleMapping[clusterType]["secondary"]

	// For most databases, the first pod (index 0) should be primary

	primaryPodName := clusterName + "-" + getPodSuffix(clusterType) + "-0"

	var needsUpdate []struct {
		name string
		role string
	}

	// Analyze current state and determine what needs to be updated
	for _, pod := range pods {
		podName := pod.GetName()
		currentRole := pod.Labels["kubeblocks.io/role"]

		if podName == primaryPodName {
			// First pod should be primary
			if currentRole != primaryRole {
				needsUpdate = append(needsUpdate, struct {
					name string
					role string
				}{name: podName, role: primaryRole})
				log.Printf("Pod %s should be %s, currently %s", podName, primaryRole, currentRole)
			}
		} else {
			// Other pods should be secondary
			if currentRole != secondaryRole {
				needsUpdate = append(needsUpdate, struct {
					name string
					role string
				}{name: podName, role: secondaryRole})
				log.Printf("Pod %s should be %s, currently %s", podName, secondaryRole, currentRole)
			}
		}
	}

	// Apply updates if needed
	if len(needsUpdate) > 0 {
		log.Printf("Updating role labels for %d pods in cluster %s", len(needsUpdate), clusterName)
		for _, update := range needsUpdate {
			if err := updatePodRoleLabel(ctx, namespace, update.name, update.role); err != nil {
				return fmt.Errorf("failed to update pod %s role to %s: %w", update.name, update.role, err)
			}
			log.Printf("Updated pod %s role to %s", update.name, update.role)
		}
	} else {
	}

	return nil
}

// getPodSuffix returns the pod suffix for different database types
func getPodSuffix(clusterType string) string {
	switch clusterType {
	case "mongodb":
		return "mongodb"
	case "apecloud-mysql":
		return "mysql"
	case "postgresql":
		return "postgresql"
	case "mysql":
		return "mysql"
	default:
		return clusterType
	}
}

// updatePodRoleLabel updates the role label of a pod
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

	return nil
}
