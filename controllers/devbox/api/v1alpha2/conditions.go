package v1alpha2

import (
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// Devbox condition types.
//
// These are intentionally minimal for now: they provide observability and a stable
// surface for future state-machine hardening (e.g. preventing commit from being
// skipped due to concurrent status updates).
const (
	// DevboxConditionStateTransitionPending indicates spec.state != status.state and
	// a transition is pending processing by the state-change handler.
	DevboxConditionStateTransitionPending = "StateTransitionPending"

	// DevboxConditionCommitInProgress indicates a commit workflow is in progress for
	// a transition (typically Running/Paused -> Shutdown/Stopped).
	DevboxConditionCommitInProgress = "CommitInProgress"

	// Resource sync conditions (controller reconcile steps).
	DevboxConditionSecretSynced           = "SecretSynced"
	DevboxConditionStartupConfigMapSynced = "StartupConfigMapSynced"
	DevboxConditionNetworkSynced          = "NetworkSynced"
	DevboxConditionPodSynced              = "PodSynced"
	DevboxConditionPhaseSynced            = "PhaseSynced"
)

// Devbox condition reasons.
const (
	DevboxReasonSpecStateChanged      = "SpecStateChanged"
	DevboxReasonCommitStarted         = "CommitStarted"
	DevboxReasonCommitSucceeded       = "CommitSucceeded"
	DevboxReasonCommitFailed          = "CommitFailed"
	DevboxReasonStateTransitionSynced = "StateTransitionSynced"
	DevboxReasonCommitNotInProgress   = "CommitNotInProgress"

	DevboxReasonSyncSucceeded = "SyncSucceeded"
	DevboxReasonSyncFailed    = "SyncFailed"
	DevboxReasonNotConfigured = "NotConfigured"
)

// SetCondition sets (or updates) a status condition on the Devbox.
func (d *Devbox) SetCondition(cond metav1.Condition) {
	meta.SetStatusCondition(&d.Status.Conditions, cond)
}

// GetCondition returns the condition pointer if present.
func (d *Devbox) GetCondition(conditionType string) *metav1.Condition {
	for i := range d.Status.Conditions {
		if d.Status.Conditions[i].Type == conditionType {
			return &d.Status.Conditions[i]
		}
	}
	return nil
}
