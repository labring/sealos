package controllers

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/labring/sealos/controllers/pkg/database/cockroach"

	corev1 "k8s.io/api/core/v1"
	types2 "k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/labring/sealos/controllers/pkg/types"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/database"
	"gorm.io/gorm"
)

// WorkspaceTrafficController handles workspace-level traffic management
type WorkspaceTrafficController struct {
	TrafficDB database.Interface
	GlobalDB  *gorm.DB
	*AccountReconciler
}

// TODO 需要添加用户通知
func NewWorkspaceTrafficController(ar *AccountReconciler, trafficDBURI database.Interface) *WorkspaceTrafficController {
	return &WorkspaceTrafficController{
		TrafficDB:         trafficDBURI,
		GlobalDB:          ar.AccountV2.GetGlobalDB(),
		AccountReconciler: ar,
	}
}

// BatchGetWorkspaceSubscriptions retrieves all workspace subscription mappings
func (c *WorkspaceTrafficController) BatchGetWorkspaceSubscriptions() (map[string]*types.WorkspaceSubscription, error) {
	allWorkspaces := make(map[string]*types.WorkspaceSubscription)
	var subscriptions []types.WorkspaceSubscription

	err := c.GlobalDB.Where("region_domain = ?", c.localDomain).Find(&subscriptions).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get workspace subscriptions: %v", err)
	}

	for i := range subscriptions {
		allWorkspaces[subscriptions[i].Workspace] = &subscriptions[i]
	}

	return allWorkspaces, nil
}

const (
// workspaceBatchSize = 500
)

// processWorkspaceTraffic processes workspace traffic consumption
func (c *WorkspaceTrafficController) processWorkspaceTraffic(resultMap map[string]int64) error {
	workspaceMap, err := c.BatchGetWorkspaceSubscriptions()
	if err != nil {
		c.Logger.Error(err, "failed to batch get workspace subscriptions")
		return fmt.Errorf("failed to batch get workspace subscriptions: %v", err)
	}

	for namespace, consumedBytes := range resultMap {
		if !strings.HasPrefix(namespace, "ns-") {
			continue
		}

		// Find matching workspace subscription (try all regions)
		var matchedSubscription *types.WorkspaceSubscription
		if sub, ok := workspaceMap[namespace]; ok {
			matchedSubscription = sub
		} else {
			// c.Logger.Info("no workspace subscription found for namespace", "namespace", namespace)
			continue
		}

		// Process traffic consumption for this workspace
		err := c.consumeWorkspaceTraffic(matchedSubscription, consumedBytes)
		if err != nil {
			c.Logger.Error(err, "failed to consume workspace traffic",
				"workspace", matchedSubscription.Workspace,
				"region", matchedSubscription.RegionDomain)
		}
	}

	return nil
}

// consumeWorkspaceTraffic consumes traffic from workspace packages based on priority
func (c *WorkspaceTrafficController) consumeWorkspaceTraffic(subscription *types.WorkspaceSubscription, consumedBytes int64) error {
	// Get available traffic packages ordered by expiry date (nearest expiry first)
	var availablePackages []types.WorkspaceTraffic
	err := c.GlobalDB.Where("workspace_subscription_id = ? AND status = ? AND expire_at > ? AND total_bytes > used_bytes",
		subscription.ID, types.WorkspaceTrafficStatusActive, time.Now()).
		Order("expire_at ASC").
		Find(&availablePackages).Error

	if err != nil {
		return fmt.Errorf("failed to get available traffic packages: %v", err)
	}

	if len(availablePackages) == 0 {
		// No available traffic, check if workspace needs suspension
		return c.handleNoAvailableTraffic(subscription)
	}

	// Consume traffic from packages in priority order
	remainingToConsume := consumedBytes
	var packagesToUpdate []types.WorkspaceTraffic

	for i := range availablePackages {
		pkg := &availablePackages[i]
		availableInPackage := pkg.TotalBytes - pkg.UsedBytes

		if remainingToConsume <= 0 {
			break
		}

		if availableInPackage > 0 {
			consumeFromPackage := remainingToConsume
			if consumeFromPackage > availableInPackage {
				consumeFromPackage = availableInPackage
			}

			pkg.UsedBytes += consumeFromPackage
			pkg.UpdatedAt = time.Now()

			// Mark package as exhausted if fully consumed
			if pkg.UsedBytes >= pkg.TotalBytes {
				pkg.Status = types.WorkspaceTrafficStatusExhausted
			}

			packagesToUpdate = append(packagesToUpdate, *pkg)
			remainingToConsume -= consumeFromPackage
		}
	}

	// Update packages in batch
	if len(packagesToUpdate) > 0 {
		err = c.batchUpdateTrafficPackages(packagesToUpdate)
		if err != nil {
			return fmt.Errorf("failed to update traffic packages: %v", err)
		}
	}

	// If still have remaining consumption and no available traffic
	if remainingToConsume > 0 {
		return c.handleNoAvailableTraffic(subscription)
	}

	return nil
}

