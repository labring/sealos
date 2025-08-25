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
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"hash"
	"io"
	"os"
	"path/filepath"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/davecgh/go-spew/spew"
)

func Digest(body []byte) string {
	bytes := sha256.Sum256(body)
	return hex.EncodeToString(bytes[:])
}

// FileDigest generates the sha256 digest of a file.
func FileDigest(path string) string {
	file, err := os.Open(filepath.Clean(path))
	if err != nil {
		logger.Error("get file digest failed %v", err)
		return ""
	}

	h := sha256.New()
	if _, err := io.Copy(h, file); err != nil {
		logger.Error("get file digest failed %v", err)
		return ""
	}

	fileDigest := fmt.Sprintf("%x", h.Sum(nil))
	return fileDigest
}

// ToString gen hash string base on actual values of the nested objects.
func ToString(obj interface{}) string {
	hasher := sha256.New()
	DeepHashObject(hasher, obj)
	return hex.EncodeToString(hasher.Sum(nil)[0:])
}

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
