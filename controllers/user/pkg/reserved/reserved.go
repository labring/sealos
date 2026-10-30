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

// Package reserved tracks User names that must never be processed by the
// user controller.
//
// Every User owns a ServiceAccount with the same name in the user-system
// namespace, and its kubeconfig is a token for that ServiceAccount. A User
// whose name matches a pre-existing ServiceAccount would therefore issue
// credentials for that identity and attach a User ownerReference to it,
// leaking the identity's privileges to the User holder and exposing it to
// garbage collection when the User is deleted. The User webhook rejects
// reserved names on create, and the reconciler refuses to process them.
package reserved

import (
	"sort"
	"strings"
	"sync"
)

const (
	// ControllerServiceAccount is the ServiceAccount used by the user
	// controller deployment in the user-system namespace. Adopting it would
	// hand a User the controller's cluster-wide permissions.
	ControllerServiceAccount = "user-controller-manager"
	// DefaultServiceAccount is the built-in ServiceAccount that exists in
	// every namespace, including user-system.
	DefaultServiceAccount = "default"
)

var (
	mu    sync.RWMutex
	extra = make(map[string]struct{})
)

// DefaultNames returns the names that are always reserved.
func DefaultNames() []string {
	return []string{ControllerServiceAccount, DefaultServiceAccount}
}

// SetExtraNames replaces the operator-provided reserved names. Blank entries
// are skipped and duplicates collapse; pass an empty slice to clear them.
func SetExtraNames(names []string) {
	normalized := make(map[string]struct{}, len(names))
	for _, name := range names {
		if name = strings.TrimSpace(name); name != "" {
			normalized[name] = struct{}{}
		}
	}
	mu.Lock()
	extra = normalized
	mu.Unlock()
}

// ExtraNames returns the sorted operator-provided reserved names.
func ExtraNames() []string {
	mu.RLock()
	defer mu.RUnlock()
	names := make([]string, 0, len(extra))
	for name := range extra {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

// IsReserved reports whether name is reserved, either by default or through
// the operator-provided list.
func IsReserved(name string) bool {
	if name == ControllerServiceAccount || name == DefaultServiceAccount {
		return true
	}
	mu.RLock()
	defer mu.RUnlock()
	_, ok := extra[name]
	return ok
}