// batchUpdateTrafficPackages updates multiple traffic packages
func (c *WorkspaceTrafficController) batchUpdateTrafficPackages(packages []types.WorkspaceTraffic) error {
	tx := c.GlobalDB.Begin()
	if tx.Error != nil {
		return fmt.Errorf("failed to begin transaction: %v", tx.Error)
	}

	for _, pkg := range packages {
		err := tx.Model(&types.WorkspaceTraffic{}).Where("id = ?", pkg.ID).
			Updates(map[string]interface{}{
				"used_bytes": pkg.UsedBytes,
				"status":     pkg.Status,
				"updated_at": pkg.UpdatedAt,
			}).Error
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to update package %s: %v", pkg.ID, err)
		}
	}

	return tx.Commit().Error
}

// TODO 流量不足 80% + 耗尽时发送通知
// handleNoAvailableTraffic handles the case when workspace has no available traffic
func (c *WorkspaceTrafficController) handleNoAvailableTraffic(subscription *types.WorkspaceSubscription) error {
	// Check current traffic status
	if subscription.TrafficStatus == types.WorkspaceTrafficStatusActive {
		// Update workspace traffic status to exhausted
		err := c.updateWorkspaceTrafficStatus(subscription.ID, types.WorkspaceTrafficStatusExhausted)
		if err != nil {
			return fmt.Errorf("failed to update workspace traffic status: %v", err)
		}

		// Send suspend request
		err = c.suspendWorkspaceTraffic(subscription.Workspace)
		if err != nil {
			c.Logger.Error(err, "failed to suspend workspace traffic",
				"workspace", subscription.Workspace,
				"region", subscription.RegionDomain)
			// Continue execution even if suspend fails
		} else {
			// Update status to suspended if suspend succeeded
			err = c.updateWorkspaceTrafficStatus(subscription.ID, types.WorkspaceTrafficStatusUsedUp)
			if err != nil {
				c.Logger.Error(err, "failed to update workspace status to suspended")
			}
		}
	}

	return nil
}

// updateWorkspaceTrafficStatus updates the traffic status of a workspace
func (c *WorkspaceTrafficController) updateWorkspaceTrafficStatus(subscriptionID uuid.UUID, status types.WorkspaceTrafficStatus) error {
	result := c.GlobalDB.Model(&types.WorkspaceSubscription{}).
		Where("id = ?", subscriptionID).
		Update("traffic_status", status)

	if result.Error != nil {
		return fmt.Errorf("failed to update traffic status: %v", result.Error)
	}

	return nil
}

