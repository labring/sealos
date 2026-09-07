package dao

import (
	"testing"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/helper"
)

func TestBuildAdminNotificationRecipients(t *testing.T) {
	userA := uuid.New()
	userB := uuid.New()
	result := buildAdminNotificationRecipients(
		[]string{"ns-a", "ns-b", "ns-missing"},
		[]adminNotificationNamespaceRow{
			{Namespace: "ns-a", UserUID: userA},
			{Namespace: "ns-b", UserUID: userB},
		},
		[]types.OauthProvider{
			{
				UserUID:      userA,
				ProviderType: types.OauthProviderTypeEmail,
				ProviderID:   " OAuth@Example.com ",
			},
			{UserUID: userA, ProviderType: types.OauthProviderTypePhone, ProviderID: "+1-555-0001"},
			{
				UserUID:      userB,
				ProviderType: types.OauthProviderTypeEmail,
				ProviderID:   "oauth@example.com",
			},
		},
		[]types.UserAlertNotificationAccount{
			{
				UserUID:      userA,
				ProviderType: types.OauthProviderTypeEmail,
				ProviderID:   "oauth@example.com",
				IsEnabled:    true,
			},
			{
				UserUID:      userA,
				ProviderType: types.OauthProviderTypeEmail,
				ProviderID:   "notify@example.com",
				IsEnabled:    true,
			},
			{
				UserUID:      userA,
				ProviderType: types.OauthProviderTypePhone,
				ProviderID:   "+1-555-0002",
				IsEnabled:    true,
			},
			{
				UserUID:      userA,
				ProviderType: types.OauthProviderTypeEmail,
				ProviderID:   "disabled@example.com",
				IsEnabled:    false,
			},
		},
		[]string{helper.NotificationMethodEmail, helper.NotificationMethodPhone},
	)

	if len(result.UnresolvedNamespaces) != 1 || result.UnresolvedNamespaces[0] != "ns-missing" {
		t.Fatalf("unresolved namespaces = %v, want [ns-missing]", result.UnresolvedNamespaces)
	}
	if len(result.Users) != 2 {
		t.Fatalf("users = %d, want 2", len(result.Users))
	}
	if len(result.NamespacesWithoutRecipients) != 0 {
		t.Fatalf(
			"namespaces without recipients = %v, want empty",
			result.NamespacesWithoutRecipients,
		)
	}

	user := result.Users[0]
	if user.OauthProviders.Emails[0] != "oauth@example.com" ||
		len(user.OauthProviders.PhoneNumbers) != 1 ||
		len(user.NotificationContacts.Emails) != 2 ||
		user.NotificationContacts.Emails[0] != "notify@example.com" ||
		user.NotificationContacts.Emails[1] != "oauth@example.com" ||
		len(user.NotificationContacts.PhoneNumbers) != 1 {
		t.Fatalf("user contact sources = %+v", user)
	}

	if len(result.Recipients) != 4 {
		t.Fatalf("recipients = %+v, want 4 unique recipients", result.Recipients)
	}
	want := []helper.AdminNotificationRecipient{
		{Type: helper.NotificationMethodEmail, Value: "oauth@example.com"},
		{Type: helper.NotificationMethodEmail, Value: "notify@example.com"},
		{Type: helper.NotificationMethodPhone, Value: "+1-555-0001"},
		{Type: helper.NotificationMethodPhone, Value: "+1-555-0002"},
	}
	for i := range want {
		if result.Recipients[i] != want[i] {
			t.Fatalf("recipient[%d] = %+v, want %+v", i, result.Recipients[i], want[i])
		}
	}
}

func TestBuildAdminNotificationRecipientsWithoutContacts(t *testing.T) {
	userUID := uuid.New()
	result := buildAdminNotificationRecipients(
		[]string{"ns-empty"},
		[]adminNotificationNamespaceRow{{Namespace: "ns-empty", UserUID: userUID}},
		nil,
		nil,
		[]string{helper.NotificationMethodEmail},
	)

	if len(result.Recipients) != 0 {
		t.Fatalf("recipients = %+v, want empty", result.Recipients)
	}
	if len(result.NamespacesWithoutRecipients) != 1 ||
		result.NamespacesWithoutRecipients[0] != "ns-empty" {
		t.Fatalf(
			"namespaces without recipients = %v, want [ns-empty]",
			result.NamespacesWithoutRecipients,
		)
	}
}

func TestBuildAdminNotificationRecipientsWithAmbiguousOwner(t *testing.T) {
	ownerA := uuid.New()
	ownerB := uuid.New()
	result := buildAdminNotificationRecipients(
		[]string{"ns-ambiguous", "ns-duplicate"},
		[]adminNotificationNamespaceRow{
			{Namespace: "ns-ambiguous", UserUID: ownerA},
			{Namespace: "ns-ambiguous", UserUID: ownerB},
			{Namespace: "ns-duplicate", UserUID: ownerA},
			{Namespace: "ns-duplicate", UserUID: ownerA},
		},
		[]types.OauthProvider{
			{
				UserUID:      ownerA,
				ProviderType: types.OauthProviderTypeEmail,
				ProviderID:   "owner@example.com",
			},
			{
				UserUID:      ownerB,
				ProviderType: types.OauthProviderTypeEmail,
				ProviderID:   "other@example.com",
			},
		},
		nil,
		[]string{helper.NotificationMethodEmail},
	)

	if len(result.UnresolvedNamespaces) != 1 || result.UnresolvedNamespaces[0] != "ns-ambiguous" {
		t.Fatalf("unresolved namespaces = %v, want [ns-ambiguous]", result.UnresolvedNamespaces)
	}
	if len(result.Users) != 1 || result.Users[0].Namespace != "ns-duplicate" ||
		result.Users[0].UserUID != ownerA {
		t.Fatalf("users = %+v, want one user for ns-duplicate owned by ownerA", result.Users)
	}
	if len(result.Recipients) != 1 || result.Recipients[0].Value != "owner@example.com" {
		t.Fatalf("recipients = %+v, want only owner@example.com", result.Recipients)
	}
}
