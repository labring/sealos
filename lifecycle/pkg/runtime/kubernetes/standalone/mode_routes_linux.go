// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package standalone

import (
	"fmt"

	"github.com/vishvananda/netlink"
)

func reservedRoutes(table, protocol int) ([]netlink.Route, error) {
	return netlink.RouteListFiltered(netlink.FAMILY_ALL, &netlink.Route{
		Table:    table,
		Protocol: protocol,
	}, netlink.RT_FILTER_TABLE|netlink.RT_FILTER_PROTOCOL)
}

func reservedRoutesEmpty(table, protocol int) error {
	routes, err := reservedRoutes(table, protocol)
	if err != nil {
		return err
	}
	if len(routes) != 0 {
		return fmt.Errorf("route table %d protocol %d is already in use; reserve an unused route ownership pair for route-controller", table, protocol)
	}
	return nil
}

func removeReservedRoutes(table, protocol int) error {
	routes, err := reservedRoutes(table, protocol)
	if err != nil {
		return err
	}
	for i := range routes {
		if err := netlink.RouteDel(&routes[i]); err != nil {
			return err
		}
	}
	return reservedRoutesEmpty(table, protocol)
}
