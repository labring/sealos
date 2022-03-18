//nolint
package archive

import (
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"testing"
)

const basePath = "/tmp"

const fileContent = "content"

type fileDef struct {
	name    string
	content string
}

type dirDef struct {
	path   string
	files  []fileDef
	subDir []dirDef
}

var filesToCreate = []dirDef{
	{
		path: "testDirA",
		files: []fileDef{
			{
				name:    "testFileA",
				content: fileContent,
			},
			{
				name:    "testFileB",
				content: fileContent,
			},
		},
		subDir: []dirDef{
			{
				path: "testDirC",
				files: []fileDef{
					{
						name:    "testFileA",
						content: fileContent,
					},
					{
						name:    "testFileB",
						content: fileContent,
					},
				},
			},
		},
	},
	{
		path: "testDirB",
		files: []fileDef{
			{
				name:    "testFileA",
				content: fileContent,
			},
			{
				name:    "testFileB",
				content: fileContent,
			},
		},
	},
}

func makeDir(root string, d dirDef) error {
	currentDir := filepath.Join(root, d.path)
	err := os.MkdirAll(currentDir, 0755)
	if err != nil {
		return err
	}

	for _, file := range d.files {
		_, err = os.Create(filepath.Join(currentDir, file.name))
		if err != nil {
			return err
		}
	}

	for _, sub := range d.subDir {
		err = makeDir(currentDir, sub)
		if err != nil {
			return err
		}
	}
	return nil
}

func TestTarWithoutRootDir(t *testing.T) {
	arch := NewArchive(false, false)
	digest, _, err := arch.Digest("/Users/eric/Workspace/src/sealer/empty")
	if err != nil {
		t.Error(err)
	}
	fmt.Println(digest)
}

func TestTarWithRootDir(t *testing.T) {
	reader, err := NewArchive(false, false).TarOrGzip("testdata")
	if err != nil {
		t.Error(err)
	}
	tmp, err := os.Create("/tmp/sealos/temp/aaa.tar")
	//tmp, err := ioutil.TempFile("/tmp", "tar")
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
