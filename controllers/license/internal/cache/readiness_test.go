// Copyright 2026 labring.
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

package cache

import "testing"

func TestCacheReadiness(t *testing.T) {
	licenses, nodes := false, false
	check := cacheReady(map[string]func() bool{
		"licenses": func() bool { return licenses },
		"nodes":    func() bool { return nodes },
	})
	if check(nil) == nil {
		t.Fatal("unsynced caches reported ready")
	}
	licenses = true
	if check(nil) == nil {
		t.Fatal("missing node cache reported ready")
	}
	nodes = true
	if err := check(nil); err != nil {
		t.Fatalf("synced caches not ready: %v", err)
	}
	licenses = false
	if check(nil) == nil {
		t.Fatal("missing license cache reported ready")
	}
}
