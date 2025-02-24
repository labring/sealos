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
	"archive/tar"
	"bufio"
	"compress/gzip"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"syscall"

	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"

	"golang.org/x/sys/unix"
)

const compressionBufSize = 32768

type Options struct {
	Compress    bool
	KeepRootDir bool
}

func validatePath(path string) error {
	if _, err := os.Stat(path); err != nil {
		return fmt.Errorf("dir %s does not exist, err: %s", path, err)
	}
	return nil
}

func compress(paths []string, options Options) (reader io.ReadCloser, err error) {
	if len(paths) == 0 {
		return nil, errors.New("[archive] source must be provided")
	}
	for _, path := range paths {
		err = validatePath(path)
		if err != nil {
			return nil, err
		}
	}

	pr, pw := io.Pipe()
	tw := tar.NewWriter(pw)
	bufWriter := bufio.NewWriterSize(nil, compressionBufSize)
	if options.Compress {
		tw = tar.NewWriter(gzip.NewWriter(pw))
	}
	go func() {
		defer func() {
			err := tw.Close()
			if err != nil {
				return
			}
			err = pw.Close()
			if err != nil {
				return
			}
		}()

		for _, path := range paths {
			err = writeToTarWriter(path, tw, bufWriter, options)
			if err != nil {
				_ = pw.CloseWithError(err)
			}
		}
	}()

	return pr, nil
}

func writeWhiteout(header *tar.Header, fi os.FileInfo, path string) *tar.Header {
	// overlay whiteout process
	// this is a whiteout file
	if fi.Mode()&os.ModeCharDevice != 0 && header.Devminor == 0 && header.Devmajor == 0 {
		hName := header.Name
		header.Name = filepath.Join(filepath.Dir(hName), WhiteoutPrefix+filepath.Base(hName))
		header.Mode = 0600
		header.Typeflag = tar.TypeReg
		header.Size = 0
	}

	var woh *tar.Header
	if fi.Mode()&os.ModeDir != 0 {
		opaque, walkErr := file.Lgetxattr(path, "trusted.overlay.opaque")
		if walkErr != nil {
			logger.Debug("failed to get trusted.overlay.opaque for %s at opaque, err: %v", path, walkErr)
		}

		if len(opaque) == 1 && opaque[0] == 'y' {
			if header.PAXRecords != nil {
				delete(header.PAXRecords, "trusted.overlay.opaque")
			}

			woh = &tar.Header{
				Typeflag: tar.TypeReg,
				Mode:     header.Mode & int64(os.ModePerm),
				// #nosec
				Name:       filepath.Join(header.Name, WhiteoutOpaqueDir),
				Size:       0,
				Uid:        header.Uid,
				Uname:      header.Uname,
				Gid:        header.Gid,
				Gname:      header.Gname,
				AccessTime: header.AccessTime,
				ChangeTime: header.ChangeTime,
			}
		}
	}
	return woh
}

func readWhiteout(hdr *tar.Header, path string) (bool, error) {
	var (
		base = filepath.Base(path)
		dir  = filepath.Dir(path)
		err  error
	)

	switch {
	case base == WhiteoutOpaqueDir:
		err = unix.Setxattr(dir, "trusted.overlay.opaque", []byte{'y'}, 0)
		return false, err
	case strings.HasPrefix(base, WhiteoutPrefix):
		oBase := base[len(WhiteoutPrefix):]
		oPath := filepath.Join(dir, oBase)

		// make a whiteout file
		err = unix.Mknod(oPath, unix.S_IFCHR, 0)
		if err != nil {
			return false, err
		}
		return false, os.Chown(oPath, hdr.Uid, hdr.Gid)
	}

	return true, nil
}

