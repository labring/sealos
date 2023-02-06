// Copyright © 2021 Alibaba Group Holding Ltd.
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

package checker

import (
	"bytes"
	"fmt"
	"io"
	"os"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

const (
	PhasePre  = "Pre"
	PhasePost = "Post"
)

// Interface Define checkers when pre or post install, like checker node status, checker pod status...
type Interface interface {
	Name() string
	// Check checks the cluster status,which will return two value list, the first is warnings, the second is error.
	Check(cluster *v2.Cluster, phase string) (warnings, errorList []error)
}

func RunCheckList(list []Interface, cluster *v2.Cluster, phase string) error {
	var errsBuffer bytes.Buffer
	for _, c := range list {
		name := c.Name()
		warnings, errs := c.Check(cluster, phase)

		for _, w := range warnings {
			_, err := io.WriteString(os.Stdout, fmt.Sprintf("\t[WARNING %s]: %v\n", name, w))
			if err != nil {
				return err
			}
		}
		for _, i := range errs {
			errsBuffer.WriteString(fmt.Sprintf("\t[ERROR %s]: %v\n", name, i.Error()))
		}
	}
	if errsBuffer.Len() > 0 {
		return fmt.Errorf(errsBuffer.String())
	}

	return nil
}
