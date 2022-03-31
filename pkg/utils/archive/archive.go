// Copyright © 2021 Alibaba Group Holding Ltd.
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

package archive

import (
	"fmt"
	"io"

	"github.com/opencontainers/go-digest"
)

type Archive interface {
	TarOrGzip(paths ...string) (readCloser io.ReadCloser, err error)
	UnTarOrGzip(src io.Reader, dst string) (int64, error)
	Digest(path string) (digest.Digest, int64, error)
}

func (opt *Options) TarOrGzip(paths ...string) (readCloser io.ReadCloser, err error) {
	return compress(paths, Options{Compress: opt.Compress, KeepRootDir: opt.KeepRootDir})
}

func (opt *Options) UnTarOrGzip(src io.Reader, dst string) (int64, error) {
	return decompress(src, dst, Options{Compress: opt.Compress})
}

func (opt *Options) Digest(path string) (digest.Digest, int64, error) {
	read, err := compress([]string{path}, Options{Compress: opt.Compress, KeepRootDir: opt.KeepRootDir})
	if err != nil {
		return "", 0, fmt.Errorf("unable to tar on %s, err: %s", path, err)
	}
	return canonicalDigest(read)
}

func NewArchive(compressible, keepRoot bool) Archive {
	return &Options{
		Compress:    compressible,
		KeepRootDir: keepRoot,
	}
}
