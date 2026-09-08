// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package processor

import (
	"context"

	"github.com/labring/sealos/pkg/runtime"
)

func setMaintenanceContext(rt runtime.Interface, ctx context.Context) {
	if configurable, ok := rt.(interface{ SetMaintenanceContext(context.Context) }); ok {
		configurable.SetMaintenanceContext(ctx)
	}
}

func checkMaintenanceContext(ctx context.Context) error {
	if ctx == nil {
		return nil
	}
	return ctx.Err()
}
