// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package clusterfile

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/labring/sealos/pkg/constants"
	v1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	clientset "k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

const (
	LifecycleResource = "sealos-standalone-lifecycle"
	LifecycleFilename = "standalone-lifecycle.json"
)

type LifecycleOperation struct {
	Action            string   `json:"Action"`
	Request           string   `json:"Request"`
	Approved          bool     `json:"Approved"`
	APIServer         string   `json:"-"`
	Hosts             []string `json:"Hosts"`
	RecoveryInventory []byte   `json:"-"`
}

type lifecycleInventory struct {
	LifecycleOperation
	Inventory            []byte   `json:"Inventory"`
	RecoveryInventory    []byte   `json:"RecoveryInventory"`
	JoinPreflightHosts   []string `json:"JoinPreflightHosts"`
	RootfsPreflightHosts []string `json:"RootfsPreflightHosts"`
}

// WithLifecycle records the request before mutation. Only an identical request
// may resume it; callers commit inventory before returning success. Reset keeps
// its authorization locally because its own work intentionally removes the API.
// The caller must hold LockLifecycleMaintenance for this inventory.
func WithLifecycle(
	ctx context.Context,
	name string,
	operation LifecycleOperation,
	requireAPI bool,
	run func(context.Context) error,
) error {
	endpoint := operation.APIServer
	recoveryInventory := operation.RecoveryInventory
	path := filepath.Join(constants.ClusterDir(name), LifecycleFilename)
	data, err := os.ReadFile(path)
	var journal lifecycleInventory
	switch {
	case err == nil:
		if err := json.Unmarshal(data, &journal); err != nil {
			return err
		}
		switch {
		case sameLifecycle(journal.LifecycleOperation, operation):
			operation = journal.LifecycleOperation
		case resetSupersedes(journal.LifecycleOperation, operation):
			journal.JoinPreflightHosts = nil
			journal.RootfsPreflightHosts = nil
		default:
			return errors.New(
				"a different standalone lifecycle operation is pending; repeat its original request",
			)
		}
	case !os.IsNotExist(err):
		return err
	default:
		journal.Inventory, err = os.ReadFile(constants.Clusterfile(name))
		if err != nil && !os.IsNotExist(err) {
			return err
		}
	}
	if len(recoveryInventory) != 0 {
		journal.RecoveryInventory = recoveryInventory
	}
	persist := func(operation LifecycleOperation) error {
		journal.LifecycleOperation = operation
		return WriteMaintenanceJSON(path, journal)
	}
	if operation.Action == "reset" && operation.Approved {
		if err := run(ctx); err != nil {
			return err
		}
		return removeLifecycleFile(path)
	}
	if !requireAPI {
		if err := persist(operation); err != nil {
			return err
		}
		if err := run(ctx); err != nil {
			return err
		}
		return removeLifecycleFile(path)
	}
	config, err := clientcmd.BuildConfigFromFlags("", constants.NewPathResolver(name).AdminFile())
	if err != nil {
		return err
	}
	config.Timeout = 10 * time.Second
	if endpoint != "" {
		config.Host = endpoint
	}
	client, err := clientset.NewForConfig(config)
	if err != nil {
		return err
	}
	err = withLifecycleAPI(
		ctx,
		client,
		operation,
		func(ctx context.Context, approved LifecycleOperation) error {
			if err := persist(approved); err != nil {
				return err
			}
			if operation.Action == "reset" {
				return nil
			}
			return run(ctx)
		},
	)
	if err != nil {
		return err
	}
	if operation.Action == "reset" {
		if err := run(ctx); err != nil {
			return err
		}
	}
	return removeLifecycleFile(path)
}

