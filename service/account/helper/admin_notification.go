package helper

import (
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	NotificationMethodEmail = "email"
	NotificationMethodPhone = "phone"
)

// AdminNotificationRecipientsReq requests notification contacts for workspace owners.
// notificationMethods defaults to email when omitted.
type AdminNotificationRecipientsReq struct {
	Namespaces          []string `json:"namespaces" binding:"required"`
	NotificationMethods []string `json:"notificationMethods"`
}

func ParseAdminNotificationRecipientsReq(c *gin.Context) (*AdminNotificationRecipientsReq, error) {
	var req AdminNotificationRecipientsReq
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, fmt.Errorf("failed to bind request: %w", err)
	}

	namespaces := make([]string, 0, len(req.Namespaces))
	seenNamespaces := make(map[string]struct{}, len(req.Namespaces))
	for _, namespace := range req.Namespaces {
		namespace = strings.TrimSpace(namespace)
		if namespace == "" {
			return nil, fmt.Errorf("namespaces must not contain empty values")
		}
		if _, ok := seenNamespaces[namespace]; ok {
			continue
		}
		seenNamespaces[namespace] = struct{}{}
		namespaces = append(namespaces, namespace)
	}
	if len(namespaces) == 0 {
		return nil, fmt.Errorf("namespaces must contain at least one value")
	}
	if len(namespaces) > 1000 {
		return nil, fmt.Errorf("namespaces must contain at most 1000 values")
	}

	methods := req.NotificationMethods
	if len(methods) == 0 {
		methods = []string{NotificationMethodEmail}
	}
	normalizedMethods := make([]string, 0, len(methods))
	seenMethods := make(map[string]struct{}, len(methods))
	for _, method := range methods {
		method = strings.ToLower(strings.TrimSpace(method))
		if method != NotificationMethodEmail && method != NotificationMethodPhone {
			return nil, fmt.Errorf("unsupported notification method %q", method)
		}
		if _, ok := seenMethods[method]; ok {
			continue
		}
		seenMethods[method] = struct{}{}
		normalizedMethods = append(normalizedMethods, method)
	}

	req.Namespaces = namespaces
	req.NotificationMethods = normalizedMethods
	return &req, nil
}

type AdminNotificationRecipient struct {
	Type  string `json:"type"`
	Value string `json:"value"`
}

type AdminNotificationContacts struct {
	Emails       []string `json:"emails"`
	PhoneNumbers []string `json:"phoneNumbers"`
}

type AdminNotificationUser struct {
	Namespace            string                    `json:"namespace"`
	UserUID              uuid.UUID                 `json:"userUid"`
	OauthProviders       AdminNotificationContacts `json:"oauthProviders"`
	NotificationContacts AdminNotificationContacts `json:"notificationContacts"`
}

type AdminNotificationRecipientsResp struct {
	Recipients             []AdminNotificationRecipient `json:"recipients"`
	Users                  []AdminNotificationUser      `json:"users"`
	UnresolvedNamespaces   []string                     `json:"unresolvedNamespaces"`
	UsersWithoutRecipients []string                     `json:"usersWithoutRecipients"`
}
