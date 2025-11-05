package controllers

import (
	"testing"
)

func TestEncodeDecodeDeploymentState(t *testing.T) {
	tests := []struct {
		name     string
		replicas int32
	}{
		{"zero replicas", 0},
		{"one replica", 1},
		{"multiple replicas", 5},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			state := &DeploymentOriginalState{
				Replicas: tt.replicas,
			}

			encoded, err := encodeDeploymentState(state)
			if err != nil {
				t.Fatalf("failed to encode state: %v", err)
			}

			decoded, err := decodeDeploymentState(encoded)
			if err != nil {
				t.Fatalf("failed to decode state: %v", err)
			}

			if decoded.Replicas != tt.replicas {
				t.Errorf("expected replicas %d, got %d", tt.replicas, decoded.Replicas)
			}
		})
	}
}

func TestEncodeDecodeCronJobState(t *testing.T) {
	tests := []struct {
		name    string
		suspend bool
	}{
		{"suspended", true},
		{"not suspended", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			state := &CronJobOriginalState{
				Suspend: tt.suspend,
			}

			encoded, err := encodeCronJobState(state)
			if err != nil {
				t.Fatalf("failed to encode state: %v", err)
			}

			decoded, err := decodeCronJobState(encoded)
			if err != nil {
				t.Fatalf("failed to decode state: %v", err)
			}

			if decoded.Suspend != tt.suspend {
				t.Errorf("expected suspend %v, got %v", tt.suspend, decoded.Suspend)
			}
		})
	}
}

func TestEncodeDecodeKBClusterState(t *testing.T) {
	tests := []struct {
		name          string
		wasRunning    bool
		backupEnabled bool
	}{
		{"running with backup", true, true},
		{"running without backup", true, false},
		{"stopped with backup", false, true},
		{"stopped without backup", false, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			state := &KBClusterOriginalState{
				WasRunning:    tt.wasRunning,
				BackupEnabled: tt.backupEnabled,
			}

			encoded, err := encodeKBClusterState(state)
			if err != nil {
				t.Fatalf("failed to encode state: %v", err)
			}

			decoded, err := decodeKBClusterState(encoded)
			if err != nil {
				t.Fatalf("failed to decode state: %v", err)
			}

			if decoded.WasRunning != tt.wasRunning {
				t.Errorf("expected wasRunning %v, got %v", tt.wasRunning, decoded.WasRunning)
			}

			if decoded.BackupEnabled != tt.backupEnabled {
				t.Errorf("expected backupEnabled %v, got %v", tt.backupEnabled, decoded.BackupEnabled)
			}
		})
	}
}

func TestEncodeDecodeCertificateState(t *testing.T) {
	tests := []struct {
		name           string
		disableReissue bool
	}{
		{"reissue was disabled", true},
		{"reissue was not disabled", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			state := &CertificateOriginalState{
				DisableReissue: tt.disableReissue,
			}

			encoded, err := encodeCertificateState(state)
			if err != nil {
				t.Fatalf("failed to encode state: %v", err)
			}

			decoded, err := decodeCertificateState(encoded)
			if err != nil {
				t.Fatalf("failed to decode state: %v", err)
			}

			if decoded.DisableReissue != tt.disableReissue {
				t.Errorf("expected disableReissue %v, got %v", tt.disableReissue, decoded.DisableReissue)
			}
		})
	}
}

func TestDecodeInvalidJSON(t *testing.T) {
	tests := []struct {
		name       string
		decodeFunc func(string) error
	}{
		{"deployment", func(s string) error { _, err := decodeDeploymentState(s); return err }},
		{"cronjob", func(s string) error { _, err := decodeCronJobState(s); return err }},
		{"kbcluster", func(s string) error { _, err := decodeKBClusterState(s); return err }},
		{"certificate", func(s string) error { _, err := decodeCertificateState(s); return err }},
	}

	invalidJSON := "not a valid json"

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.decodeFunc(invalidJSON)
			if err == nil {
				t.Error("expected error when decoding invalid JSON, got nil")
			}
		})
	}
}
