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
	"fmt"
	"strings"

	"github.com/containers/storage/pkg/archive"
)

type Compression int

const (
	Disable Compression = iota
	Uncompressed
	Bzip2
	Gzip
	Xz
	Zstd
)

func (c *Compression) String() string {
	switch *c {
	case Disable:
		return "disable"
	case Uncompressed:
		return "tar"
	case Bzip2:
		return "bzip2"
	case Gzip:
		return "gzip"
	case Xz:
		return "xz"
	case Zstd:
		return "zstd"
	}
	return "unknown"
}

func (c *Compression) Compression() archive.Compression {
	return archive.Compression(int(*c) - 1)
}

func (c *Compression) Set(s string) error {
	switch strings.ToLower(s) {
	case "gz", "gzip":
		*c = Gzip
	case "zst", "zstd":
		*c = Zstd
	case "tar", "uncompressed":
		*c = Uncompressed
	case "", "disable":
		*c = Disable
	default:
		return fmt.Errorf("unknown compression algorithm %s", s)
	}
	return nil
}

func (c *Compression) Type() string { return "compressionAlgorithm" }
