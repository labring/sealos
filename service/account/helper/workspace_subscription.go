package helper

import (
	"context"
	"fmt"
	"time"

	"github.com/go-logr/logr"
	"github.com/labring/sealos/controllers/pkg/database/cockroach"
	"github.com/labring/sealos/controllers/pkg/types"
	"gorm.io/gorm"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	types2 "k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/util/retry"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

func AddTrafficPackage(
	globalDB *gorm.DB,
	client client.Client,
	sub *types.WorkspaceSubscription,
	plan *types.WorkspaceSubscriptionPlan,
	expireAt time.Time,
	from types.WorkspaceTrafficFrom,
	fromID string,
) error {
	err := cockroach.AddWorkspaceSubscriptionTrafficPackage(
		globalDB,
		sub.ID,
		plan.Traffic,
		expireAt,
		from,
		fromID,
	)
	if err != nil {
		return fmt.Errorf("failed to create traffic package: %w", err)
	}
	// Check if workspace was previously exhausted and needs to be resumed
	if sub.TrafficStatus == types.WorkspaceTrafficStatusUsedUp ||
		sub.TrafficStatus == types.WorkspaceTrafficStatusExhausted {
		// Update workspace status to available
		err = globalDB.Model(&types.WorkspaceSubscription{}).
			Where("id = ?", sub.ID).
			Update("traffic_status", types.WorkspaceTrafficStatusActive).Error
		if err != nil {
			return fmt.Errorf("failed to update workspace traffic status: %w", err)
		}
		// Send resume request (outside transaction)
	}
	err = resumeWorkspaceTraffic(client, sub.Workspace)
	if err != nil {
		return fmt.Errorf("failed to resume workspace traffic: %w", err)
		// Note: We don't rollback here as the traffic package was successfully added
	}
	return nil
}

func resumeWorkspaceTraffic(client client.Client, workspace string) error {
	return updateNamespaceStatus(
		client,
		context.Background(),
		types.NetworkResume,
		[]string{workspace},
	)
}

func updateNamespaceStatus(
	clt client.Client,
	ctx context.Context,
	status string,
	namespaces []string,
) error {
	logger := logr.FromContextOrDiscard(ctx)

	for _, nsName := range namespaces {
		// Use retry.RetryOnConflict to handle conflicts
		err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
			// Fetch the latest namespace object
			ns := &corev1.Namespace{}
			if err := clt.Get(ctx, types2.NamespacedName{Name: nsName}, ns); err != nil {
				if errors.IsNotFound(err) {
					logger.Info("Namespace not found, skipping", "namespace", nsName)
					return nil // Skip if namespace doesn't exist
				}
				return err
			}

			// Check if the annotation already matches the desired status
			if ns.Annotations == nil {
				ns.Annotations = make(map[string]string)
			}
			if ns.Annotations[types.NetworkStatusAnnoKey] == status {
				logger.Info(
					"Namespace already has desired status, skipping",
					"namespace",
					nsName,
					"status",
					status,
				)
				return nil
			}

			// Update the annotation
			ns.Annotations[types.NetworkStatusAnnoKey] = status

			// Attempt to update the namespace
			return clt.Update(ctx, ns)
		})
		if err != nil {
			return err
		}
	}
	return nil
}
