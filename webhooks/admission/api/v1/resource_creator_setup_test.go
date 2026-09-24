// Copyright © 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package v1

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	admissionv1 "k8s.io/api/admission/v1"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/webhook"
)

// Embed the unused manager methods; registration must only need the shared
// webhook server and direct reader, not a running cache or optional CRD schemes.
type creatorTestManager struct {
	ctrl.Manager
	server webhook.Server
}

func (m *creatorTestManager) GetWebhookServer() webhook.Server { return m.server }
func (m *creatorTestManager) GetAPIReader() client.Reader      { return nil }

func TestResourceCreatorSharedServer(t *testing.T) {
	server := webhook.NewServer(webhook.Options{})
	if err := (&ResourceCreator{}).SetupWithManager(&creatorTestManager{server: server}); err != nil {
		t.Fatal(err)
	}
	obj := creatorObject("devbox.sealos.io/v1alpha2", "Devbox")
	req := creatorRequest(t, obj, nil, "system:serviceaccount:user-system:alice")
	body, err := json.Marshal(admissionv1.AdmissionReview{Request: &req.AdmissionRequest})
	if err != nil {
		t.Fatal(err)
	}
	for _, path := range []string{"/mutate-resource-creator", "/validate-resource-creator"} {
		t.Run(path, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(body))
			request.Header.Set("Content-Type", "application/json")
			response := httptest.NewRecorder()
			server.WebhookMux().ServeHTTP(response, request)
			var review admissionv1.AdmissionReview
			if err := json.Unmarshal(response.Body.Bytes(), &review); err != nil {
				t.Fatal(err)
			}
			if response.Code != http.StatusOK || review.Response == nil {
				t.Fatalf("unexpected response: %s", response.Body.String())
			}
			if path == "/mutate-resource-creator" {
				if !review.Response.Allowed || len(review.Response.Patch) == 0 {
					t.Fatalf("expected creator patch: %+v", review.Response)
				}
				if !bytes.Contains(review.Response.Patch, []byte("alice")) {
					t.Fatalf("default user namespace was not recognized: %s", review.Response.Patch)
				}
			} else if review.Response.Allowed {
				t.Fatal("validator accepted a create without managed creator annotations")
			}
		})
	}
}
