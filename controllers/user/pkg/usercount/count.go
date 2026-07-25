// Copyright © 2026 sealos.
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

package usercount

import (
	"context"
	"fmt"
	"sync/atomic"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	UserPhaseActive = "Active"
)

var (
	userCount       int64
	initializedFlag uint32
)

func Initialized() bool {
	return atomic.LoadUint32(&initializedFlag) == 1
}

func Get() int {
	return int(atomic.LoadInt64(&userCount))
}

func Set(count int) {
	atomic.StoreInt64(&userCount, int64(count))
	atomic.StoreUint32(&initializedFlag, 1)
}

func Init(ctx context.Context, reader client.Reader) error {
	if Initialized() {
		return nil
	}
	count, err := countActiveUsersUnstructured(ctx, reader, &client.ListOptions{}, "")
	if err != nil {
		return fmt.Errorf("failed to count active users: %w", err)
	}
	Set(count)
	return nil
}

func CountActiveUsers(ctx context.Context, reader client.Reader) (int, error) {
	active, err := countActiveUsersUnstructured(ctx, reader, &client.ListOptions{}, "")
	if err != nil {
		return 0, fmt.Errorf("unable to get active user count: %w", err)
	}
	return active, nil
}

func CountQuotaUsers(ctx context.Context, reader client.Reader) (int, error) {
	count, err := countQuotaUsersUnstructured(ctx, reader, &client.ListOptions{}, "")
	if err != nil {
		return 0, fmt.Errorf("unable to get quota user count: %w", err)
	}
	return count, nil
}

func CountQuotaUsersExcluding(ctx context.Context, reader client.Reader, excludeName string) (int, error) {
	count, err := countQuotaUsersUnstructured(ctx, reader, &client.ListOptions{}, excludeName)
	if err != nil {
		return 0, fmt.Errorf("unable to get quota user count excluding %s: %w", excludeName, err)
	}
	return count, nil
}

func CountActiveUsersExcluding(ctx context.Context, reader client.Reader, excludeName string) (int, error) {
	active, err := countActiveUsersUnstructured(ctx, reader, &client.ListOptions{}, excludeName)
	if err != nil {
		return 0, fmt.Errorf("unable to get active user count excluding %s: %w", excludeName, err)
	}
	return active, nil
}

func countActiveUsersUnstructured(
	ctx context.Context,
	reader client.Reader,
	opts *client.ListOptions,
	excludeName string,
) (int, error) {
	if reader == nil {
		return 0, fmt.Errorf("client reader is nil")
	}

	list := &unstructured.UnstructuredList{}
	list.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   "user.sealos.io",
		Version: "v1",
		Kind:    "UserList",
	})

	if err := reader.List(ctx, list, opts); err != nil {
		return 0, fmt.Errorf("failed to list users: %w", err)
	}

	var activeCount int
	for _, item := range list.Items {
		if excludeName != "" && item.GetName() == excludeName {
			continue
		}
		phase, _, _ := unstructured.NestedString(item.Object, "status", "phase")
		if phase == UserPhaseActive {
			activeCount++
		}
	}

	return activeCount, nil
}

func countQuotaUsersUnstructured(
	ctx context.Context,
	reader client.Reader,
	opts *client.ListOptions,
	excludeName string,
) (int, error) {
	if reader == nil {
		return 0, fmt.Errorf("client reader is nil")
	}

	list := &unstructured.UnstructuredList{}
	list.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   "user.sealos.io",
		Version: "v1",
		Kind:    "UserList",
	})

	if err := reader.List(ctx, list, opts); err != nil {
		return 0, fmt.Errorf("failed to list users: %w", err)
	}

	var count int
	for _, item := range list.Items {
		if excludeName != "" && item.GetName() == excludeName {
			continue
		}
		if deletionTimestamp, found, _ := unstructured.NestedString(item.Object, "metadata", "deletionTimestamp"); found && deletionTimestamp != "" {
			continue
		}
		count++
	}

	return count, nil
}
