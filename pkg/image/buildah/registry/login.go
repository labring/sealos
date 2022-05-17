// Copyright © 2022 buidah.
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
	"context"
	"os"

	"github.com/containers/common/pkg/auth"
	"github.com/pkg/errors"
)

func (*RegistryService) Login(domain, username, passwd string) error {
	var (
		opts = loginReply{
			loginOpts: auth.LoginOptions{
				Stdin:              os.Stdin,
				Stdout:             os.Stdout,
				AcceptRepositories: true,
				AuthFile:           auth.GetDefaultAuthFile(),
				CertDir:            "",
				Password:           passwd,
				Username:           username,
				StdinPassword:      false,
				GetLoginSet:        false,
				Verbose:            false,
			},
			tlsVerify: false,
			getLogin:  true,
		}
	)
	if err := setXDGRuntimeDir(); err != nil {
		return err
	}
	systemContext, err := getSystemContext(opts.tlsVerify)
	if err != nil {
		return errors.Wrapf(err, "error building system context")
	}

	return auth.Login(context.TODO(), systemContext, &opts.loginOpts, []string{domain})
}
