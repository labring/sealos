package controllers

import (
	"encoding/json"
)

// Annotation keys
const (
	// Stores the original state before suspension in JSON format
	OriginalSuspendStateAnnotation      = "sealos.io/original-suspend-state"
	CertManagerDisableReissueAnnotation = "cert-manager.io/disable-reissue"
)

// Ingress class constants
const (
	IngressClassAnnotation = "kubernetes.io/ingress.class"
	IngressClassPause      = "pause"
	IngressClassNginx      = "nginx"
)

// DeploymentOriginalState stores the original state of Deployment/StatefulSet/ReplicaSet
type DeploymentOriginalState struct {
	Replicas int32 `json:"replicas"`
}

// CronJobOriginalState stores the original suspend state of CronJob
type CronJobOriginalState struct {
	Suspend bool `json:"suspend"`
}

// JobOriginalState stores the original suspend state of Job
type JobOriginalState struct {
	Suspend bool `json:"suspend"`
}

// KBClusterOriginalState stores the original state of KubeBlocks Cluster
type KBClusterOriginalState struct {
	WasRunning    bool `json:"wasRunning"`    // Whether the cluster was running before suspension
	BackupEnabled bool `json:"backupEnabled"` // Whether backup was enabled
}

// CertificateOriginalState stores the original state of cert-manager Certificate
type CertificateOriginalState struct {
	DisableReissue bool `json:"disableReissue"` // Whether reissue was disabled (annotation existed and was "true")
}

// IngressOriginalState stores the original state of Ingress
type IngressOriginalState struct {
	IngressClass string `json:"ingressClass"` // Original ingress class (e.g., "nginx")
}

// PauseData stores HPA configuration when pausing deployment/statefulset
type PauseData struct {
	Target string `json:"target"` // Resource target (e.g., "cpu", "memory")
	Value  string `json:"value"`  // Target utilization value
}

// DevboxOriginalState stores the original state of Devbox
type DevboxOriginalState struct {
	WasRunning bool `json:"wasRunning"` // Whether the devbox was running before suspension
}

// Encoding functions for each type

func encodeDeploymentState(state *DeploymentOriginalState) (string, error) {
	data, err := json.Marshal(state)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func decodeDeploymentState(data string) (*DeploymentOriginalState, error) {
	var state DeploymentOriginalState
	if err := json.Unmarshal([]byte(data), &state); err != nil {
		return nil, err
	}
	return &state, nil
}

func encodeCronJobState(state *CronJobOriginalState) (string, error) {
	data, err := json.Marshal(state)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func decodeCronJobState(data string) (*CronJobOriginalState, error) {
	var state CronJobOriginalState
	if err := json.Unmarshal([]byte(data), &state); err != nil {
		return nil, err
	}
	return &state, nil
}

func encodeJobState(state *JobOriginalState) (string, error) {
	data, err := json.Marshal(state)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func decodeJobState(data string) (*JobOriginalState, error) {
	var state JobOriginalState
	if err := json.Unmarshal([]byte(data), &state); err != nil {
		return nil, err
	}
	return &state, nil
}

func encodeKBClusterState(state *KBClusterOriginalState) (string, error) {
	data, err := json.Marshal(state)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func decodeKBClusterState(data string) (*KBClusterOriginalState, error) {
	var state KBClusterOriginalState
	if err := json.Unmarshal([]byte(data), &state); err != nil {
		return nil, err
	}
	return &state, nil
}

func encodeCertificateState(state *CertificateOriginalState) (string, error) {
	data, err := json.Marshal(state)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func decodeCertificateState(data string) (*CertificateOriginalState, error) {
	var state CertificateOriginalState
	if err := json.Unmarshal([]byte(data), &state); err != nil {
		return nil, err
	}
	return &state, nil
}

func encodeIngressState(state *IngressOriginalState) (string, error) {
	data, err := json.Marshal(state)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func decodeIngressState(data string) (*IngressOriginalState, error) {
	var state IngressOriginalState
	if err := json.Unmarshal([]byte(data), &state); err != nil {
		return nil, err
	}
	return &state, nil
}

// Default state constructors - used when original state is missing or decode fails

func getDefaultDeploymentState() *DeploymentOriginalState {
	return &DeploymentOriginalState{
		Replicas: 1, // Default: restore to 1 replica
	}
}

func getDefaultCronJobState() *CronJobOriginalState {
	return &CronJobOriginalState{
		Suspend: false, // Default: resume to not suspended
	}
}

func getDefaultJobState() *JobOriginalState {
	return &JobOriginalState{
		Suspend: false, // Default: resume to not suspended
	}
}

func getDefaultKBClusterState() *KBClusterOriginalState {
	return &KBClusterOriginalState{
		WasRunning:    true,  // Default: restore to running
		BackupEnabled: false, // Default: don't modify backup
	}
}

func getDefaultCertificateState() *CertificateOriginalState {
	return &CertificateOriginalState{
		DisableReissue: false, // Default: wasn't disabled
	}
}

func getDefaultIngressState() *IngressOriginalState {
	return &IngressOriginalState{
		IngressClass: IngressClassNginx, // Default: restore to nginx
	}
}

func encodeDevboxState(state *DevboxOriginalState) (string, error) {
	data, err := json.Marshal(state)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func decodeDevboxState(data string) (*DevboxOriginalState, error) {
	var state DevboxOriginalState
	if err := json.Unmarshal([]byte(data), &state); err != nil {
		return nil, err
	}
	return &state, nil
}

func getDefaultDevboxState() *DevboxOriginalState {
	return &DevboxOriginalState{
		WasRunning: true, // Default: was running, restore to running
	}
}
