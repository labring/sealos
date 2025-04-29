// Copyright © 2022 The sealos Authors.
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

/*
import from "k8s.io/kubernetes/pkg/util/hash"
*/

package hash

import (
	"crypto/md5"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"hash"

	"github.com/davecgh/go-spew/spew"
)

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

// HashToString gen hash string base on actual values of the nested objects.
func HashToString(obj interface{}) string {
	hasher := md5.New()
	DeepHashObject(hasher, obj)
	return hex.EncodeToString(hasher.Sum(nil)[0:])

}

func Hash(data interface{}) string {
	dataByte, _ := json.Marshal(data)
	sum := sha256.Sum256(dataByte)
	return fmt.Sprintf("%x", sum)
}
