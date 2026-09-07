package api

import (
	"context"
	"errors"
	"fmt"

	"github.com/labring/sealos/controllers/pkg/types"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	types2 "k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// isWorkspaceSubscriptionNamespaceRecoverable checks whether a deleted
// workspace still has a namespace that can safely be resumed by a new
// subscription.
func isWorkspaceSubscriptionNamespaceRecoverable(
	ctx context.Context,
	clt client.Client,
	workspace string,
) (bool, error) {
	if clt == nil {
		return false, errors.New("kubernetes client is not initialized")
	}

	ns := &corev1.Namespace{}
	if err := clt.Get(ctx, types2.NamespacedName{Name: workspace}, ns); err != nil {
		if k8serrors.IsNotFound(err) {
			return false, nil
		}
		return false, fmt.Errorf("failed to get namespace %s: %w", workspace, err)
	}

	if ns.DeletionTimestamp != nil || ns.Status.Phase != corev1.NamespaceActive {
		return false, nil
	}

	switch ns.Annotations[types.DebtNamespaceAnnoStatusKey] {
	case "",
		types.NormalDebtNamespaceAnnoStatus,
		types.SuspendDebtNamespaceAnnoStatus,
		types.SuspendCompletedDebtNamespaceAnnoStatus,
		types.ResumeDebtNamespaceAnnoStatus,
		types.ResumeCompletedDebtNamespaceAnnoStatus:
		return true, nil
	default:
		return false, nil
	}
}

// isValidDeletedWorkspaceSubscriptionResubscription distinguishes a current
// resubscription payment from a late event belonging to an older transaction.
func isValidDeletedWorkspaceSubscriptionResubscription(
	workspaceSubscription *types.WorkspaceSubscription,
	transaction *types.WorkspaceSubscriptionTransaction,
	stripeSubscriptionID string,
) bool {
	if workspaceSubscription == nil || transaction == nil ||
		workspaceSubscription.Status != types.SubscriptionStatusDeleted ||
		transaction.Operator != types.SubscriptionTransactionTypeCreated ||
		transaction.OldPlanStatus != types.SubscriptionStatusDeleted ||
		transaction.Workspace != workspaceSubscription.Workspace ||
		transaction.RegionDomain != workspaceSubscription.RegionDomain ||
		transaction.UserUID != workspaceSubscription.UserUID ||
		transaction.OldPlanName != workspaceSubscription.PlanName ||
		stripeSubscriptionID == "" {
		return false
	}

	if transaction.Status != types.SubscriptionTransactionStatusProcessing &&
		transaction.Status != types.SubscriptionTransactionStatusPending {
		return false
	}
	// prepareCreateOrRenewTransactionAndPayment marks the initial transaction
	// paid in memory before finalization. The transaction status remains the
	// source of truth for distinguishing an active payment from a stale event.
	if transaction.PayStatus != types.SubscriptionPayStatusPending &&
		transaction.PayStatus != types.SubscriptionPayStatusProcessing &&
		transaction.PayStatus != types.SubscriptionPayStatusPaid {
		return false
	}

	// A payment event for the subscription already stored in the deleted row is
	// a late event from the old subscription, not a new subscription.
	return workspaceSubscription.Stripe == nil ||
		workspaceSubscription.Stripe.SubscriptionID == "" ||
		workspaceSubscription.Stripe.SubscriptionID != stripeSubscriptionID
}

func isDeletedWorkspaceSubscriptionResubscriptionPayment(
	isInitial bool,
	operator types.SubscriptionOperator,
) bool {
	return isInitial && operator == types.SubscriptionTransactionTypeCreated
}
