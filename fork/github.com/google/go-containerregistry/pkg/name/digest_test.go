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
	"path"
	"strings"
	"testing"
)

const validDigest = "sha256:deadb33fdeadb33fdeadb33fdeadb33fdeadb33fdeadb33fdeadb33fdeadb33f"

var goodStrictValidationDigestNames = []string{
	"gcr.io/g-convoy/hello-world@" + validDigest,
	"gcr.io/google.com/project-id/hello-world@" + validDigest,
	"us.gcr.io/project-id/sub-repo@" + validDigest,
	"example.text/foo/bar@" + validDigest,
}

var goodStrictValidationTagDigestNames = []string{
	"example.text/foo/bar:latest@" + validDigest,
	"example.text:8443/foo/bar:latest@" + validDigest,
	"example.text/foo/bar:v1.0.0-alpine@" + validDigest,
}

var goodWeakValidationDigestNames = []string{
	"namespace/pathcomponent/image@" + validDigest,
	"library/ubuntu@" + validDigest,
}

var goodWeakValidationTagDigestNames = []string{
	"nginx:latest@" + validDigest,
	"library/nginx:latest@" + validDigest,
}

var badDigestNames = []string{
	"gcr.io/project-id/unknown-alg@unknown:abc123",
	"gcr.io/project-id/wrong-length@sha256:d34db33fd34db33f",
	"gcr.io/project-id/missing-digest@",
	// https://github.com/google/go-containerregistry/issues/1394
	"repo@sha256:" + strings.Repeat(":", 64),
	"repo@sha256:" + strings.Repeat("sh", 32),
	"repo@sha256:" + validDigest + "@" + validDigest,
}

func TestNewDigestStrictValidation(t *testing.T) {
	t.Parallel()

	for _, name := range goodStrictValidationDigestNames {
		if digest, err := NewDigest(name, StrictValidation); err != nil {
			t.Errorf("`%s` should be a valid Digest name, got error: %v", name, err)
		} else if digest.Name() != name {
			t.Errorf("`%v` .Name() should reproduce the original name. Wanted: %s Got: %s", digest, name, digest.Name())
		}
	}

	for _, name := range goodStrictValidationTagDigestNames {
		if _, err := NewDigest(name, StrictValidation); err != nil {
			t.Errorf("`%s` should be a valid Digest name, got error: %v", name, err)
		}
	}

	for _, name := range append(goodWeakValidationDigestNames, badDigestNames...) {
		if repo, err := NewDigest(name, StrictValidation); err == nil {
			t.Errorf("`%s` should be an invalid Digest name, got Digest: %#v", name, repo)
		}
	}
}

func TestNewDigest(t *testing.T) {
	t.Parallel()

	for _, name := range append(goodStrictValidationDigestNames, append(goodWeakValidationDigestNames, goodWeakValidationTagDigestNames...)...) {
		if _, err := NewDigest(name, WeakValidation); err != nil {
			t.Errorf("`%s` should be a valid Digest name, got error: %v", name, err)
		}
	}

	for _, name := range badDigestNames {
		if repo, err := NewDigest(name, WeakValidation); err == nil {
			t.Errorf("`%s` should be an invalid Digest name, got Digest: %#v", name, repo)
		}
	}
}

func TestDigestComponents(t *testing.T) {
	t.Parallel()
	testRegistry := "gcr.io"
	testRepository := "project-id/image"
	fullRepo := path.Join(testRegistry, testRepository)

	digestNameStr := testRegistry + "/" + testRepository + "@" + validDigest
	digest, err := NewDigest(digestNameStr, StrictValidation)
	if err != nil {
		t.Fatalf("`%s` should be a valid Digest name, got error: %v", digestNameStr, err)
	}

	if got := digest.String(); got != digestNameStr {
		t.Errorf("String() was incorrect for %v. Wanted: `%s` Got: `%s`", digest, digestNameStr, got)
	}
	if got := digest.Identifier(); got != validDigest {
		t.Errorf("Identifier() was incorrect for %v. Wanted: `%s` Got: `%s`", digest, validDigest, got)
	}
	actualRegistry := digest.RegistryStr()
	if actualRegistry != testRegistry {
		t.Errorf("RegistryStr() was incorrect for %v. Wanted: `%s` Got: `%s`", digest, testRegistry, actualRegistry)
	}
	actualRepository := digest.RepositoryStr()
	if actualRepository != testRepository {
		t.Errorf("RepositoryStr() was incorrect for %v. Wanted: `%s` Got: `%s`", digest, testRepository, actualRepository)
	}
	contextRepo := digest.Context().String()
	if contextRepo != fullRepo {
		t.Errorf("Context().String() was incorrect for %v. Wanted: `%s` Got: `%s`", digest, fullRepo, contextRepo)
	}
	actualDigest := digest.DigestStr()
	if actualDigest != validDigest {
		t.Errorf("DigestStr() was incorrect for %v. Wanted: `%s` Got: `%s`", digest, validDigest, actualDigest)
	}
}

func TestDigestScopes(t *testing.T) {
	t.Parallel()
	testRegistry := "gcr.io"
	testRepo := "project-id/image"
	testAction := "pull"

	expectedScope := strings.Join([]string{"repository", testRepo, testAction}, ":")

	digestNameStr := testRegistry + "/" + testRepo + "@" + validDigest
	digest, err := NewDigest(digestNameStr, StrictValidation)
	if err != nil {
		t.Fatalf("`%s` should be a valid Digest name, got error: %v", digestNameStr, err)
	}

	actualScope := digest.Scope(testAction)
	if actualScope != expectedScope {
		t.Errorf("scope was incorrect for %v. Wanted: `%s` Got: `%s`", digest, expectedScope, actualScope)
	}
}
