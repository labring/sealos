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
	"os"
	"path/filepath"
	"strings"

	"github.com/containers/storage/pkg/archive"
	"github.com/opencontainers/go-digest"

	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/flags"
	"github.com/labring/sealos/pkg/utils/logger"
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

func Tar(src, dst string, compression flags.Compression, cleanup bool) error {
	if compression == flags.Disable {
		return nil
	}
	if _, err := os.Stat(src); err != nil {
		return err
	}
	if err := file.MkDirs(filepath.Dir(dst)); err != nil {
		return err
	}
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()
	rc, err := archive.Tar(src, compression.Compression())
	if err != nil {
		return err
	}
	defer rc.Close()
	if _, err = io.Copy(out, rc); err != nil {
		return err
	}
	return clean(src, !cleanup)
}

func Untar(paths []string, dst string, cleanup bool) error {
	if err := file.MkDirs(dst); err != nil {
		return err
	}
	var sources []string
	for _, path := range paths {
		if file.IsExist(path) {
			if file.IsFile(path) {
				sources = append(sources, path)
				continue
			} else if file.IsDir(path) {
				path = filepath.Join(path, "*")
			}
		}
		if !strings.Contains(path, "*") {
			path += "*"
		}
		matches, err := filepath.Glob(path)
		if err != nil {
			return err
		}
		sources = append(sources, matches...)
	}
	logger.Debug("glob matches are: %v", sources)
	for i := range sources {
		if err := archive.UntarPath(sources[i], dst); err != nil {
			return err
		}
		if err := clean(sources[i], !cleanup); err != nil {
			return err
		}
	}
	return nil
}

func clean(path string, skip bool) (err error) {
	if !skip {
		err = os.RemoveAll(path)
	}
	return
}
