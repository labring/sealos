// Copyright © 2023 sealos.
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

package flags

import (
	"testing"

	"github.com/containers/storage/pkg/archive"
)

func TestCompression_String(t *testing.T) {
	tests := []struct {
		name string
		c    Compression
		want string
	}{
		{
			name: "disable compression",
			c:    Disable,
			want: "disable",
		},
		{
			name: "uncompressed",
			c:    Uncompressed,
			want: "tar",
		},
		{
			name: "bzip2",
			c:    Bzip2,
			want: "bzip2",
		},
		{
			name: "gzip",
			c:    Gzip,
			want: "gzip",
		},
		{
			name: "xz",
			c:    Xz,
			want: "xz",
		},
		{
			name: "zstd",
			c:    Zstd,
			want: "zstd",
		},
		{
			name: "unknown",
			c:    Compression(99),
			want: "unknown",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.c.String(); got != tt.want {
				t.Errorf("Compression.String() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCompression_Compression(t *testing.T) {
	tests := []struct {
		name string
		c    Compression
		want archive.Compression
	}{
		{
			name: "uncompressed",
			c:    Uncompressed,
			want: archive.Uncompressed,
		},
		{
			name: "bzip2",
			c:    Bzip2,
			want: archive.Bzip2,
		},
		{
			name: "gzip",
			c:    Gzip,
			want: archive.Gzip,
		},
		{
			name: "xz",
			c:    Xz,
			want: archive.Xz,
		},
		{
			name: "zstd",
			c:    Zstd,
			want: archive.Zstd,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.c.Compression(); got != tt.want {
				t.Errorf("Compression.Compression() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCompression_Set(t *testing.T) {
	tests := []struct {
		name    string
		s       string
		want    Compression
		wantErr bool
	}{
		{
			name: "set gzip",
			s:    "gzip",
			want: Gzip,
		},
		{
			name: "set gz",
			s:    "gz",
			want: Gzip,
		},
		{
			name: "set zstd",
			s:    "zstd",
			want: Zstd,
		},
		{
			name: "set zst",
			s:    "zst",
			want: Zstd,
		},
		{
			name: "set tar",
			s:    "tar",
			want: Uncompressed,
		},
		{
			name: "set uncompressed",
			s:    "uncompressed",
			want: Uncompressed,
		},
		{
			name: "set empty string",
			s:    "",
			want: Disable,
		},
		{
			name: "set disable",
			s:    "disable",
			want: Disable,
		},
		{
			name:    "set invalid",
			s:       "invalid",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var c Compression
			err := c.Set(tt.s)
			if (err != nil) != tt.wantErr {
				t.Errorf("Compression.Set() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && c != tt.want {
				t.Errorf("Compression.Set() = %v, want %v", c, tt.want)
			}
		})
	}
}

func TestCompression_Type(t *testing.T) {
	var c Compression
	if got := c.Type(); got != "compressionAlgorithm" {
		t.Errorf("Compression.Type() = %v, want %v", got, "compressionAlgorithm")
	}
}
