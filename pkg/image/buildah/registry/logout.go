// Copyright © 2022 buildah.
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

package registry

import (
	"os"

	"github.com/containers/common/pkg/auth"
	"github.com/pkg/errors"
)

func (*RegistryService) Logout(domain string) error {
	var (
		opts = auth.LogoutOptions{
			Stdout:             os.Stdout,
			AcceptRepositories: true,
			AuthFile:           auth.GetDefaultAuthFile(),
			All:                false,
		}
		tlsVerify = false
	)

	if err := setXDGRuntimeDir(); err != nil {
		return err
	}

	systemContext, err := getSystemContext(tlsVerify)
	if err != nil {
		return errors.Wrapf(err, "error building system context")
	}
	return auth.Logout(systemContext, &opts, []string{domain})
}
