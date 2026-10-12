/*
Copyright 2026 sealos.

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
	"context"
	"strings"
	"testing"

	"github.com/labring/sealos/controllers/user/controllers/helper/config"
	"github.com/prometheus/client_golang/prometheus/testutil"
	admissionv1 "k8s.io/api/admission/v1"
	authenticationv1 "k8s.io/api/authentication/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

func TestNamespaceValidator(t *testing.T) {
	const (
		namespaceName  = "ns-webhook-test"
		serviceAccount = "system:serviceaccount:user-system:test-user"
	)
	requestContext := admission.NewContextWithRequest(
		context.Background(),
		admission.Request{AdmissionRequest: admissionv1.AdmissionRequest{
			UserInfo: authenticationv1.UserInfo{Username: serviceAccount},
		}},
	)

	t.Run("rejects create with a missing label and records the request", func(t *testing.T) {
		namespaceMissingLabels.DeleteLabelValues(namespaceName, serviceAccount)
		t.Cleanup(func() {
			namespaceMissingLabels.DeleteLabelValues(namespaceName, serviceAccount)
		})

		labels := config.SetPodSecurity(map[string]string{})
		delete(labels, config.PodSecurityLabelPrefix+"audit")
		namespace := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{
			Name:   namespaceName,
			Labels: labels,
		}}

		_, err := (&NamespaceValidator{}).ValidateCreate(requestContext, namespace)
		if err == nil || !strings.Contains(err.Error(), "audit=restricted") {
			t.Fatalf("expected missing audit label error, got %v", err)
		}
		if value := testutil.ToFloat64(
			namespaceMissingLabels.WithLabelValues(namespaceName, serviceAccount),
		); value != 1 {
			t.Fatalf("expected missing label metric value 1, got %v", value)
		}
	})

	t.Run("rejects update with an invalid label value", func(t *testing.T) {
		namespaceMissingLabels.DeleteLabelValues(namespaceName, serviceAccount)
		t.Cleanup(func() {
			namespaceMissingLabels.DeleteLabelValues(namespaceName, serviceAccount)
		})

		labels := config.SetPodSecurity(map[string]string{})
		labels[config.PodSecurityLabelPrefix+"enforce"] = "privileged"
		oldNamespace := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{
			Name:   namespaceName,
			Labels: config.SetPodSecurity(map[string]string{}),
		}}
		newNamespace := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{
			Name:   namespaceName,
			Labels: labels,
		}}

		_, err := (&NamespaceValidator{}).
			ValidateUpdate(requestContext, oldNamespace, newNamespace)
		if err == nil || !strings.Contains(err.Error(), "enforce=baseline") {
			t.Fatalf("expected invalid enforce label error, got %v", err)
		}
	})

	t.Run("allows a user namespace with all required labels", func(t *testing.T) {
		namespace := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{
			Name:   namespaceName,
			Labels: config.SetPodSecurity(map[string]string{}),
		}}

		if _, err := (&NamespaceValidator{}).ValidateCreate(requestContext, namespace); err != nil {
			t.Fatalf("expected namespace to be allowed, got %v", err)
		}
	})

	t.Run("allows namespaces outside the user namespace prefix", func(t *testing.T) {
		namespace := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "kube-system"}}

		if _, err := (&NamespaceValidator{}).ValidateCreate(requestContext, namespace); err != nil {
			t.Fatalf("expected non-user namespace to be allowed, got %v", err)
		}
	})

	t.Run("honors strict PSA and legacy admin compatibility settings", func(t *testing.T) {
		namespace := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: namespaceName}}
		if _, err := (&NamespaceValidator{Disabled: true}).
			ValidateCreate(requestContext, namespace); err != nil {
			t.Fatalf("expected disabled validation to allow namespace, got %v", err)
		}

		adminNamespace := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{
			Name: config.GetUsersNamespace(adminUserName),
		}}
		if _, err := (&NamespaceValidator{EnableAdminClusterAdmin: true}).
			ValidateCreate(requestContext, adminNamespace); err != nil {
			t.Fatalf("expected legacy admin namespace to be allowed, got %v", err)
		}
	})
}
