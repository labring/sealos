package dao

import (
	"fmt"
	"net/mail"
	"sort"
	"strings"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/helper"
)

type adminNotificationNamespaceRow struct {
	Namespace string    `gorm:"column:namespace"`
	UserUID   uuid.UUID `gorm:"column:user_uid"`
}

type adminNotificationContactSources struct {
	OauthProviders       helper.AdminNotificationContacts
	NotificationContacts helper.AdminNotificationContacts
}

// ListAdminNotificationRecipients returns notification contacts for workspace owners.
// It intentionally does not evaluate account balances or subscription status.
func (g *Cockroach) ListAdminNotificationRecipients(
	req helper.AdminNotificationRecipientsReq,
) (helper.AdminNotificationRecipientsResp, error) {
	rows, err := g.listAdminNotificationNamespaces(req.Namespaces)
	if err != nil {
		return helper.AdminNotificationRecipientsResp{}, err
	}

	userUIDs := make([]uuid.UUID, 0, len(rows))
	seenUserUIDs := make(map[uuid.UUID]struct{}, len(rows))
	for _, row := range rows {
		if row.UserUID == uuid.Nil {
			continue
		}
		if _, ok := seenUserUIDs[row.UserUID]; ok {
			continue
		}
		seenUserUIDs[row.UserUID] = struct{}{}
		userUIDs = append(userUIDs, row.UserUID)
	}

	var providers []types.OauthProvider
	var alertAccounts []types.UserAlertNotificationAccount
	if len(userUIDs) > 0 {
		db := g.ck.GetGlobalDB()
		if err := db.Where(`"userUid" IN ?`, userUIDs).Find(&providers).Error; err != nil {
			return helper.AdminNotificationRecipientsResp{}, fmt.Errorf(
				"failed to list oauth providers for notification recipients: %w", err,
			)
		}
		if err := db.Where(`"user_uid" IN ? AND "is_enabled" = ?`, userUIDs, true).
			Find(&alertAccounts).Error; err != nil {
			return helper.AdminNotificationRecipientsResp{}, fmt.Errorf(
				"failed to list notification contacts: %w", err,
			)
		}
	}

	return buildAdminNotificationRecipients(
		req.Namespaces,
		rows,
		providers,
		alertAccounts,
		req.NotificationMethods,
	), nil
}

func (g *Cockroach) listAdminNotificationNamespaces(
	namespaces []string,
) ([]adminNotificationNamespaceRow, error) {
	var rows []adminNotificationNamespaceRow
	err := g.ck.GetLocalDB().Table(`"Workspace"`).
		Select(`"Workspace"."id" AS namespace, "UserCr"."userUid" AS user_uid`).
		Joins(`JOIN "UserWorkspace" ON "Workspace".uid = "UserWorkspace"."workspaceUid"`).
		Joins(`JOIN "UserCr" ON "UserWorkspace"."userCrUid" = "UserCr".uid`).
		Where(`"Workspace"."id" IN ?`, namespaces).
		Where(`"UserWorkspace"."role" = ?`, "OWNER").
		Find(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to resolve notification namespaces: %w", err)
	}
	return rows, nil
}

