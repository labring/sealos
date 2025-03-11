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
	"fmt"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

const (
	PhasePre  = "Pre"
	PhasePost = "Post"
)

// Interface Define checkers when pre or post install, like checker node status, checker pod status...
type Interface interface {
	Check(cluster *v2.Cluster, phase string) error
}

func RunCheckList(list []Interface, cluster *v2.Cluster, phase string) error {
	for _, l := range list {
		if err := l.Check(cluster, phase); err != nil {
			return fmt.Errorf("failed to run checker: %v", err)
		}
	}
	return nil
}