// Readers use the committed inventory until the lifecycle journal is cleared.
// This lets add/delete retries reconstruct the same desired hosts even if the
// new Clusterfile was written just before a synchronization failure.
// Reset prefers the recovery inventory, which also includes partially added hosts.
func readLifecycleInventory(path string, reset bool) ([]byte, error) {
	managed := filepath.Base(path) == "Clusterfile"
	if managed || reset {
		data, err := os.ReadFile(filepath.Join(filepath.Dir(path), LifecycleFilename))
		if err == nil {
			var journal lifecycleInventory
			if err := json.Unmarshal(data, &journal); err != nil {
				return nil, err
			}
			if reset && len(journal.RecoveryInventory) != 0 {
				return journal.RecoveryInventory, nil
			}
			if managed && len(journal.Inventory) != 0 {
				return journal.Inventory, nil
			}
		} else if !os.IsNotExist(err) {
			return nil, err
		}
	}
	return os.ReadFile(path)
}

func sameLifecycle(a, b LifecycleOperation) bool {
	return a.Action == b.Action && a.Request == b.Request
}

func resetSupersedes(previous, requested LifecycleOperation) bool {
	if previous.Action != "apply" || requested.Action != "reset" || len(previous.Hosts) == 0 {
		return false
	}
	hosts := make(map[string]bool)
	for _, host := range requested.Hosts {
		hosts[host] = true
	}
	for _, host := range previous.Hosts {
		if !hosts[host] {
			return false
		}
	}
	return true
}

func withLifecycleAPI(
	ctx context.Context,
	client clientset.Interface,
	operation LifecycleOperation,
	run func(context.Context, LifecycleOperation) error,
) error {
	return WithModeLease(ctx, client, func(ctx context.Context) error {
		maps := client.CoreV1().ConfigMaps("kube-system")
		if _, err := maps.Get(
			ctx,
			ModeTransitionResource,
			metav1.GetOptions{},
		); !apierrors.IsNotFound(
			err,
		) {
			return fmt.Errorf(
				"cannot start lifecycle while a mode conversion exists or cannot be checked: %w",
				err,
			)
		}
		cm, err := maps.Get(ctx, LifecycleResource, metav1.GetOptions{})
		switch {
		case apierrors.IsNotFound(err):
			data, err := json.Marshal(operation)
			if err != nil {
				return err
			}
			cm, err = maps.Create(ctx, &v1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{Name: LifecycleResource, Namespace: "kube-system"},
				Data:       map[string]string{"operation": string(data)},
			}, metav1.CreateOptions{})
			if err != nil {
				return err
			}
		case err != nil:
			return err
		default:
			var previous LifecycleOperation
			if err := json.Unmarshal([]byte(cm.Data["operation"]), &previous); err != nil {
				return err
			}
			if !sameLifecycle(previous, operation) {
				if !resetSupersedes(previous, operation) {
					return errors.New(
						"a different standalone lifecycle operation is pending in the API",
					)
				}
				data, err := json.Marshal(operation)
				if err != nil {
					return err
				}
				cm.Data["operation"] = string(data)
				cm, err = maps.Update(ctx, cm, metav1.UpdateOptions{})
				if err != nil {
					return err
				}
			}
		}
		operation.Approved = true
		if err := run(ctx, operation); err != nil {
			return err
		}
		// The reset tombstone remains in the API until the API is destroyed. This
		// blocks commands from other inventories after the lease is released.
		if operation.Action == "reset" {
			return nil
		}
		return maps.Delete(ctx, cm.Name, metav1.DeleteOptions{
			Preconditions: &metav1.Preconditions{
				UID:             &cm.UID,
				ResourceVersion: &cm.ResourceVersion,
			},
		})
	})
}

func CheckLifecycle(ctx context.Context, client clientset.Interface) error {
	_, err := client.CoreV1().
		ConfigMaps("kube-system").
		Get(ctx, LifecycleResource, metav1.GetOptions{})
	if err == nil {
		return fmt.Errorf(
			"%w; resume the pending standalone lifecycle operation",
			ErrModeTransitionPending,
		)
	}
	if !apierrors.IsNotFound(err) {
		return err
	}
	return nil
}

func removeLifecycleFile(path string) error {
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}