func buildAdminNotificationRecipients(
	namespaces []string,
	rows []adminNotificationNamespaceRow,
	providers []types.OauthProvider,
	alertAccounts []types.UserAlertNotificationAccount,
	methods []string,
) helper.AdminNotificationRecipientsResp {
	if len(methods) == 0 {
		methods = []string{helper.NotificationMethodEmail}
	}
	methodSet := make(map[string]struct{}, len(methods))
	for _, method := range methods {
		methodSet[method] = struct{}{}
	}

	contactsByUser := make(map[uuid.UUID]*adminNotificationContactSources)
	for _, provider := range providers {
		method := notificationMethod(provider.ProviderType)
		if !notificationMethodRequested(method, methodSet) {
			continue
		}
		sources := contactsByUser[provider.UserUID]
		if sources == nil {
			sources = &adminNotificationContactSources{}
			contactsByUser[provider.UserUID] = sources
		}
		addAdminNotificationContact(&sources.OauthProviders, method, provider.ProviderID)
	}
	for _, account := range alertAccounts {
		if !account.IsEnabled {
			continue
		}
		method := notificationMethod(account.ProviderType)
		if !notificationMethodRequested(method, methodSet) {
			continue
		}
		sources := contactsByUser[account.UserUID]
		if sources == nil {
			sources = &adminNotificationContactSources{}
			contactsByUser[account.UserUID] = sources
		}
		addAdminNotificationContact(&sources.NotificationContacts, method, account.ProviderID)
	}

	rowByNamespace := make(map[string]adminNotificationNamespaceRow, len(rows))
	for _, row := range rows {
		rowByNamespace[row.Namespace] = row
	}
	result := helper.AdminNotificationRecipientsResp{
		Recipients:             make([]helper.AdminNotificationRecipient, 0),
		Users:                  make([]helper.AdminNotificationUser, 0, len(namespaces)),
		UnresolvedNamespaces:   make([]string, 0),
		UsersWithoutRecipients: make([]string, 0),
	}
	seenRecipients := make(map[string]struct{})

	for _, namespace := range namespaces {
		row, ok := rowByNamespace[namespace]
		if !ok || row.UserUID == uuid.Nil {
			result.UnresolvedNamespaces = append(result.UnresolvedNamespaces, namespace)
			continue
		}

		sources := contactsByUser[row.UserUID]
		if sources == nil {
			sources = &adminNotificationContactSources{}
		}
		user := helper.AdminNotificationUser{
			Namespace:            namespace,
			UserUID:              row.UserUID,
			OauthProviders:       sources.OauthProviders,
			NotificationContacts: sources.NotificationContacts,
		}
		initializeAdminNotificationContacts(&user.OauthProviders)
		initializeAdminNotificationContacts(&user.NotificationContacts)
		result.Users = append(result.Users, user)

		userRecipientCount := 0
		for _, contact := range adminNotificationContactsForMethods(sources, methods) {
			userRecipientCount++
			key := contact.Type + "\x00" + contact.Value
			if _, exists := seenRecipients[key]; exists {
				continue
			}
			seenRecipients[key] = struct{}{}
			result.Recipients = append(result.Recipients, contact)
		}
		if userRecipientCount == 0 {
			result.UsersWithoutRecipients = append(result.UsersWithoutRecipients, namespace)
		}
	}

	return result
}

func notificationMethod(providerType types.OauthProviderType) string {
	switch providerType {
	case types.OauthProviderTypeEmail:
		return helper.NotificationMethodEmail
	case types.OauthProviderTypePhone:
		return helper.NotificationMethodPhone
	default:
		return ""
	}
}

func notificationMethodRequested(method string, methods map[string]struct{}) bool {
	if method == "" {
		return false
	}
	_, ok := methods[method]
	return ok
}

func addAdminNotificationContact(
	contacts *helper.AdminNotificationContacts,
	method, value string,
) {
	value = strings.TrimSpace(value)
	if value == "" {
		return
	}
	if method == helper.NotificationMethodEmail {
		value = strings.ToLower(value)
		parsed, err := mail.ParseAddress(value)
		if err != nil || parsed.Address != value {
			return
		}
		if !containsString(contacts.Emails, value) {
			contacts.Emails = append(contacts.Emails, value)
		}
		return
	}
	if method == helper.NotificationMethodPhone && !containsString(contacts.PhoneNumbers, value) {
		contacts.PhoneNumbers = append(contacts.PhoneNumbers, value)
	}
}

func initializeAdminNotificationContacts(contacts *helper.AdminNotificationContacts) {
	if contacts.Emails == nil {
		contacts.Emails = []string{}
	}
	if contacts.PhoneNumbers == nil {
		contacts.PhoneNumbers = []string{}
	}
	sort.Strings(contacts.Emails)
	sort.Strings(contacts.PhoneNumbers)
}

func adminNotificationContactsForMethods(
	sources *adminNotificationContactSources,
	methods []string,
) []helper.AdminNotificationRecipient {
	contacts := make([]helper.AdminNotificationRecipient, 0)
	for _, method := range methods {
		var values []string
		switch method {
		case helper.NotificationMethodEmail:
			values = append(values, sources.OauthProviders.Emails...)
			values = append(values, sources.NotificationContacts.Emails...)
		case helper.NotificationMethodPhone:
			values = append(values, sources.OauthProviders.PhoneNumbers...)
			values = append(values, sources.NotificationContacts.PhoneNumbers...)
		}
		seen := make(map[string]struct{}, len(values))
		for _, value := range values {
			if _, ok := seen[value]; ok {
				continue
			}
			seen[value] = struct{}{}
			contacts = append(contacts, helper.AdminNotificationRecipient{Type: method, Value: value})
		}
	}
	return contacts
}

func containsString(values []string, value string) bool {
	for _, item := range values {
		if item == value {
			return true
		}
	}
	return false
}
