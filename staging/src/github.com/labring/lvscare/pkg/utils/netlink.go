// Copyright © 2022 sealos.
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

package utils

import (
	"strings"

	"github.com/vishvananda/netlink"
)

// GetOrCreateDummyLink get link by name or create dummy link if not exists
func GetOrCreateDummyLink(name string) (netlink.Link, error) {
	link, _ := netlink.LinkByName(name)
	if link != nil {
		return link, nil
	}
	link = &netlink.Dummy{
		LinkAttrs: netlink.LinkAttrs{
			Name: name,
		},
	}
	return link, netlink.LinkAdd(link)
}

// AssignIPToLink bind IP to link
func AssignIPToLink(s string, link netlink.Link) error {
	if !strings.Contains(s, "/") {
		s = s + "/32"
	}
	addr, err := netlink.ParseAddr(s)
	if err != nil {
		return err
	}
	return netlink.AddrAdd(link, addr)
}

// DeleteLinkByName delete link if exists
func DeleteLinkByName(name string) error {
	l, err := netlink.LinkByName(name)
	if err != nil {
		if err, ok := err.(netlink.LinkNotFoundError); !ok {
			return err
		}
		return nil
	}
	return netlink.LinkDel(l)
}
