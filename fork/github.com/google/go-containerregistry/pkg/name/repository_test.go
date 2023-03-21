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
	"errors"
	"strings"
	"testing"
)

var goodStrictValidationRepositoryNames = []string{
	"gcr.io/g-convoy/hello-world",
	"gcr.io/google.com/project-id/hello-world",
	"us.gcr.io/project-id/sub-repo",
	"example.text/foo/bar",
	"mirror.gcr.io/ubuntu",
	"index.docker.io/library/ubuntu",
}

var goodWeakValidationRepositoryNames = []string{
	"namespace/pathcomponent/image",
	"library/ubuntu",
	"ubuntu",
}

var badRepositoryNames = []string{
	"white space",
	"b@char/image",
	"",
}

func TestNewRepositoryStrictValidation(t *testing.T) {
	t.Parallel()

	for _, name := range goodStrictValidationRepositoryNames {
		if repository, err := NewRepository(name, StrictValidation); err != nil {
			t.Errorf("`%s` should be a valid Repository name, got error: %v", name, err)
		} else if repository.Name() != name {
			t.Errorf("`%v` .Name() should reproduce the original name. Wanted: %s Got: %s", repository, name, repository.Name())
		}
	}

	for _, name := range append(goodWeakValidationRepositoryNames, badRepositoryNames...) {
		if repo, err := NewRepository(name, StrictValidation); err == nil {
			t.Errorf("`%s` should be an invalid repository name, got Repository: %#v", name, repo)
		}
	}
}

func TestNewRepository(t *testing.T) {
	t.Parallel()

	for _, name := range append(goodStrictValidationRepositoryNames, goodWeakValidationRepositoryNames...) {
		if _, err := NewRepository(name, WeakValidation); err != nil {
			t.Errorf("`%s` should be a valid repository name, got error: %v", name, err)
		}
	}

	for _, name := range badRepositoryNames {
		if repo, err := NewRepository(name, WeakValidation); err == nil {
			t.Errorf("`%s` should be an invalid repository name, got Repository: %#v", name, repo)
		}
	}
}

func TestRepositoryComponents(t *testing.T) {
	t.Parallel()
	testRegistry := "gcr.io"
	testRepository := "project-id/image"

	repositoryNameStr := testRegistry + "/" + testRepository
	repository, err := NewRepository(repositoryNameStr, StrictValidation)
	if err != nil {
		t.Fatalf("`%s` should be a valid Repository name, got error: %v", repositoryNameStr, err)
	}

	actualRegistry := repository.RegistryStr()
	if actualRegistry != testRegistry {
		t.Errorf("RegistryStr() was incorrect for %v. Wanted: `%s` Got: `%s`", repository, testRegistry, actualRegistry)
	}
	actualRepository := repository.RepositoryStr()
	if actualRepository != testRepository {
		t.Errorf("RepositoryStr() was incorrect for %v. Wanted: `%s` Got: `%s`", repository, testRepository, actualRepository)
	}
}

func TestRepositoryScopes(t *testing.T) {
	t.Parallel()
	testRegistry := "gcr.io"
	testRepo := "project-id/image"
	testAction := "pull"

	expectedScope := strings.Join([]string{"repository", testRepo, testAction}, ":")

	repositoryNameStr := testRegistry + "/" + testRepo
	repository, err := NewRepository(repositoryNameStr, StrictValidation)
	if err != nil {
		t.Fatalf("`%s` should be a valid Repository name, got error: %v", repositoryNameStr, err)
	}

	actualScope := repository.Scope(testAction)
	if actualScope != expectedScope {
		t.Errorf("scope was incorrect for %v. Wanted: `%s` Got: `%s`", repository, expectedScope, actualScope)
	}
}

func TestRepositoryBadDefaulting(t *testing.T) {
	var berr *ErrBadName
	if _, err := NewRepository("index.docker.io/foo", StrictValidation); !errors.As(err, &berr) {
		t.Errorf("Not an ErrBadName: %v", err)
	}
}

func TestRepositoryChildren(t *testing.T) {
	repo, err := NewRepository("example.com/repo", Insecure)
	if err != nil {
		t.Fatal(err)
	}
	tag := repo.Tag("foo")
	if got, want := tag.Scheme(), "http"; got != want {
		t.Errorf("tag.Scheme(): got %s want %s", got, want)
	}
	if got, want := tag.String(), "example.com/repo:foo"; got != want {
		t.Errorf("tag.String(): got %s want %s", got, want)
	}
	digest := repo.Digest("badf00d")
	if got, want := digest.Scheme(), "http"; got != want {
		t.Errorf("digest.Scheme(): got %s want %s", got, want)
	}
	if got, want := digest.String(), "example.com/repo@badf00d"; got != want {
		t.Errorf("digest.String(): got %s want %s", got, want)
	}
}
