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

var (
	testDefaultRegistry = "registry.upbound.io"
	testDefaultTag      = "stable"
	inputDefaultNames   = []string{
		"crossplane/provider-gcp",
		"crossplane/provider-gcp:v0.14.0",
		"ubuntu",
		"gcr.io/crossplane/provider-gcp:latest",
	}
	outputDefaultNames = []string{
		"registry.upbound.io/crossplane/provider-gcp:stable",
		"registry.upbound.io/crossplane/provider-gcp:v0.14.0",
		"registry.upbound.io/ubuntu:stable",
		"gcr.io/crossplane/provider-gcp:latest",
	}
)

func TestParseReferenceDefaulting(t *testing.T) {
	for i, name := range inputDefaultNames {
		ref, err := ParseReference(name, WithDefaultRegistry(testDefaultRegistry), WithDefaultTag(testDefaultTag))
		if err != nil {
			t.Errorf("ParseReference(%q); %v", name, err)
		}
		if ref.Name() != outputDefaultNames[i] {
			t.Errorf("ParseReference(%q); got %v, want %v", name, ref.String(), outputDefaultNames[i])
		}
	}
}

func TestParseReference(t *testing.T) {
	for _, name := range goodWeakValidationDigestNames {
		ref, err := ParseReference(name, WeakValidation)
		if err != nil {
			t.Errorf("ParseReference(%q); %v", name, err)
		}
		dig, err := NewDigest(name, WeakValidation)
		if err != nil {
			t.Errorf("NewDigest(%q); %v", name, err)
		}
		if ref != dig {
			t.Errorf("ParseReference(%q) != NewDigest(%q); got %v, want %v", name, name, ref, dig)
		}
	}

	for _, name := range goodStrictValidationDigestNames {
		ref, err := ParseReference(name, StrictValidation)
		if err != nil {
			t.Errorf("ParseReference(%q); %v", name, err)
		}
		dig, err := NewDigest(name, StrictValidation)
		if err != nil {
			t.Errorf("NewDigest(%q); %v", name, err)
		}
		if ref != dig {
			t.Errorf("ParseReference(%q) != NewDigest(%q); got %v, want %v", name, name, ref, dig)
		}
	}

	for _, name := range badDigestNames {
		if _, err := ParseReference(name, WeakValidation); err == nil {
			t.Errorf("ParseReference(%q); expected error, got none", name)
		}
	}

	for _, name := range goodWeakValidationTagNames {
		ref, err := ParseReference(name, WeakValidation)
		if err != nil {
			t.Errorf("ParseReference(%q); %v", name, err)
		}
		tag, err := NewTag(name, WeakValidation)
		if err != nil {
			t.Errorf("NewTag(%q); %v", name, err)
		}
		if ref != tag {
			t.Errorf("ParseReference(%q) != NewTag(%q); got %v, want %v", name, name, ref, tag)
		}
	}

	for _, name := range goodStrictValidationTagNames {
		ref, err := ParseReference(name, StrictValidation)
		if err != nil {
			t.Errorf("ParseReference(%q); %v", name, err)
		}
		tag, err := NewTag(name, StrictValidation)
		if err != nil {
			t.Errorf("NewTag(%q); %v", name, err)
		}
		if ref != tag {
			t.Errorf("ParseReference(%q) != NewTag(%q); got %v, want %v", name, name, ref, tag)
		}
	}

	for _, name := range badTagNames {
		if _, err := ParseReference(name, WeakValidation); err == nil {
			t.Errorf("ParseReference(%q); expected error, got none", name)
		}
	}
}

func TestMustParseReference(t *testing.T) {
	for _, name := range append(goodWeakValidationTagNames, goodWeakValidationDigestNames...) {
		func() {
			defer func() {
				if err := recover(); err != nil {
					t.Errorf("MustParseReference(%q, WeakValidation); panic: %v", name, err)
				}
			}()
			MustParseReference(stringConst(name), WeakValidation)
		}()
	}

	for _, name := range append(goodStrictValidationTagNames, goodStrictValidationDigestNames...) {
		func() {
			defer func() {
				if err := recover(); err != nil {
					t.Errorf("MustParseReference(%q, StrictValidation); panic: %v", name, err)
				}
			}()
			MustParseReference(stringConst(name), StrictValidation)
		}()
	}

	for _, name := range append(badTagNames, badDigestNames...) {
		func() {
			defer func() { recover() }()
			ref := MustParseReference(stringConst(name), WeakValidation)
			t.Errorf("MustParseReference(%q, WeakValidation) should panic, got: %#v", name, ref)
		}()
	}
}

// Test that MustParseReference can accept a const string or string value.
const str = "valid/string"

var _ = MustParseReference(str)
var _ = MustParseReference("valid/string")
var _ = MustParseReference("valid/prefix/" + str)

func TestParseReference1(t *testing.T) {
	type args struct {
		s    string
		opts []Option
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "default",
			args: args{
				s:    "nginx",
				opts: nil,
			},
			wantErr: false,
		},
		{
			name: "default",
			args: args{
				s:    "sealos.hub:5000/nginx",
				opts: nil,
			},
			wantErr: false,
		},
		{
			name: "default",
			args: args{
				s:    "quay.io/tigera/operator:v1.25.3",
				opts: nil,
			},
			wantErr: false,
		},
		{
			name: "default",
			args: args{
				s:    "cuisongliu/k8s-docker@sha256:bcf4e49a5b4da1745928134ea5b4aa51ccd78b2f6e830cf76b6789d2e661a8f4",
				opts: nil,
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseReference(tt.args.s, tt.args.opts...)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseReference() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			t.Logf("ParseReference(String) = %v", got.String())
			t.Logf("ParseReference(Name) = %v", got.Name())
			t.Logf("ParseReference(Identifier) = %v", got.Identifier())
			t.Logf("ParseReference(registry) = %v", got.Context().RegistryStr())
			t.Logf("ParseReference(repo) = %v", got.Context().RepositoryStr())
		})
	}
}
