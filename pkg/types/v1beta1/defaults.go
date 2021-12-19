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

package v1beta1

import (
	"math/rand"
	"time"
)

func Default(infra *Infra, fn func(infra *Infra) error) error {
	if string(infra.Spec.Platform) == "" {
		infra.Spec.Platform = AMD64
	}
	if infra.Spec.Auth.User == "" {
		infra.Spec.Auth.User = "root"
	}
	if infra.Spec.Masters.CPU <= 0 {
		infra.Spec.Masters.CPU = 2
	}
	if infra.Spec.Masters.Memory <= 0 {
		infra.Spec.Masters.Memory = 4
	}
	if len(infra.Spec.Masters.Disks.System) == 0 {
		infra.Spec.Masters.Disks.System = "40"
	}
	if infra.Spec.Auth.Passwd == "" {
		infra.Spec.Auth.Passwd = createPassword()
	}
	return fn(infra)
}

const (
	digits         = "0123456789"
	specials       = "~=+%^*/()[]{}/!@#$?|"
	letter         = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
	passwordLength = 16
)

func createPassword() string {
	rand.Seed(time.Now().UnixNano())
	all := digits + specials + letter
	length := passwordLength
	buf := make([]byte, length)
	buf[0] = digits[rand.Intn(len(digits))]
	buf[1] = specials[rand.Intn(len(specials))]
	for i := 2; i < length; i++ {
		buf[i] = all[rand.Intn(len(all))]
	}
	rand.Shuffle(len(buf), func(i, j int) {
		buf[i], buf[j] = buf[j], buf[i]
	})
	return string(buf)
}
