//go:build !linux

// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package standalone

import "fmt"

func reservedRoutesEmpty(_, _ int) error {
	return fmt.Errorf("route management requires Linux")
}

func removeReservedRoutes(_, _ int) error {
	return fmt.Errorf("route management requires Linux")
}