func writeToTarWriter(path string, tarWriter *tar.Writer, bufWriter *bufio.Writer, options Options) error {
	var newFolder string
	if options.KeepRootDir {
		fi, err := os.Stat(path)
		if err != nil {
			return err
		}
		if fi.IsDir() {
			newFolder = filepath.Base(path)
		}
	}

	dir := strings.TrimSuffix(path, "/")
	srcPrefix := filepath.ToSlash(dir + "/")
	err := filepath.Walk(dir, func(file string, fi os.FileInfo, err error) error {
		// generate tar header
		header, walkErr := tar.FileInfoHeader(fi, file)
		if walkErr != nil {
			return walkErr
		}
		// root dir
		if file != dir {
			absPath := filepath.ToSlash(file)
			header.Name = filepath.Join(newFolder, strings.TrimPrefix(absPath, srcPrefix))
		} else {
			// do not contain root dir
			if fi.IsDir() {
				return nil
			}
			// for supporting tar single file
			header.Name = filepath.Join(newFolder, filepath.Base(dir))
		}
		// if current file is whiteout, the header has been changed,
		// and we write a reg header into tar stream, but will not read its content
		// cause doing so will lead to error. (its size is 0)

		// if current target is dir, we will check if it is an opaque.
		// and set add Suffix WhiteoutOpaqueDir for opaque.
		// but we still need to write its original header into tar stream,
		// because we need to create dir on this original header.
		woh := writeWhiteout(header, fi, file)
		walkErr = tarWriter.WriteHeader(header)
		if walkErr != nil {
			return fmt.Errorf("failed to write original header, path: %s, err: %v", file, walkErr)
		}
		// this is a opaque, write the opaque header, in order to set header.PAXRecords with trusted.overlay.opaque:y
		// when decompress the tar stream.
		if woh != nil {
			walkErr = tarWriter.WriteHeader(woh)
			if walkErr != nil {
				return fmt.Errorf("failed to write opaque header, path: %s, err: %v", file, walkErr)
			}
		}
		// if not a dir && size > 0, write file content
		// the whiteout size is 0
		if header.Typeflag == tar.TypeReg && header.Size > 0 {
			var fHandler *os.File
			fHandler, walkErr = os.Open(filepath.Clean(file))
			if walkErr != nil {
				return walkErr
			}
			defer func() {
				if err := fHandler.Close(); err != nil {
					logger.Fatal("failed to close file")
				}
			}()
			bufWriter.Reset(tarWriter)
			defer bufWriter.Reset(nil)

			_, walkErr = io.Copy(bufWriter, fHandler)
			if walkErr != nil {
				return walkErr
			}

			walkErr = bufWriter.Flush()
			if walkErr != nil {
				return walkErr
			}
		}
		return nil
	})

	return err
}

func removePreviousFiles(path string) error {
	dir := filepath.Dir(path)
	existPath := path
	if base := filepath.Base(path); strings.HasPrefix(base, WhiteoutPrefix) {
		existPath = filepath.Join(dir, strings.TrimPrefix(base, WhiteoutPrefix))
	}

	if _, err := os.Stat(existPath); err == nil {
		if err := os.RemoveAll(existPath); err != nil {
			return err
		}
	}
	return nil
}

// decompress this will not change the metadata of original files
func decompress(src io.Reader, dst string, options Options) (int64, error) {
	// need to set umask to be 000 for current process.
	// there will be some files having higher permission like 777,
	// eventually permission will be set to 755 when umask is 022.
	oldMask := syscall.Umask(0)
	defer syscall.Umask(oldMask)

	err := os.MkdirAll(dst, 0755)
	if err != nil {
		return 0, err
	}

	reader := src
	if options.Compress {
		reader, err = gzip.NewReader(src)
		if err != nil {
			return 0, err
		}
	}

	var (
		size int64
		dirs []*tar.Header
		tr   = tar.NewReader(reader)
	)
	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return 0, err
		}
		size += header.Size
		// validate name against path traversal
		if !validRelPath(header.Name) {
			return 0, fmt.Errorf("tar contained invalid name error %q", header.Name)
		}

		// #nosec
		target := filepath.Join(dst, header.Name)
		err = removePreviousFiles(target)
		if err != nil {
			return 0, err
		}

		goon, err := readWhiteout(header, target)
		if err != nil {
			return 0, err
		}
		// it is a opaque / whiteout, don't write its file content.
		if !goon {
			continue
		}

		switch header.Typeflag {
		case tar.TypeDir:
			if _, err = os.Stat(target); err != nil {
				if err = os.MkdirAll(target, os.FileMode(header.Mode)); err != nil {
					return 0, err
				}
				dirs = append(dirs, header)
			}

		case tar.TypeReg:
			err = func() error {
				// regularly won't mkdir, unless add newFolder on compressing
				inErr := os.MkdirAll(filepath.Dir(target), 0700|0055)
				if inErr != nil {
					return inErr
				}
				// #nosec
				fileToWrite, inErr := os.OpenFile(target, os.O_CREATE|os.O_TRUNC|os.O_RDWR, os.FileMode(header.Mode))
				if inErr != nil {
					return inErr
				}

				defer func() {
					if err := fileToWrite.Close(); err != nil {
						logger.Fatal("failed to close file")
					}
				}()
				// nosemgrep: go.lang.security.decompression_bomb.potential-dos-via-decompression-bomb
				if _, inErr = io.Copy(fileToWrite, tr); inErr != nil {
					return inErr
				}
				// for not changing
				return os.Chtimes(target, header.AccessTime, header.ModTime)
			}()

			if err != nil {
				return 0, err
			}
		}
	}

	for _, h := range dirs {
		// #nosec
		path := filepath.Join(dst, h.Name)
		err = os.Chtimes(path, h.AccessTime, h.ModTime)
		if err != nil {
			return 0, err
		}
	}

	return size, nil
}

// check for path traversal and correct forward slashes
func validRelPath(p string) bool {
	if p == "" || strings.Contains(p, `\`) || strings.HasPrefix(p, "/") || strings.Contains(p, "../") {
		return false
	}
	return true
}
