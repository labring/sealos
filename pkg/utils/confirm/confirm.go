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

package confirm

import (
	"fmt"
	"regexp"
)

// Confirm is send the prompt and get result
func Confirm(prompt, cancel string) (bool, error) {
	var yesRx = regexp.MustCompile("^(?:y(?:es)?)$")
	var noRx = regexp.MustCompile("^(?:n(?:o)?)$")
	var input string
	for {
		fmt.Printf("%s Yes [y/yes], No [n/no] : ", prompt)
		_, err := fmt.Scanln(&input)
		if err != nil {
			return false, err
		}
		if yesRx.MatchString(input) {
			return true, nil
		}
		if noRx.MatchString(input) {
			fmt.Print(cancel)
			return false, nil
		}
	}
}
