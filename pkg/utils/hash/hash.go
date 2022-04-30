// Copyright © 2021 sealos.
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

package hash

import (
	"crypto/md5" // #nosec
	"encoding/hex"
	"fmt"
	"hash"
	"io"
	"os"
	"path/filepath"

	"github.com/davecgh/go-spew/spew"

	"github.com/labring/sealos/pkg/utils/logger"
)

func MD5(body []byte) string {
	bytes := md5.Sum(body) // #nosec
	return hex.EncodeToString(bytes[:])
}

//FileMD5 count file md5
func FileMD5(path string) string {
	file, err := os.Open(filepath.Clean(path))
	if err != nil {
		logger.Error("get file md5 failed %v", err)
		return ""
	}

	m := md5.New() // #nosec
	if _, err := io.Copy(m, file); err != nil {
		logger.Error("get file md5 failed %v", err)
		return ""
	}

	fileMd5 := fmt.Sprintf("%x", m.Sum(nil))
	return fileMd5
}

// ToString gen hash string base on actual values of the nested objects.
func ToString(obj interface{}) string {
	hasher := md5.New()
	DeepHashObject(hasher, obj)
	return hex.EncodeToString(hasher.Sum(nil)[0:])
}

//func Hash(data interface{}) string {
//	dataByte, _ := json.Marshal(data)
//	sum := sha256.Sum256(dataByte)
//	return fmt.Sprintf("%x", sum)
//}

// DeepHashObject writes specified object to hash using the spew library
// which follows pointers and prints actual values of the nested objects
// ensuring the hash does not change when a pointer changes.
func DeepHashObject(hasher hash.Hash, objectToWrite interface{}) {
	hasher.Reset()
	printer := spew.ConfigState{
		Indent:         " ",
		SortKeys:       true,
		DisableMethods: true,
		SpewKeys:       true,
	}
	printer.Fprintf(hasher, "%#v", objectToWrite)
}
