package helper

import (
	"context"
	"fmt"
	"time"

	"github.com/labring/sealos/controllers/pkg/database/cockroach"
	"github.com/labring/sealos/controllers/pkg/types"
	"gorm.io/gorm"
	corev1 "k8s.io/api/core/v1"
	types2 "k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

func AddTrafficPackage(globalDB *gorm.DB, client client.Client, sub *types.WorkspaceSubscription, plan *types.WorkspaceSubscriptionPlan, expireAt time.Time, from types.WorkspaceTrafficFrom, fromID string) error {
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
		err = resumeWorkspaceTraffic(client, sub.Workspace)
		if err != nil {
			return fmt.Errorf("failed to resume workspace traffic: %v", err)
			// Note: We don't rollback here as the traffic package was successfully added
		}
	}
	return nil
}

func resumeWorkspaceTraffic(client client.Client, workspace string) error {
	return updateNamespaceStatus(client, context.Background(), types.NetworkResume, []string{workspace})
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