// ProcessTrafficWithTimeRange processes workspace traffic within time ranges
func (c *WorkspaceTrafficController) ProcessTrafficWithTimeRange() {
	c.Logger.Info("start workspace traffic controller")
	startTime := time.Now().Add(-1 * time.Minute)

	for range time.NewTicker(time.Minute).C {
		c.Logger.Info("time to process workspace traffic", "startTime", startTime)
		endTime := time.Now()

		result, err := c.TrafficDB.GetNamespaceTraffic(context.Background(), startTime, endTime)
		if err != nil {
			c.Logger.Error(err, "failed to get namespace traffic")
			endTime = startTime
		} else if len(result) > 0 {
			err = c.processWorkspaceTraffic(result)
			if err != nil {
				c.Logger.Error(err, "failed to process workspace traffic")
			} else {
				c.Logger.Info("successfully processed workspace traffic", "count", len(result), "start", startTime, "end", endTime)
			}
		}
		startTime = endTime
	}
}

func (r *AccountReconciler) addTrafficPackage(globalDB *gorm.DB, sub *types.WorkspaceSubscription, plan *types.WorkspaceSubscriptionPlan, expireAt time.Time, from types.WorkspaceTrafficFrom, fromID string) error {
	totalBytes := plan.Traffic * 1024 * 1024 // Convert MiB to Bytes
	err := cockroach.AddWorkspaceSubscriptionTrafficPackage(globalDB, sub.ID, plan.Traffic, expireAt, from, fromID)
	if err != nil {
		return fmt.Errorf("failed to create traffic package: %v", err)
	}
	// Check if workspace was previously exhausted and needs to be resumed
	if sub.TrafficStatus == types.WorkspaceTrafficStatusUsedUp || sub.TrafficStatus == types.WorkspaceTrafficStatusExhausted {
		// Update workspace status to available
		err = globalDB.Model(&types.WorkspaceSubscription{}).
			Where("id = ?", sub.ID).
			Update("traffic_status", types.WorkspaceTrafficStatusActive).Error
		if err != nil {
			return fmt.Errorf("failed to update workspace traffic status: %v", err)
		}
		// Send resume request (outside transaction)
		err = r.resumeWorkspaceTraffic(sub.Workspace)
		if err != nil {
			r.Logger.Error(err, "failed to resume workspace traffic",
				"workspace", sub.Workspace,
				"region", sub.RegionDomain)
			// Note: We don't rollback here as the traffic package was successfully added
		}
	}

	r.Logger.Info("successfully added traffic package",
		"workspace", sub.Workspace,
		"region", sub.RegionDomain,
		"totalBytes", totalBytes)

	return nil
}

// AddTrafficPackage adds a new traffic package to workspace
func (r *AccountReconciler) AddTrafficPackage(globalDB *gorm.DB, sub *types.WorkspaceSubscription, plan *types.WorkspaceSubscriptionPlan, expireAt time.Time, from types.WorkspaceTrafficFrom, fromID string) error {
	if sub.ID == uuid.Nil {
		return fmt.Errorf("workspace subscription ID cannot be nil")
	}
	// Get workspace subscription
	var subscription types.WorkspaceSubscription
	err := globalDB.First(&subscription, "id = ?", sub.ID).Error
	if err != nil {
		return fmt.Errorf("failed to get workspace subscription: %v", err)
	}
	return r.addTrafficPackage(globalDB, &subscription, plan, expireAt, from, fromID)
}

// 与AddTrafficPackage不同的点在于容忍 Subscription是否存在
func (r *AccountReconciler) NewTrafficPackage(globalDB *gorm.DB, sub *types.WorkspaceSubscription, plan *types.WorkspaceSubscriptionPlan, expireAt time.Time, from types.WorkspaceTrafficFrom, fromID string) error {
	if sub.ID == uuid.Nil {
		return fmt.Errorf("workspace subscription ID cannot be nil")
	}
	return r.addTrafficPackage(globalDB, sub, plan, expireAt, from, fromID)
}

