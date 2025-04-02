// Copyright © 2025 sealos.
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

package iputils

import (
	"net"
	"testing"
)

func TestIsIpv4(t *testing.T) {
	tests := []struct {
		name string
		ip   string
		want bool
	}{
		{
			name: "valid ipv4",
			ip:   "192.168.1.1",
			want: true,
		},
		{
			name: "valid ipv4 with leading zeros",
			ip:   "192.168.1.1",
			want: true,
		},
		{
			name: "invalid ipv4 - wrong format",
			ip:   "192.168.1",
			want: false,
		},
		{
			name: "invalid ipv4 - out of range",
			ip:   "256.256.256.256",
			want: false,
		},
		{
			name: "ipv6 address",
			ip:   "2001:db8::1",
			want: false,
		},
		{
			name: "empty string",
			ip:   "",
			want: false,
		},
		{
			name: "invalid characters",
			ip:   "192.168.1.abc",
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsIpv4(tt.ip); got != tt.want {
				t.Errorf("IsIpv4() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestIsIPv6(t *testing.T) {
	tests := []struct {
		name  string
		netIP net.IP
		want  bool
	}{
		{
			name:  "valid ipv6",
			netIP: net.ParseIP("2001:db8::1"),
			want:  true,
		},
		{
			name:  "ipv4 address",
			netIP: net.ParseIP("192.168.1.1"),
			want:  false,
		},
		{
			name:  "nil IP",
			netIP: nil,
			want:  false,
		},
		{
			name:  "ipv6 loopback",
			netIP: net.ParseIP("::1"),
			want:  true,
		},
		{
			name:  "ipv6 link-local",
			netIP: net.ParseIP("fe80::1"),
			want:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsIPv6(tt.netIP); got != tt.want {
				t.Errorf("IsIPv6() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCheckDomain(t *testing.T) {
	tests := []struct {
		name   string
		domain string
		want   bool
	}{
		{
			name:   "valid domain",
			domain: "example.com",
			want:   true,
		},
		{
			name:   "valid domain with subdomain",
			domain: "sub.example.com",
			want:   true,
		},
		{
			name:   "valid domain with path",
			domain: "example.com/path",
			want:   true,
		},
		{
			name:   "valid domain with scheme",
			domain: "https://example.com",
			want:   true,
		},
		{
			name:   "empty string",
			domain: "",
			want:   true,
		},
		{
			name:   "invalid characters",
			domain: "example com",
			want:   true,
		},
		{
			name:   "invalid scheme",
			domain: "://example.com",
			want:   false,
		},
		{
			name:   "domain with port",
			domain: "example.com:8080",
			want:   true,
		},
		{
			name:   "domain with query params",
			domain: "example.com?param=value",
			want:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CheckDomain(tt.domain); got != tt.want {
				t.Errorf("CheckDomain() = %v, want %v", got, tt.want)
			}
		})
	}
}
