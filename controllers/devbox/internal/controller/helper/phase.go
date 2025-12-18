// Copyright © 2024 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package helper

import (
	devboxv1alpha2 "github.com/labring/sealos/controllers/devbox/api/v1alpha2"
	corev1 "k8s.io/api/core/v1"
)

// State to Phase Mapping Table:
//
// DevboxState (Spec.State) -> DevboxPhase (Status.Phase)
//
// Running State:
//   - Has running pod -> Running
//   - Has pending pod / No pod -> Pending
//   - Failed pod -> Error
// Paused State:
//   - Has running pod -> Pausing
//   - Has pending pod / No pod -> Paused
// Stopped/Shutdown States:
//   - CommitRecord.node != "" -> Transitioning phase (Stopping/Shutting)
//   - CommitRecord.node == "" -> Final phase (Stopped/Shutdown)

// GetLatestCommitRecord returns the latest commit record for the given contentID
func GetLatestCommitRecord(commitRecords devboxv1alpha2.CommitRecordMap, contentID string) *devboxv1alpha2.CommitRecord {
	if len(commitRecords) == 0 || contentID == "" {
		return nil
	}
	return commitRecords[contentID]
}

// PodStatus represents the aggregated status of pods
type PodStatus struct {
	hasRunning     bool
	hasPending     bool
	hasFailed      bool
	hasTerminating bool
	podCount       int
}

// AnalyzePodStatus analyzes the pod list and returns aggregated pod status
func AnalyzePodStatus(podList *corev1.PodList) PodStatus {
	status := PodStatus{
		podCount: len(podList.Items),
	}
	for i := range podList.Items {
		p := &podList.Items[i]
		if !p.DeletionTimestamp.IsZero() {
			status.hasTerminating = true
		}
		switch p.Status.Phase {
		case corev1.PodRunning:
			status.hasRunning = true
		case corev1.PodPending:
			status.hasPending = true
		case corev1.PodFailed:
			status.hasFailed = true
		}
	}
	return status
}

// DerivePhase derives phase based on desired state, pod status, and commit record.
// It implements the State to Phase Mapping Table defined above.
func DerivePhase(
	desiredState devboxv1alpha2.DevboxState,
	podStatus PodStatus,
	commitRecord *devboxv1alpha2.CommitRecord,
) devboxv1alpha2.DevboxPhase {
	// Failed pod -> Error (applies to all states)
	if podStatus.hasFailed {
		return devboxv1alpha2.DevboxPhaseError
	}

	switch desiredState {
	case devboxv1alpha2.DevboxStateRunning:
		// Running State:
		//   - Has running pod -> Running
		//   - Has pending pod / No pod -> Pending
		if podStatus.hasRunning {
			return devboxv1alpha2.DevboxPhaseRunning
		}
		return devboxv1alpha2.DevboxPhasePending

	case devboxv1alpha2.DevboxStatePaused:
		// Paused State:
		//   - Has running pod -> Pausing
		//   - Has pending pod / No pod -> Paused
		if podStatus.hasRunning {
			return devboxv1alpha2.DevboxPhasePausing
		}
		return devboxv1alpha2.DevboxPhasePaused

	case devboxv1alpha2.DevboxStateStopped:
		// Stopped State:
		//   - CommitRecord.node != "" -> Stopping
		//   - CommitRecord.node == "" -> Stopped
		if commitRecord != nil && commitRecord.Node != "" {
			return devboxv1alpha2.DevboxPhaseStopping
		}
		return devboxv1alpha2.DevboxPhaseStopped

	case devboxv1alpha2.DevboxStateShutdown:
		// Shutdown State:
		//   - CommitRecord.node != "" -> Shutting
		//   - CommitRecord.node == "" -> Shutdown
		if commitRecord != nil && commitRecord.Node != "" {
			return devboxv1alpha2.DevboxPhaseShutting
		}
		return devboxv1alpha2.DevboxPhaseShutdown

	default:
		return devboxv1alpha2.DevboxPhaseUnknown
	}
}
