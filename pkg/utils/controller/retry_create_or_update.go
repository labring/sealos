// Copyright © 2023 sealos.
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

package controller

import (
	"context"
	"fmt"
	"time"

	"github.com/labring/sealos/pkg/utils/retry"

	"k8s.io/apimachinery/pkg/api/equality"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// mutate wraps a MutateFn and applies validation to its result.
func mutate(f MutateFn, key client.ObjectKey, obj client.Object) error {
	if err := f(); err != nil {
		return err
	}
	if newKey := client.ObjectKeyFromObject(obj); key != newKey {
		return fmt.Errorf("MutateFn cannot mutate object name and/or object namespace")
	}
	return nil
}

type MutateFn func() error

func RetryCreateOrUpdate(ctx context.Context, c client.Client, obj client.Object, f MutateFn, tryTimes int, trySleepTime time.Duration) (OperationResult, error) {
	var result OperationResult
	err := retry.Retry(tryTimes, trySleepTime, func() error {
		key := client.ObjectKeyFromObject(obj)
		if err := c.Get(ctx, key, obj); err != nil {
			if !apierrors.IsNotFound(err) {
				result = OperationResultNone
				return err
			}
			if err := mutate(f, key, obj); err != nil {
				result = OperationResultNone
				return err
			}
			if err := c.Create(ctx, obj); err != nil {
				result = OperationResultNone
				return err
			}
			result = OperationResultCreated
			return nil
		}

		existing := obj.DeepCopyObject() //nolint
		if err := mutate(f, key, obj); err != nil {
			result = OperationResultNone
			return err
		}

		if equality.Semantic.DeepEqual(existing, obj) {
			result = OperationResultNone
			return nil
		}

		if err := c.Update(ctx, obj); err != nil {
			result = OperationResultNone
			return err
		}
		result = OperationResultUpdated

		return nil
	})
	if err != nil {
		return OperationResultNone, err
	}
	return result, nil
}

// OperationResult is the action result of a CreateOrUpdate call.
type OperationResult string

const ( // They should complete the sentence "Deployment default/foo has been ..."
	// OperationResultNone means that the resource has not been changed.
	OperationResultNone OperationResult = "unchanged"
	// OperationResultCreated means that a new resource is created.
	OperationResultCreated OperationResult = "created"
	// OperationResultUpdated means that an existing resource is updated.
	OperationResultUpdated OperationResult = "updated"
	// OperationResultUpdatedStatus means that an existing resource and its status is updated.
	OperationResultUpdatedStatus OperationResult = "updatedStatus"
	// OperationResultUpdatedStatusOnly means that only an existing status is updated.
	OperationResultUpdatedStatusOnly OperationResult = "updatedStatusOnly"
)
