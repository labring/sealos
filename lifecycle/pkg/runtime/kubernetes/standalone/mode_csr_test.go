// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package standalone

import (
	"context"
	"errors"
	"testing"

	certificatesv1 "k8s.io/api/certificates/v1"
	v1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes/fake"
	clienttesting "k8s.io/client-go/testing"
)

func TestApproveKubeletCSRConcurrentApproval(t *testing.T) {
	request := &certificatesv1.CertificateSigningRequest{
		ObjectMeta: metav1.ObjectMeta{Name: "kubelet", UID: "original"},
	}
	client := fake.NewSimpleClientset(request)
	attempts := 0
	client.PrependReactor(
		"update",
		"certificatesigningrequests",
		func(action clienttesting.Action) (bool, runtime.Object, error) {
			if action.GetSubresource() != "approval" {
				t.Fatalf("unexpected update subresource: %s", action.GetSubresource())
			}
			attempts++
			// A concurrent approver wins the race before our UpdateApproval.
			approved := request.DeepCopy()
			approved.Status.Conditions = []certificatesv1.CertificateSigningRequestCondition{{
				Type: certificatesv1.CertificateApproved, Status: v1.ConditionTrue,
			}}
			resource := certificatesv1.SchemeGroupVersion.WithResource("certificatesigningrequests")
			if err := client.Tracker().Update(resource, approved, ""); err != nil {
				t.Fatal(err)
			}
			return true, nil, apierrors.NewConflict(
				schema.GroupResource{Resource: "certificatesigningrequests"},
				request.Name,
				errors.New("concurrent approval"),
			)
		},
	)
	m := &modeSwitch{client: client}
	if err := m.approveKubeletCSR(context.Background(), request); err != nil {
		t.Fatal(err)
	}
	if attempts != 1 {
		t.Fatalf("already approved CSR was updated again: %d attempts", attempts)
	}
}

func TestApproveKubeletCSRRejectsReplacementAndDenial(t *testing.T) {
	for _, test := range []struct {
		name      string
		replaced  bool
		condition certificatesv1.RequestConditionType
	}{
		{name: "replacement", replaced: true},
		{name: "denied", condition: certificatesv1.CertificateDenied},
		{name: "failed", condition: certificatesv1.CertificateFailed},
	} {
		t.Run(test.name, func(t *testing.T) {
			request := &certificatesv1.CertificateSigningRequest{
				ObjectMeta: metav1.ObjectMeta{Name: "kubelet", UID: "original"},
			}
			current := request.DeepCopy()
			if test.replaced {
				current.UID = "replacement"
			} else {
				current.Status.Conditions = []certificatesv1.CertificateSigningRequestCondition{{
					Type: test.condition, Status: v1.ConditionTrue,
				}}
			}
			client := fake.NewSimpleClientset(current)
			m := &modeSwitch{client: client}
			if err := m.approveKubeletCSR(context.Background(), request); err == nil {
				t.Fatal("approved a replaced or rejected CSR")
			}
			for _, action := range client.Actions() {
				if action.GetVerb() != "get" {
					t.Fatalf("unexpected mutation: %s", action.GetVerb())
				}
			}
		})
	}
}
