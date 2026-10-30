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

package reserved

import (
	"reflect"
	"testing"
)

func TestIsReservedCoversDefaultNames(t *testing.T) {
	t.Parallel()
	for _, name := range DefaultNames() {
		if !IsReserved(name) {
			t.Fatalf("default reserved name %q was not reserved", name)
		}
	}
	// The admin User is the built-in administrator and must stay creatable.
	for _, name := range []string{"admin", "alice", ""} {
		if IsReserved(name) {
			t.Fatalf("ordinary name %q was reserved", name)
		}
	}
}

func TestSetExtraNamesNormalizesEntries(t *testing.T) {
	t.Parallel()
	SetExtraNames([]string{" front-desktop ", "", "account", "account"})
	defer SetExtraNames(nil)

	if !IsReserved("front-desktop") || !IsReserved("account") {
		t.Fatal("extra reserved names were not applied")
	}
	if IsReserved("accounting") {
		t.Fatal("reserved lookup was not exact")
	}
	if got := ExtraNames(); !reflect.DeepEqual(got, []string{"account", "front-desktop"}) {
		t.Fatalf("extra names not normalized: got %#v", got)
	}

	SetExtraNames(nil)
	if IsReserved("front-desktop") || IsReserved("account") {
		t.Fatal("extra reserved names were not cleared")
	}
	if got := ExtraNames(); len(got) != 0 {
		t.Fatalf("extra names not cleared: got %#v", got)
	}
	if !IsReserved(ControllerServiceAccount) || !IsReserved(DefaultServiceAccount) {
		t.Fatal("clearing extra names removed the defaults")
	}
}
