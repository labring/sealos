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
	"regexp"

	"github.com/manifoldco/promptui"

	"github.com/labring/sealos/pkg/utils/logger"
)

// Confirm is send the prompt and get result
func Confirm(prompt, cancel string) (bool, error) {
	var yesRx = regexp.MustCompile("^(?:y(?:es)?)$")
	var noRx = regexp.MustCompile("^(?:n(?:o)?)$")
	promptLabel := "Yes [y/yes], No [n/no]"
	logger.Info(prompt)

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
	}
	logger.Warn(cancel)
	return false, nil
}

func PasswordInput(promptInput string) string {
	validate := func(input string) error {
		if len(input) < 6 {
			return errors.New("password must have more than 6 characters")
		}
		return nil
	}
	if promptInput == "" {
		promptInput = "Please input password"
	}
	prompt := promptui.Prompt{
		Label:    promptInput,
		Validate: validate,
		Mask:     '*',
	}

	result, err := prompt.Run()

	if err != nil {
		logger.Error("Prompt failed %v\n", err)
		return ""
	}

	return result
}

func SelectInput(promptInput string, items []string) string {
	if promptInput == "" {
		promptInput = "Please select"
	}
	if len(items) == 0 {
		logger.Error("select items is empty")
		return ""
	}
	prompt := promptui.Select{
		Label: promptInput,
		Items: items,
	}

	_, result, err := prompt.Run()

	if err != nil {
		logger.Error("Prompt failed %v\n", err)
		return ""
	}

	return result
}

func Input(promptInput, defaultValue string, validate func(input string) error) string {
	prompt := promptui.Prompt{
		Label:    promptInput,
		Validate: validate,
		Default:  defaultValue,
	}

	result, err := prompt.Run()
	if err != nil {
		logger.Error("Prompt failed %v\n", err)
		return ""
	}
	return result
}
