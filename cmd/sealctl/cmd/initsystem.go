/*
Copyright 2022 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package cmd

import (
	"fmt"
	"strings"

	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/utils/initsystem"
)

var (
	initsystemInterface initsystem.InitSystem
)

func newInitSystemCmd() *cobra.Command {
	var initsystemCmd = &cobra.Command{
		Use:   "initsystem",
		Short: "init system management",
	}
	initsystemCmd.AddCommand(createInitSystemSubCommand("enable", func(s string) error {
		return initsystemInterface.ServiceEnable(s)
	}))
	initsystemCmd.AddCommand(createInitSystemSubCommand("start", func(s string) error {
		return initsystemInterface.ServiceStart(s)
	}))
	initsystemCmd.AddCommand(createInitSystemSubCommand("stop", func(s string) error {
		return initsystemInterface.ServiceStop(s)
	}))
	initsystemCmd.AddCommand(createInitSystemSubCommand("restart", func(s string) error {
		return initsystemInterface.ServiceRestart(s)
	}))
	initsystemCmd.AddCommand(createInitSystemSubCommand("is-exists", func(s string) error {
		fmt.Println(initsystemInterface.ServiceExists(s))
		return nil
	}))
	initsystemCmd.AddCommand(createInitSystemSubCommand("is-enabled", func(s string) error {
		fmt.Println(initsystemInterface.ServiceIsEnabled(s))
		return nil
	}))
	initsystemCmd.AddCommand(createInitSystemSubCommand("is-active", func(s string) error {
		fmt.Println(initsystemInterface.ServiceIsActive(s))
		return nil
	}))

	return initsystemCmd
}

func createInitSystemSubCommand(verb string, runE func(string) error) *cobra.Command {
	var short string
	if strings.HasPrefix(verb, "is-") {
		short = fmt.Sprintf("check if the initsystem service is %s", strings.TrimPrefix(verb, "is-"))
	} else {
		short = fmt.Sprintf("%s the initsystem service", verb)
	}
	return &cobra.Command{
		Use:   verb,
		Short: short,
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runE(args[0])
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			return initsystemInit()
		},
	}
}

func initsystemInit() error {
	inte, err := initsystem.GetInitSystem()
	if err != nil {
		return err
	}
	initsystemInterface = inte
	return nil
}
