package services

import (
	"testing"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
)

func TestBuildURLsAppendsDeclaredPayApp(t *testing.T) {
	service := &StripeService{Domain: "https://example.com"}
	transaction := &types.WorkspaceSubscriptionTransaction{
		ID:        uuid.MustParse("11111111-2222-3333-4444-555555555555"),
		PayID:     "pay-123",
		Workspace: "ns-demo",
	}

	successURL, cancelURL := buildURLs(service, transaction, types.PayAppBrain)

	if want := "https://example.com/?payId=pay-123&workspaceId=ns-demo&transactionId=11111111-2222-3333-4444-555555555555&stripeState=success&app=system-brain"; successURL != want {
		t.Fatalf("success URL = %q, want %q", successURL, want)
	}
	if want := "https://example.com/?payId=pay-123&workspaceId=ns-demo&transactionId=11111111-2222-3333-4444-555555555555&stripeState=cancel&app=system-brain"; cancelURL != want {
		t.Fatalf("cancel URL = %q, want %q", cancelURL, want)
	}
}

func TestBuildURLsPreservesExistingURLsWithoutPayApp(t *testing.T) {
	service := &StripeService{Domain: "https://example.com"}
	transaction := &types.WorkspaceSubscriptionTransaction{
		ID:        uuid.MustParse("11111111-2222-3333-4444-555555555555"),
		PayID:     "pay-123",
		Workspace: "ns-demo",
	}

	successURL, cancelURL := buildURLs(service, transaction, "")

	if want := "https://example.com/?payId=pay-123&workspaceId=ns-demo&transactionId=11111111-2222-3333-4444-555555555555&stripeState=success"; successURL != want {
		t.Fatalf("success URL = %q, want %q", successURL, want)
	}
	if want := "https://example.com/?payId=pay-123&workspaceId=ns-demo&transactionId=11111111-2222-3333-4444-555555555555&stripeState=cancel"; cancelURL != want {
		t.Fatalf("cancel URL = %q, want %q", cancelURL, want)
	}
}
