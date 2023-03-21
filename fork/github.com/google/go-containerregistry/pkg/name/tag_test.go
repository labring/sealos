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

var goodStrictValidationTagNames = []string{
	"gcr.io/g-convoy/hello-world:latest",
	"gcr.io/google.com/g-convoy/hello-world:latest",
	"gcr.io/project-id/with-nums:v2",
	"us.gcr.io/project-id/image:with.period.in.tag",
	"gcr.io/project-id/image:w1th-alpha_num3ric.PLUScaps",
	"domain.with.port:9001/image:latest",
}

var goodWeakValidationTagNames = []string{
	"namespace/pathcomponent/image",
	"library/ubuntu",
	"gcr.io/project-id/implicit-latest",
	"www.example.test:12345/repo/path",
}

var badTagNames = []string{
	"gcr.io/project-id/bad_chars:c@n'tuse",
	"gcr.io/project-id/wrong-length:white space",
	"gcr.io/project-id/too-many-chars:thisisthetagthatneverendsitgoesonandonmyfriendsomepeoplestartedtaggingitnotknowingwhatitwasandtheyllcontinuetaggingitforeverjustbecausethisisthetagthatneverends",
}

func TestNewTagStrictValidation(t *testing.T) {
	t.Parallel()

	for _, name := range goodStrictValidationTagNames {
		if tag, err := NewTag(name, StrictValidation); err != nil {
			t.Errorf("`%s` should be a valid Tag name, got error: %v", name, err)
		} else if tag.Name() != name {
			t.Errorf("`%v` .Name() should reproduce the original name. Wanted: %s Got: %s", tag, name, tag.Name())
		}
	}

	for _, name := range append(goodWeakValidationTagNames, badTagNames...) {
		if tag, err := NewTag(name, StrictValidation); err == nil {
			t.Errorf("`%s` should be an invalid Tag name, got Tag: %#v", name, tag)
		}
	}
}

func TestNewTag(t *testing.T) {
	t.Parallel()

	for _, name := range append(goodStrictValidationTagNames, goodWeakValidationTagNames...) {
		if _, err := NewTag(name, WeakValidation); err != nil {
			t.Errorf("`%s` should be a valid Tag name, got error: %v", name, err)
		}
	}

	for _, name := range badTagNames {
		if tag, err := NewTag(name, WeakValidation); err == nil {
			t.Errorf("`%s` should be an invalid Tag name, got Tag: %#v", name, tag)
		}
	}
}

func TestTagComponents(t *testing.T) {
	t.Parallel()
	testRegistry := "gcr.io"
	testRepository := "project-id/image"
	testTag := "latest"
	fullRepo := path.Join(testRegistry, testRepository)

	tagNameStr := testRegistry + "/" + testRepository + ":" + testTag
	tag, err := NewTag(tagNameStr, StrictValidation)
	if err != nil {
		t.Fatalf("`%s` should be a valid Tag name, got error: %v", tagNameStr, err)
	}

	actualRegistry := tag.RegistryStr()
	if actualRegistry != testRegistry {
		t.Errorf("RegistryStr() was incorrect for %v. Wanted: `%s` Got: `%s`", tag, testRegistry, actualRegistry)
	}
	actualRepository := tag.RepositoryStr()
	if actualRepository != testRepository {
		t.Errorf("RepositoryStr() was incorrect for %v. Wanted: `%s` Got: `%s`", tag, testRepository, actualRepository)
	}
	actualTag := tag.TagStr()
	if actualTag != testTag {
		t.Errorf("TagStr() was incorrect for %v. Wanted: `%s` Got: `%s`", tag, testTag, actualTag)
	}
	if got, want := tag.Context().String(), fullRepo; got != want {
		t.Errorf("Context.String() was incorrect for %v. Wanted: `%s` Got: `%s`", tag, want, got)
	}
	if got, want := tag.Identifier(), testTag; got != want {
		t.Errorf("Identifier() was incorrect for %v. Wanted: `%s` Got: `%s`", tag, want, got)
	}
	if got, want := tag.String(), tagNameStr; got != want {
		t.Errorf("String() was incorrect for %v. Wanted: `%s` Got: `%s`", tag, want, got)
	}
}

func TestTagScopes(t *testing.T) {
	t.Parallel()
	testRegistry := "gcr.io"
	testRepo := "project-id/image"
	testTag := "latest"
	testAction := "pull"

	expectedScope := strings.Join([]string{"repository", testRepo, testAction}, ":")

	tagNameStr := testRegistry + "/" + testRepo + ":" + testTag
	tag, err := NewTag(tagNameStr, StrictValidation)
	if err != nil {
		t.Fatalf("`%s` should be a valid Tag name, got error: %v", tagNameStr, err)
	}

	actualScope := tag.Scope(testAction)
	if actualScope != expectedScope {
		t.Errorf("scope was incorrect for %v. Wanted: `%s` Got: `%s`", tag, expectedScope, actualScope)
	}
}

func TestAllDefaults(t *testing.T) {
	tagNameStr := "ubuntu"
	tag, err := NewTag(tagNameStr, WeakValidation)
	if err != nil {
		t.Fatalf("`%s` should be a valid Tag name, got error: %v", tagNameStr, err)
	}

	expectedName := "index.docker.io/library/ubuntu:latest"
	actualName := tag.Name()
	if actualName != expectedName {
		t.Errorf("Name() was incorrect for %v. Wanted: `%s` Got: `%s`", tag, expectedName, actualName)
	}
}

func TestOverrideDefault(t *testing.T) {
	tagNameStr := "ubuntu"
	tag, err := NewTag(tagNameStr, WeakValidation, WithDefaultTag("other"))
	if err != nil {
		t.Fatalf("`%s` should be a valid Tag name, got error: %v", tagNameStr, err)
	}

	expectedName := "index.docker.io/library/ubuntu:other"
	actualName := tag.Name()
	if actualName != expectedName {
		t.Errorf("Name() was incorrect for %v. Wanted: `%s` Got: `%s`", tag, expectedName, actualName)
	}
}
