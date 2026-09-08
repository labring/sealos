// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package clusterfile

import (
	"context"
	"errors"
	"fmt"
	"os"
	"sync"
	"time"

	coordinationv1 "k8s.io/api/coordination/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/uuid"
	clientset "k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"

	"github.com/labring/sealos/pkg/constants"
)

const ModeTransitionResource = "sealos-control-plane-mode"

var ErrModeTransitionPending = errors.New("control-plane conversion is pending")

// WithModeLease uses the public coordination API to serialize conversions
// started from different inventories. Host locks also exclude in-flight SSH
// work when the management process is interrupted or loses its lease.
func WithModeLease(ctx context.Context, client clientset.Interface, run func(context.Context) error) error {
	leases := client.CoordinationV1().Leases("kube-system")
	lease, err := leases.Get(ctx, ModeTransitionResource, metav1.GetOptions{})
	if err != nil && !apierrors.IsNotFound(err) {
		return err
	}
	if apierrors.IsNotFound(err) {
		lease = nil
	}
	if lease != nil && leaseActive(lease) {
		return fmt.Errorf("another control-plane conversion holds the cluster lease")
	}
	identity := string(uuid.NewUUID())
	duration := int32(60)
	now := metav1.NowMicro()
	if lease == nil {
		lease = &coordinationv1.Lease{
			ObjectMeta: metav1.ObjectMeta{
				Name:      ModeTransitionResource,
				Namespace: "kube-system",
			},
		}
	}
	lease.Spec = coordinationv1.LeaseSpec{
		HolderIdentity:       &identity,
		LeaseDurationSeconds: &duration,
		AcquireTime:          &now,
		RenewTime:            &now,
	}
	if lease.ResourceVersion == "" {
		lease, err = leases.Create(ctx, lease, metav1.CreateOptions{})
	} else {
		lease, err = leases.Update(ctx, lease, metav1.UpdateOptions{})
	}
	if err != nil {
		return err
	}
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	var wg sync.WaitGroup
	var renewErr error
	wg.Add(1)
	go func() {
		defer wg.Done()
		lastRenewed := time.Now()
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				now := metav1.NowMicro()
				candidate := lease.DeepCopy()
				candidate.Spec.RenewTime = &now
				renewCtx, stop := context.WithTimeout(ctx, 10*time.Second)
				updated, err := leases.Update(renewCtx, candidate, metav1.UpdateOptions{})
				stop()
				if err != nil {
					// A single-control-plane restart temporarily removes the API.
					// Stop before our confirmed lease can expire; conflicts mean
					// another holder changed it and must fail immediately.
					if !apierrors.IsConflict(err) && !apierrors.IsNotFound(err) &&
						time.Since(lastRenewed) < 40*time.Second {
						continue
					}
					renewErr = err
					cancel()
					return
				}
				lease = updated
				lastRenewed = time.Now()
			}
		}
	}()
	err = run(ctx)
	cancel()
	wg.Wait()
	cleanupCtx, stop := context.WithTimeout(context.Background(), 10*time.Second)
	defer stop()
	_ = leases.Delete(cleanupCtx, lease.Name, metav1.DeleteOptions{
		Preconditions: &metav1.Preconditions{
			UID:             &lease.UID,
			ResourceVersion: &lease.ResourceVersion,
		},
	})
	if renewErr != nil {
		return fmt.Errorf("cluster conversion lease was lost: %w", renewErr)
	}
	return err
}

func leaseActive(lease *coordinationv1.Lease) bool {
	return lease.Spec.HolderIdentity != nil && *lease.Spec.HolderIdentity != "" &&
		lease.Spec.RenewTime != nil && lease.Spec.LeaseDurationSeconds != nil &&
		time.Now().Before(lease.Spec.RenewTime.Add(time.Duration(*lease.Spec.LeaseDurationSeconds)*time.Second))
}

func CheckRemoteModeTransition(ctx context.Context, name string, required bool) error {
	path := constants.NewPathResolver(name).AdminFile()
	if _, err := os.Stat(path); os.IsNotExist(err) {
		if required {
			return fmt.Errorf("admin kubeconfig is required to verify the managed cluster's conversion state")
		}
		return nil
	}
	config, err := clientcmd.BuildConfigFromFlags("", path)
	if err != nil {
		if !required {
			return nil
		}
		return err
	}
	config.Timeout = 10 * time.Second
	client, err := clientset.NewForConfig(config)
	if err != nil {
		return err
	}
	return checkOptionalModeTransition(ctx, client, required)
}

func checkOptionalModeTransition(ctx context.Context, client clientset.Interface, required bool) error {
	err := CheckModeTransition(ctx, client)
	// Existing inventories that have never enabled mode management must retain
	// their offline reset behavior. Managed inventories fail closed on API errors.
	if !required && !errors.Is(err, ErrModeTransitionPending) {
		return nil
	}
	return err
}

func CheckModeTransition(ctx context.Context, client clientset.Interface) error {
	if err := CheckLifecycle(ctx, client); err != nil {
		return err
	}
	_, err := client.CoreV1().ConfigMaps("kube-system").Get(ctx, ModeTransitionResource, metav1.GetOptions{})
	if err == nil {
		return fmt.Errorf("%w; resume sealos switch before running other lifecycle commands", ErrModeTransitionPending)
	}
	if !apierrors.IsNotFound(err) {
		return err
	}
	lease, err := client.CoordinationV1().Leases("kube-system").Get(ctx, ModeTransitionResource, metav1.GetOptions{})
	if err == nil && leaseActive(lease) {
		return ErrModeTransitionPending
	}
	if err != nil && !apierrors.IsNotFound(err) {
		return err
	}
	return nil
}
