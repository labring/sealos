/*
Copyright 2023.

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

package util

import (
	"context"

	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// This module provides a highly extensible method for reading k8s resources

type Reader struct {
	objArray []client.Object
	idArray  []types.NamespacedName
}

func (r *Reader) Add(obj client.Object, id types.NamespacedName) {
	r.objArray = append(r.objArray, obj)
	r.idArray = append(r.idArray, id)
}

func (r *Reader) Read(ctx context.Context, client client.Client) error {
	size := len(r.objArray)
	for i := 0; i < size; i++ {
		err := client.Get(ctx, r.idArray[i], r.objArray[i])
		if err != nil {
			return err
		}
	}
	return nil
}
