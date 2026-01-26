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

package controller

import (
	"context"
	"fmt"
	"time"

	"github.com/go-logr/logr"
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	"github.com/labring/sealos/controllers/pkg/notification/api/v1"
	"github.com/labring/sealos/controllers/user/pkg/licensegate"
	"github.com/labring/sealos/controllers/user/pkg/usercount"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

const (
	// License notification name prefixes
	licenseExpiredPrefix  = "license-expired"
	licenseUserLimitPrefix = "license-user-limit"
	licenseExpiringPrefix  = "license-expiring-soon"

	// Notification labels
	readStatusLabel = "isRead"
	falseStatus     = "false"
	trueStatus      = "true"

	// Notification constants
	fromEn     = "License-System"
	fromZh     = "许可证系统"
	languageZh = "zh"

	// Threshold for expiring soon warning (7 days)
	expiringSoonThreshold = 7 * 24 * time.Hour

	// Target namespace for admin notifications
	adminNamespace = "ns-admin"
)

// LicenseNotifier handles license notifications
type LicenseNotifier struct {
	client.Client
	Logger logr.Logger
}

// NotifyIfNeeded checks license status and sends notifications if needed
func (r *LicenseReconciler) NotifyIfNeeded(ctx context.Context, license *licensev1.License) error {
	notifier := &LicenseNotifier{
		Client: r.Client,
		Logger: r.Logger,
	}

	// Check if we need to send notifications
	if err := notifier.checkLicenseStatus(ctx, license); err != nil {
		r.Logger.Error(err, "failed to check license status for notification")
		return err
	}

	return nil
}

// checkLicenseStatus evaluates the license and sends appropriate notifications
func (n *LicenseNotifier) checkLicenseStatus(ctx context.Context, license *licensev1.License) error {
	// Skip default license - don't send notifications for it
	if isDefaultLicense(license) {
		return nil
	}

	// Check if ns-admin namespace exists
	if !n.namespaceExists(ctx, adminNamespace) {
		n.Logger.V(1).Info("admin namespace does not exist, skipping license notification", "namespace", adminNamespace)
		return nil
	}

	// Check license expiration
	if err := n.checkLicenseExpiration(ctx, license); err != nil {
		return fmt.Errorf("failed to check license expiration: %w", err)
	}

	// Check user limit
	if err := n.checkUserLimit(ctx, license); err != nil {
		return fmt.Errorf("failed to check user limit: %w", err)
	}

	return nil
}

// checkLicenseExpiration sends notifications for expired or expiring licenses
func (n *LicenseNotifier) checkLicenseExpiration(ctx context.Context, license *licensev1.License) error {
	if license.Status.ExpirationTime.IsZero() {
		return nil
	}

	now := time.Now()
	expirationTime := license.Status.ExpirationTime.Time
	timeUntilExpiration := expirationTime.Sub(now)

	var notificationType string
	var titleEn, titleZh, messageEn, messageZh string

	// Determine if license is expired or expiring soon
	if timeUntilExpiration <= 0 {
		// License has expired
		if license.Status.Phase == licensev1.LicenseStatusPhaseExpired {
			notificationType = licenseExpiredPrefix
			titleEn = "License Expired"
			titleZh = "许可证已过期"
			messageEn = fmt.Sprintf("Your license expired on %s. Please renew to continue using the service.",
				expirationTime.Format("2006-01-02"))
			messageZh = fmt.Sprintf("您的许可证已于 %s 过期,请续费以继续使用服务。",
				expirationTime.Format("2006-01-02"))
		}
	} else if timeUntilExpiration <= expiringSoonThreshold {
		// License is expiring soon
		notificationType = licenseExpiringPrefix
		days := int(timeUntilExpiration.Hours() / 24)
		titleEn = "License Expiring Soon"
		titleZh = "许可证即将过期"
		messageEn = fmt.Sprintf("Your license will expire in %d days (on %s). Please renew in time.",
			days, expirationTime.Format("2006-01-02"))
		messageZh = fmt.Sprintf("您的许可证将在 %d 天后过期(过期日期: %s),请及时续费。",
			days, expirationTime.Format("2006-01-02"))
	}

	if notificationType != "" {
		if err := n.sendOrUpdateNotification(ctx, adminNamespace, notificationType, titleEn, titleZh, messageEn, messageZh); err != nil {
			return fmt.Errorf("failed to send expiration notification: %w", err)
		}
	}

	return nil
}

// checkUserLimit sends notifications when user count approaches or reaches the limit
func (n *LicenseNotifier) checkUserLimit(ctx context.Context, license *licensev1.License) error {
	// Only check if license is active
	if license.Status.Phase != licensev1.LicenseStatusPhaseActive {
		return nil
	}

	if !licensegate.Initialized() || !usercount.Initialized() {
		return nil
	}

	userLimit := licensegate.UserLimit()
	currentUserCount := usercount.Get()

	// Only notify if there's a positive limit (unlimited is -1)
	if userLimit < 0 {
		return nil
	}

	var notificationType string
	var titleEn, titleZh, messageEn, messageZh string

	// Check if user limit has been reached or is close to being reached
	if currentUserCount >= userLimit {
		notificationType = licenseUserLimitPrefix
		titleEn = "User Limit Reached"
		titleZh = "用户数量已达上限"
		messageEn = fmt.Sprintf("The current user count (%d) has reached the license limit (%d). Please upgrade your license to add more users.",
			currentUserCount, userLimit)
		messageZh = fmt.Sprintf("当前用户数量 (%d) 已达到许可证限制 (%d)。请升级许可证以添加更多用户。",
			currentUserCount, userLimit)
	} else if currentUserCount >= int(float64(userLimit)*0.9) {
		// 90% threshold warning
		notificationType = licenseUserLimitPrefix + "-warning"
		titleEn = "User Limit Warning"
		titleZh = "用户数量限制警告"
		messageEn = fmt.Sprintf("The current user count (%d) is approaching the license limit (%d). Consider upgrading your license soon.",
			currentUserCount, userLimit)
		messageZh = fmt.Sprintf("当前用户数量 (%d) 已接近许可证限制 (%d)。建议尽快升级许可证。",
			currentUserCount, userLimit)
	}

	if notificationType != "" {
		if err := n.sendOrUpdateNotification(ctx, adminNamespace, notificationType, titleEn, titleZh, messageEn, messageZh); err != nil {
			return fmt.Errorf("failed to send user limit notification: %w", err)
		}
	}

	return nil
}

// sendOrUpdateNotification creates or updates a notification, reusing the same notification resource
func (n *LicenseNotifier) sendOrUpdateNotification(
	ctx context.Context,
	namespace, notificationType, titleEn, titleZh, messageEn, messageZh string,
) error {
	now := time.Now().UTC().Unix()
	notificationName := notificationType

	notification := &v1.Notification{
		ObjectMeta: metav1.ObjectMeta{
			Name:      notificationName,
			Namespace: namespace,
		},
	}

	// Create or update the notification
	opResult, err := controllerutil.CreateOrUpdate(ctx, n.Client, notification, func() error {
		// Update spec
		notification.Spec.Title = titleEn
		notification.Spec.Message = messageEn
		notification.Spec.From = fromEn
		notification.Spec.Importance = v1.High
		notification.Spec.DesktopPopup = true
		notification.Spec.Timestamp = now
		notification.Spec.I18n = map[string]v1.I18n{
			languageZh: {
				Title:   titleZh,
				From:    fromZh,
				Message: messageZh,
			},
		}

		// Ensure labels exist and mark as unread
		if notification.Labels == nil {
			notification.Labels = make(map[string]string)
		}
		notification.Labels[readStatusLabel] = falseStatus

		return nil
	})

	if err != nil {
		return fmt.Errorf("failed to create/update notification: %w", err)
	}

	n.Logger.V(1).Info("license notification processed",
		"operation", opResult,
		"name", notificationName,
		"namespace", namespace,
		"type", notificationType)

	return nil
}

// namespaceExists checks if a namespace exists
func (n *LicenseNotifier) namespaceExists(ctx context.Context, namespace string) bool {
	ns := &corev1.Namespace{}
	err := n.Get(ctx, types.NamespacedName{Name: namespace}, ns)
	return err == nil
}
