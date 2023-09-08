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

package utils

import (
	"context"
	"fmt"
	"strconv"

	"github.com/labring/sealos/pkg/ssh"
	"golang.org/x/sync/errgroup"
)

func WaitSSHReady(ssh ssh.Interface, _ int, hosts ...string) error {
	eg, _ := errgroup.WithContext(context.Background())
	for i := range hosts {
		host := hosts[i]
		eg.Go(func() (err error) {
			timestamp, err := ssh.CmdToString(host, "date +%s", "")
			if err != nil {
				return fmt.Errorf("ssh is not ready")
			}
			_, err = strconv.Atoi(timestamp)
			if err != nil {
				return fmt.Errorf("ssh is not ready")
			}
			return nil
		})
	}
	return eg.Wait()
}
