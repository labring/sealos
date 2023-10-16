/*
Copyright 2022 cuisongliu@qq.com.

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

package passwd

import (
	"encoding/base64"

	"golang.org/x/crypto/bcrypt"
)

func Htpasswd(username, password string) string {
	pwdHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return ""
	}
	return username + ":" + string(pwdHash)
}

func LoginAuth(username, password string) string {
	return base64.StdEncoding.EncodeToString([]byte(username + ":" + password))
}

func LoginAuthDecode(auth string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(auth)
	if data != nil {
		return string(data), nil
	}
	return "", err
}
