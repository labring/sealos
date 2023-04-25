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
	"errors"
	"fmt"
	"regexp"

	"github.com/manifoldco/promptui"
)

// Confirm is send the prompt and get result
func Confirm(prompt, cancel string) (bool, error) {
	var yesRx = regexp.MustCompile("^(?:y(?:es)?)$")
	var noRx = regexp.MustCompile("^(?:n(?:o)?)$")
	promptLabel := fmt.Sprintf("%s Yes [y/yes], No [n/no]", prompt)

	validate := func(input string) error {
		if !yesRx.MatchString(input) && !noRx.MatchString(input) {
			return errors.New("invalid input, please enter 'y', 'yes', 'n', or 'no'")
		}
		return nil
	}

	promptObj := promptui.Prompt{
		Label:    promptLabel,
		Validate: validate,
	}

	result, err := promptObj.Run()
	if err != nil {
		return false, err
	}

	if yesRx.MatchString(result) {
		return true, nil
	} else {
		fmt.Println(cancel)
		return false, nil
	}
}
