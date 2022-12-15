package metering

import (
	"context"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type ResourceControllerInterface interface {
	// CreateOrUpdateExtensionResourcesPrice need to create a ExtensionResourcesPrice to make metering-quota know this resource
	CreateOrUpdateExtensionResourcesPrice(ctx context.Context, obj client.Object) error

	// UpdateResourceUsed update metering-quota resource used
	UpdateResourceUsed(ctx context.Context, obj client.Object) error
}