// CleanupExpiredPackages marks expired traffic packages
func (c *WorkspaceTrafficController) CleanupExpiredPackages() error {
	result := c.GlobalDB.Model(&types.WorkspaceTraffic{}).
		Where("expire_at <= ? AND status = ?", time.Now(), types.WorkspaceTrafficStatusActive).
		Update("status", types.WorkspaceTrafficStatusExpired)

	if result.Error != nil {
		return fmt.Errorf("failed to cleanup expired packages: %v", result.Error)
	}

	c.Logger.Info("cleaned up expired traffic packages", "count", result.RowsAffected)
	return nil
}

func updateNamespaceStatus(clt client.Client, ctx context.Context, status string, namespaces []string) error {
	for i := range namespaces {
		ns := &corev1.Namespace{}
		if err := clt.Get(ctx, types2.NamespacedName{Name: namespaces[i]}, ns); err != nil {
			return err
		}
		if ns.Annotations[types.NetworkStatusAnnoKey] == status {
			continue
		}
		// 交给namespace controller处理
		ns.Annotations[types.NetworkStatusAnnoKey] = status
		if err := clt.Update(ctx, ns); err != nil {
			return err
		}
	}
	return nil
}

// Workspace traffic management API calls
func (c *WorkspaceTrafficController) suspendWorkspaceTraffic(workspace string) error {
	return updateNamespaceStatus(c.Client, context.Background(), types.NetworkSuspend, []string{workspace})
}

func (r *AccountReconciler) resumeWorkspaceTraffic(workspace string) error {
	return updateNamespaceStatus(r.Client, context.Background(), types.NetworkResume, []string{workspace})
}

// WorkspaceTrafficManager provides high-level traffic management operations
type WorkspaceTrafficManager struct {
	controller *WorkspaceTrafficController
	db         *gorm.DB
}

func NewWorkspaceTrafficManager(controller *WorkspaceTrafficController) *WorkspaceTrafficManager {
	return &WorkspaceTrafficManager{
		controller: controller,
		db:         controller.GlobalDB,
	}
}

// GetWorkspaceTrafficSummary returns traffic summary for a workspace
func (m *WorkspaceTrafficManager) GetWorkspaceTrafficSummary(workspace, regionDomain string) (*WorkspaceTrafficSummary, error) {
	var subscription types.WorkspaceSubscription
	err := m.db.Where("workspace = ? AND region_domain = ?", workspace, regionDomain).
		First(&subscription).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get workspace subscription: %v", err)
	}

	var packages []types.WorkspaceTraffic
	err = m.db.Where("workspace_subscription_id = ?", subscription.ID).
		Order("expire_at ASC").
		Find(&packages).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get traffic packages: %v", err)
	}

	summary := &WorkspaceTrafficSummary{
		WorkspaceID:   subscription.ID,
		Workspace:     workspace,
		RegionDomain:  regionDomain,
		TrafficStatus: subscription.TrafficStatus,
		TotalPackages: len(packages),
	}

	for _, pkg := range packages {
		summary.TotalTraffic += pkg.TotalBytes
		summary.UsedTraffic += pkg.UsedBytes
		if pkg.Status == types.WorkspaceTrafficStatusActive {
			summary.AvailableTraffic += pkg.TotalBytes - pkg.UsedBytes
			summary.ActivePackages++
		}
	}

	return summary, nil
}

// WorkspaceTrafficSummary contains traffic summary information
type WorkspaceTrafficSummary struct {
	WorkspaceID      uuid.UUID                    `json:"workspace_id"`
	Workspace        string                       `json:"workspace"`
	RegionDomain     string                       `json:"region_domain"`
	TrafficStatus    types.WorkspaceTrafficStatus `json:"traffic_status"`
	TotalPackages    int                          `json:"total_packages"`
	ActivePackages   int                          `json:"active_packages"`
	TotalTraffic     int64                        `json:"total_traffic"`
	UsedTraffic      int64                        `json:"used_traffic"`
	AvailableTraffic int64                        `json:"available_traffic"`
}
