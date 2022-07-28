//go:build !linux
// +build !linux

/*
Copyright 2017 The Kubernetes Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package netlink

import (
	"fmt"
	"net"

	"k8s.io/apimachinery/pkg/util/sets"
)

// The type must match the one in proxier_test.go
type netlinkHandle struct {
	isIPv6 bool
}

// NewNetLinkHandle will create an EmptyHandle
func NewNetLinkHandle(ipv6 bool) NetLinkHandle {
	return &netlinkHandle{}
}

// EnsureAddressBind checks if address is bound to the interface and, if not, binds it. If the address is already bound, return true.
func (h *netlinkHandle) EnsureAddressBind(address, devName string) (exist bool, err error) {
	return false, fmt.Errorf("netlink not supported for this platform")
}

// UnbindAddress unbind address from the interface
func (h *netlinkHandle) UnbindAddress(address, devName string) error {
	return fmt.Errorf("netlink not supported for this platform")
}

// EnsureDummyDevice is part of interface
func (h *netlinkHandle) EnsureDummyDevice(devName string) (bool, error) {
	return false, fmt.Errorf("netlink is not supported in this platform")
}

// DeleteDummyDevice is part of interface.
func (h *netlinkHandle) DeleteDummyDevice(devName string) error {
	return fmt.Errorf("netlink is not supported in this platform")
}

// ListBindAddress is part of interface.
func (h *netlinkHandle) ListBindAddress(devName string) ([]string, error) {
	return nil, fmt.Errorf("netlink is not supported in this platform")
}

// GetAllLocalAddresses is part of interface.
func (h *netlinkHandle) GetAllLocalAddresses() (sets.String, error) {
	return nil, fmt.Errorf("netlink is not supported in this platform")
}

// GetLocalAddresses is part of interface.
func (h *netlinkHandle) GetLocalAddresses(dev string) (sets.String, error) {
	return nil, fmt.Errorf("netlink is not supported in this platform")
}

// Must match the one in proxier_test.go
func (h *netlinkHandle) isValidForSet(ip net.IP) bool {
	return false
}
