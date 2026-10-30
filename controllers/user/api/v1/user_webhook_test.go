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

package v1

import (
	"context"
	"strings"
	"testing"

	"github.com/labring/sealos/controllers/user/pkg/reserved"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func webhookTestUser(name string) *User {
	return &User{
		ObjectMeta: metav1.ObjectMeta{Name: name},
		Spec:       UserSpec{CSRExpirationSeconds: DefaultCSRExpirationSeconds},
	}
}

func TestValidateCreateRejectsReservedUserNames(t *testing.T) {
	reserved.SetExtraNames([]string{"front-desktop"})
	t.Cleanup(func() { reserved.SetExtraNames(nil) })

	validator := &User{}
	for _, name := range []string{
		reserved.ControllerServiceAccount,
		reserved.DefaultServiceAccount,
		"front-desktop",
	} {
		_, err := validator.ValidateCreate(context.Background(), webhookTestUser(name))
		if err == nil {
			t.Fatalf("reserved user name %q was accepted", name)
		}
		if !strings.Contains(err.Error(), "reserved") {
			t.Fatalf("reserved user name %q returned unexpected error: %v", name, err)
		}
	}

	// Ordinary names must not be rejected as reserved. The webhook suite runs
	// without a user counter here, so validation stops with the counter error.
	_, err := validator.ValidateCreate(context.Background(), webhookTestUser("alice"))
	if err == nil || strings.Contains(err.Error(), "reserved") {
		t.Fatalf("ordinary user name was rejected: %v", err)
	}
}

func TestValidateReservedUserNameMessageIncludesIdentity(t *testing.T) {
	err := validateReservedUserName(reserved.ControllerServiceAccount)
	if err == nil {
		t.Fatal("controller service account name was not reserved")
	}
	for _, fragment := range []string{
		reserved.ControllerServiceAccount,
		"user-system/" + reserved.ControllerServiceAccount,
	} {
		if !strings.Contains(err.Error(), fragment) {
			t.Fatalf("reserved name error missing %q: %v", fragment, err)
		}
	}
	if validateReservedUserName("alice") != nil {
		t.Fatal("ordinary user name was rejected")
	}
}
