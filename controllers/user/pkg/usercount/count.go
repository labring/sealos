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
	"sync/atomic"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
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

func Inc() {
	atomic.AddInt64(&userCount, 1)
	atomic.StoreUint32(&initializedFlag, 1)
}

func Init(ctx context.Context, reader client.Reader) error {
	if Initialized() {
		return nil
	}
	list := &metav1.PartialObjectMetadataList{}
	list.SetGroupVersionKind(
		schema.GroupVersion{Group: "user.sealos.io", Version: "v1"}.WithKind("UserList"),
	)
	if err := reader.List(ctx, list); err != nil {
		return err
	}
	Set(len(list.Items))
	return nil
}
