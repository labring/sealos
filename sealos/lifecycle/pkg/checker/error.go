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

import "fmt"

type PodNotReadyError struct {
	name string
}

func (e *PodNotReadyError) Error() string {
	return fmt.Sprintf("pod  %s is not ready", e.name)
}

type NotFindReadyTypeError struct {
	name string
}

func (e *NotFindReadyTypeError) Error() string {
	return fmt.Sprintf("pod %s has't Ready Type", e.name)
}
