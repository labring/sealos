/*
Copyright 2023 sealos.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package controllers

import (
	"time"

	"github.com/prometheus/client_golang/prometheus"
	ctrlmetrics "sigs.k8s.io/controller-runtime/pkg/metrics"
)

var (
	billingCheckpointTimestamp = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "sealos_account_billing_checkpoint_timestamp_seconds",
		Help: "Unix timestamp of the last successfully persisted account billing checkpoint.",
	})
	billingTargetTimestamp = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "sealos_account_billing_target_timestamp_seconds",
		Help: "Unix timestamp of the latest account billing hour ready for processing.",
	})
	billingCheckpointLagSeconds = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "sealos_account_billing_checkpoint_lag_seconds",
		Help: "Duration of ready account billing hours after the persisted checkpoint.",
	})
	billingPendingCheckpoints = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "sealos_account_billing_pending_checkpoints",
		Help: "Number of ready account billing hours after the persisted checkpoint.",
	})
	billingProcessing = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "sealos_account_billing_processing",
		Help: "Whether the account billing runner is processing a billing hour.",
	})
	billingProcessingTimestamp = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "sealos_account_billing_processing_timestamp_seconds",
		Help: "Unix timestamp of the account billing hour currently being processed.",
	})
	billingProcessingStartedTimestamp = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "sealos_account_billing_processing_started_timestamp_seconds",
		Help: "Unix timestamp when processing of the current account billing hour started.",
	})
	billingLastSuccessTimestamp = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "sealos_account_billing_last_success_timestamp_seconds",
		Help: "Unix timestamp when the account billing checkpoint was last advanced.",
	})
	billingReconcileFailures = prometheus.NewCounter(prometheus.CounterOpts{
		Name: "sealos_account_billing_reconcile_failures_total",
		Help: "Total account billing hour reconciliation failures.",
	})
	billingFailedOwners = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "sealos_account_billing_failed_owners",
		Help: "Number of owners that failed in the most recent account billing batch.",
	})
)

func init() {
	ctrlmetrics.Registry.MustRegister(
		billingCheckpointTimestamp,
		billingTargetTimestamp,
		billingCheckpointLagSeconds,
		billingPendingCheckpoints,
		billingProcessing,
		billingProcessingTimestamp,
		billingProcessingStartedTimestamp,
		billingLastSuccessTimestamp,
		billingReconcileFailures,
		billingFailedOwners,
	)
}

func setBillingTargetMetrics(target time.Time) {
	target = target.UTC().Truncate(time.Hour)
	billingTargetTimestamp.Set(float64(target.Unix()))
}

func setBillingCheckpointMetrics(checkpoint, target time.Time) {
	checkpoint = checkpoint.UTC().Truncate(time.Hour)
	billingCheckpointTimestamp.Set(float64(checkpoint.Unix()))
	setBillingPendingCheckpointMetrics(checkpoint, target)
}

func setBillingPendingCheckpointMetrics(checkpoint, target time.Time) {
	checkpoint = checkpoint.UTC().Truncate(time.Hour)
	target = target.UTC().Truncate(time.Hour)
	lag := target.Sub(checkpoint).Seconds()
	if lag < 0 {
		lag = 0
	}
	billingCheckpointLagSeconds.Set(lag)
	billingPendingCheckpoints.Set(lag / float64(time.Hour/time.Second))
}

func setBillingProcessingMetrics(hour time.Time, processing bool) {
	if !processing {
		billingProcessing.Set(0)
		billingProcessingTimestamp.Set(0)
		billingProcessingStartedTimestamp.Set(0)
		return
	}
	billingProcessing.Set(1)
	billingProcessingTimestamp.Set(float64(hour.UTC().Truncate(time.Hour).Unix()))
	billingProcessingStartedTimestamp.Set(float64(time.Now().UTC().Unix()))
}
