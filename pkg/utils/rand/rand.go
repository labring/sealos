/*
Copyright 2021 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package rand

import (
	"bytes"
	crand "crypto/rand"
	"math/big"
	"math/rand"
	"time"
)

func Rand(a int) int {
	rand.Seed(time.Now().Unix())
	return rand.Intn(a)
}

func Generator(len int) string {
	var container string
	var str = "abcdefghijklmnopqrstuvwxyz1234567890"
	b := bytes.NewBufferString(str)
	length := b.Len()
	bigInt := big.NewInt(int64(length))
	for i := 0; i < len; i++ {
		randomInt, _ := crand.Int(crand.Reader, bigInt)
		container += string(str[randomInt.Int64()])
	}
	return container
}
