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
		return fmt.Errorf(
			"route table %d protocol %d is already in use; reserve an unused route ownership pair for route-controller",
			table,
			protocol,
		)
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
