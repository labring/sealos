// Copyright 2018 Google LLC All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package name

import (
	"testing"
)

var goodStrictValidationRegistryNames = []string{
	"gcr.io",
	"gcr.io:9001",
	"index.docker.io",
	"us.gcr.io",
	"example.text",
	"localhost",
	"localhost:9090",
}

var goodWeakValidationRegistryNames = []string{
	"",
}

var badRegistryNames = []string{
	"white space",
	"gcr?com",
}

func TestNewRegistryStrictValidation(t *testing.T) {
	t.Parallel()

	for _, name := range goodStrictValidationRegistryNames {
		if registry, err := NewRegistry(name, StrictValidation); err != nil {
			t.Errorf("`%s` should be a valid Registry name, got error: %v", name, err)
		} else {
			if registry.Name() != name {
				t.Errorf("`%v` .Name() should reproduce the original name. Wanted: %s Got: %s", registry, name, registry.Name())
			}
			if registry.String() != name {
				t.Errorf("`%v` .String() should reproduce the original name. Wanted: %s Got: %s", registry, name, registry.String())
			}
		}
	}

	for _, name := range append(goodWeakValidationRegistryNames, badRegistryNames...) {
		if repo, err := NewRegistry(name, StrictValidation); err == nil {
			t.Errorf("`%s` should be an invalid Registry name, got Registry: %#v", name, repo)
		}
	}
}

func TestNewRegistry(t *testing.T) {
	t.Parallel()

	for _, name := range append(goodStrictValidationRegistryNames, goodWeakValidationRegistryNames...) {
		if _, err := NewRegistry(name, WeakValidation); err != nil {
			t.Errorf("`%s` should be a valid Registry name, got error: %v", name, err)
		}
	}

	for _, name := range badRegistryNames {
		if repo, err := NewRegistry(name, WeakValidation); err == nil {
			t.Errorf("`%s` should be an invalid Registry name, got Registry: %#v", name, repo)
		}
	}
}

func TestNewInsecureRegistry(t *testing.T) {
	t.Parallel()

	for _, name := range append(goodStrictValidationRegistryNames, goodWeakValidationRegistryNames...) {
		if _, err := NewInsecureRegistry(name, WeakValidation); err != nil {
			t.Errorf("`%s` should be a valid Registry name, got error: %v", name, err)
		}
	}

	for _, name := range badRegistryNames {
		if repo, err := NewInsecureRegistry(name, WeakValidation); err == nil {
			t.Errorf("`%s` should be an invalid Registry name, got Registry: %#v", name, repo)
		}
	}
}

func TestDefaultRegistryNames(t *testing.T) {
	testRegistries := []string{"docker.io", ""}

	for _, testRegistry := range testRegistries {
		registry, err := NewRegistry(testRegistry, WeakValidation)
		if err != nil {
			t.Fatalf("`%s` should be a valid Registry name, got error: %v", testRegistry, err)
		}

		actualRegistry := registry.RegistryStr()
		if actualRegistry != DefaultRegistry {
			t.Errorf("RegistryStr() was incorrect for %v. Wanted: `%s` Got: `%s`", registry, DefaultRegistry, actualRegistry)
		}
	}
}

func TestOverrideDefaultRegistryNames(t *testing.T) {
	testRegistries := []string{"docker.io", ""}
	expectedRegistries := []string{"index.docker.io", "gcr.io"}
	overrideDefault := "gcr.io"

	for i, testRegistry := range testRegistries {
		registry, err := NewRegistry(testRegistry, WeakValidation, WithDefaultRegistry(overrideDefault))
		if err != nil {
			t.Fatalf("`%s` should be a valid Registry name, got error: %v", testRegistry, err)
		}

		actualRegistry := registry.RegistryStr()
		if actualRegistry != expectedRegistries[i] {
			t.Errorf("RegistryStr() was incorrect for %v. Wanted: `%s` Got: `%s`", registry, expectedRegistries[i], actualRegistry)
		}
	}
}

func TestRegistryComponents(t *testing.T) {
	t.Parallel()
	testRegistry := "gcr.io"

	registry, err := NewRegistry(testRegistry, StrictValidation)
	if err != nil {
		t.Fatalf("`%s` should be a valid Registry name, got error: %v", testRegistry, err)
	}

	actualRegistry := registry.RegistryStr()
	if actualRegistry != testRegistry {
		t.Errorf("RegistryStr() was incorrect for %v. Wanted: `%s` Got: `%s`", registry, testRegistry, actualRegistry)
	}
}

func TestRegistryScopes(t *testing.T) {
	t.Parallel()
	testRegistry := "gcr.io"
	testAction := "whatever"

	expectedScope := "registry:catalog:*"

	registry, err := NewRegistry(testRegistry, StrictValidation)
	if err != nil {
		t.Fatalf("`%s` should be a valid Registry name, got error: %v", testRegistry, err)
	}

	actualScope := registry.Scope(testAction)
	if actualScope != expectedScope {
		t.Errorf("scope was incorrect for %v. Wanted: `%s` Got: `%s`", registry, expectedScope, actualScope)
	}
}

func TestIsRFC1918(t *testing.T) {
	t.Parallel()
	tests := []struct {
		reg    string
		result bool
	}{{
		reg:    "index.docker.io",
		result: false,
	}, {
		reg:    "10.2.3.4:5000",
		result: true,
	}, {
		reg:    "8.8.8.8",
		result: false,
	}, {
		reg:    "172.16.3.4:3000",
		result: true,
	}, {
		reg:    "192.168.3.4",
		result: true,
	}, {
		reg:    "10.256.0.0:5000",
		result: false,
	}}
	for _, test := range tests {
		reg, err := NewRegistry(test.reg, WeakValidation)
		if err != nil {
			t.Errorf("NewRegistry(%s) = %v", test.reg, err)
		}
		got := reg.isRFC1918()
		if got != test.result {
			t.Errorf("isRFC1918(); got %v, want %v", got, test.result)
		}
	}
}

func TestRegistryScheme(t *testing.T) {
	t.Parallel()
	tests := []struct {
		domain string
		scheme string
	}{{
		domain: "foo.svc.local:1234",
		scheme: "http",
	}, {
		domain: "127.0.0.1:1234",
		scheme: "http",
	}, {
		domain: "127.0.0.1",
		scheme: "http",
	}, {
		domain: "localhost:8080",
		scheme: "http",
	}, {
		domain: "gcr.io",
		scheme: "https",
	}, {
		domain: "index.docker.io",
		scheme: "https",
	}, {
		domain: "::1",
		scheme: "http",
	}, {
		domain: "10.2.3.4:5000",
		scheme: "http",
	}}

	for _, test := range tests {
		reg, err := NewRegistry(test.domain, WeakValidation)
		if err != nil {
			t.Errorf("NewRegistry(%s) = %v", test.domain, err)
		}
		if got, want := reg.Scheme(), test.scheme; got != want {
			t.Errorf("scheme(%v); got %v, want %v", reg, got, want)
		}
	}
}

func TestRegistryInsecureScheme(t *testing.T) {
	t.Parallel()
	domain := "gcr.io"

	reg, err := NewInsecureRegistry(domain, WeakValidation)
	if err != nil {
		t.Errorf("NewRegistry(%s) = %v", domain, err)
	}

	if got := reg.Scheme(); got != "http" {
		t.Errorf("scheme(%v); got %v, want http", reg, got)
	}
}
