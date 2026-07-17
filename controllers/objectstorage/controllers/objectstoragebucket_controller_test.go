/*
Copyright 2023.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package controllers

import (
	"encoding/json"
	"testing"
)

type policyDocument struct {
	Statement []policyStatement `json:"Statement"`
}

type policyStatement struct {
	Action   []string `json:"Action"`
	Resource []string `json:"Resource"`
}

func TestBuildPolicyPublicReadDoesNotAllowAnonymousList(t *testing.T) {
	t.Parallel()

	policy := mustParsePolicy(t, buildPolicy(PublicReadBucketPolicy, "test-bucket"))
	actions := collectActions(policy)

	assertHasAction(t, actions, "s3:GetObject")
	assertNoAction(t, actions, "s3:ListBucket")
	assertNoAction(t, actions, "s3:DeleteObject")
}

func TestBuildPolicyPublicReadwriteAllowsAnonymousListAndObjectWrites(t *testing.T) {
	t.Parallel()

	policy := mustParsePolicy(t, buildPolicy(PublicReadwriteBucketPolicy, "test-bucket"))
	actions := collectActions(policy)

	assertHasAction(t, actions, "s3:GetBucketLocation")
	assertHasAction(t, actions, "s3:ListBucket")
	assertHasAction(t, actions, "s3:ListBucketMultipartUploads")
	assertHasAction(t, actions, "s3:GetObject")
	assertHasAction(t, actions, "s3:PutObject")
	assertHasAction(t, actions, "s3:DeleteObject")
	assertHasAction(t, actions, "s3:AbortMultipartUpload")
	assertHasAction(t, actions, "s3:ListMultipartUploadParts")
}

func TestBuildPolicyBucketServiceAccountSeparatesBucketAndObjectResources(t *testing.T) {
	t.Parallel()

	const bucketName = "test-bucket"

	policy := mustParsePolicy(t, buildPolicy(BucketServiceAccountPolicy, bucketName))
	if len(policy.Statement) != 2 {
		t.Fatalf("expected 2 statements, got %d", len(policy.Statement))
	}

	bucketStatement := policy.Statement[0]
	assertResources(t, bucketStatement.Resource, "arn:aws:s3:::"+bucketName)
	assertHasAction(t, actionSet(bucketStatement.Action), "s3:ListBucket")
	assertHasAction(t, actionSet(bucketStatement.Action), "s3:GetBucketLocation")
	assertNoAction(t, actionSet(bucketStatement.Action), "s3:GetObject")

	objectStatement := policy.Statement[1]
	assertResources(t, objectStatement.Resource, "arn:aws:s3:::"+bucketName+"/*")
	assertHasAction(t, actionSet(objectStatement.Action), "s3:GetObject")
	assertHasAction(t, actionSet(objectStatement.Action), "s3:PutObject")
	assertHasAction(t, actionSet(objectStatement.Action), "s3:DeleteObject")
	assertNoAction(t, actionSet(objectStatement.Action), "s3:ListBucket")
}

func mustParsePolicy(t *testing.T, raw string) policyDocument {
	t.Helper()

	var policy policyDocument
	if err := json.Unmarshal([]byte(raw), &policy); err != nil {
		t.Fatalf("policy is invalid JSON: %v", err)
	}
	return policy
}

func collectActions(policy policyDocument) map[string]struct{} {
	actions := map[string]struct{}{}
	for _, statement := range policy.Statement {
		for _, action := range statement.Action {
			actions[action] = struct{}{}
		}
	}
	return actions
}

func actionSet(actions []string) map[string]struct{} {
	actionMap := map[string]struct{}{}
	for _, action := range actions {
		actionMap[action] = struct{}{}
	}
	return actionMap
}

func assertHasAction(t *testing.T, actions map[string]struct{}, action string) {
	t.Helper()

	if _, ok := actions[action]; !ok {
		t.Fatalf("expected action %q", action)
	}
}

func assertNoAction(t *testing.T, actions map[string]struct{}, action string) {
	t.Helper()

	if _, ok := actions[action]; ok {
		t.Fatalf("did not expect action %q", action)
	}
}

func assertResources(t *testing.T, resources []string, want string) {
	t.Helper()

	if len(resources) != 1 || resources[0] != want {
		t.Fatalf("expected resources [%q], got %v", want, resources)
	}
}
