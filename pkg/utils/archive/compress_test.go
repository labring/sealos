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

//nolint:all
package archive

import (
	"fmt"
	"io"
	"os"
	"path"
	"testing"
)

// const fileContent = "content"

// type fileDef struct {
// 	name    string
// 	content string
// }

// type dirDef struct {
// 	path   string
// 	files  []fileDef
// 	subDir []dirDef
// }

func TestTarWithoutRootDir(t *testing.T) {
	arch := NewArchive(false, false)
	digest, _, err := arch.Digest("/Users/eric/Workspace/src/sealos/empty")
	if err != nil {
		t.Error(err)
	}
	fmt.Println(digest)
}

func TestTarWithRootDir(t *testing.T) {
	reader, err := NewArchive(true, false).TarOrGzip("testdata")
	if err != nil {
		t.Error(err)
	}
	tmp, err := os.Create("/var/lib/sealos/tmp/aaa.gzip")
	if err != nil {
		t.Error(err)
	}
	//tmp, err := os.CreateTemp("/tmp", "tar")
	_, err = io.Copy(tmp, reader)
	if err != nil {
		t.Error(err)
	}
}

func TestName(t *testing.T) {
	//err := os.Mkdir("abc", 0755)
	//if err != nil {
	//	t.Error(err)
	//}
	//err := unix.Setxattr("abc", "trusted.overlay.opaque", []byte{'y'}, 0)
	//if err != nil {
	//	t.Error(err)
	//}
	//fmt.Println(fm.String())
	data := path.Join("http://localhost:10250", "heathy")
	t.Log(data)
}
