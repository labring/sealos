// Copyright © 2023 sealos.
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

package api

import (
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
)

const UserYaml = `
apiVersion: user.sealos.io/v1
kind: User
metadata:
  name: ${name}
	annotations:
		user.sealos.io/display-name: ${name}
spec:
	csrExpirationSeconds: 1000000000
`

func GetUser(name string) (*userv1.User, error) {
	gvr := userv1.GroupVersion.WithResource("users")
	var user userv1.User
	if err := baseapi.GetObject("", name, gvr, &user); err != nil {
		return nil, err
	}
	return &user, nil
}
