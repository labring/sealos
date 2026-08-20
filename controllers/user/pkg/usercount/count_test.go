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
	"testing"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	toolscache "k8s.io/client-go/tools/cache"
)

func TestCounterTracksInformerEvents(t *testing.T) {
	counter := NewCounter()
	deletionTimestamp := metav1.Now()
	active := &metav1.PartialObjectMetadata{ObjectMeta: metav1.ObjectMeta{Name: "active-user"}}
	deleting := &metav1.PartialObjectMetadata{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "active-user",
			DeletionTimestamp: &deletionTimestamp,
		},
	}

	counter.Initialize([]interface{}{active})
	if !counter.Initialized() || counter.Count() != 1 {
		t.Fatalf("initialized counter = (%t, %d), want (true, 1)", counter.Initialized(), counter.Count())
	}
	if got := counter.CountExcluding("active-user"); got != 0 {
		t.Fatalf("CountExcluding() = %d, want 0", got)
	}

	counter.Update(active, deleting)
	if got := counter.Count(); got != 0 {
		t.Fatalf("count after deletion update = %d, want 0", got)
	}

	counter.Add(&metav1.PartialObjectMetadata{ObjectMeta: metav1.ObjectMeta{Name: "new-user"}})
	if got := counter.Count(); got != 1 {
		t.Fatalf("count after add = %d, want 1", got)
	}
	counter.Delete(&metav1.PartialObjectMetadata{ObjectMeta: metav1.ObjectMeta{Name: "new-user"}})
	if got := counter.Count(); got != 0 {
		t.Fatalf("count after delete = %d, want 0", got)
	}
}

func TestCounterIgnoresDeletedFinalStateUnknown(t *testing.T) {
	counter := NewCounter()
	counter.Initialize([]interface{}{
		&metav1.PartialObjectMetadata{ObjectMeta: metav1.ObjectMeta{Name: "user"}},
	})

	counter.Delete(toolscache.DeletedFinalStateUnknown{
		Key: "user",
		Obj: &metav1.PartialObjectMetadata{ObjectMeta: metav1.ObjectMeta{Name: "user"}},
	})
	if got := counter.Count(); got != 0 {
		t.Fatalf("count after tombstone delete = %d, want 0", got)
	}
}
