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

// DeploymentOriginalState stores the original state of Deployment/StatefulSet/ReplicaSet
type DeploymentOriginalState struct {
	Replicas int32 `json:"replicas"`
}

// CronJobOriginalState stores the original suspend state of CronJob
type CronJobOriginalState struct {
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
