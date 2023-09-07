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

	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/utils/initsystem"
)

var (
	initsystemInterface initsystem.InitSystem
)

func newInitSystemCmd() *cobra.Command {
	var initsystemCmd = &cobra.Command{
		Use:   "initsystem",
		Short: "init system",
	}
	initsystemCmd.AddCommand(newInitSystemEnableCmd())
	initsystemCmd.AddCommand(newInitSystemStartCmd())
	initsystemCmd.AddCommand(newInitSystemStopCmd())
	initsystemCmd.AddCommand(newInitSystemRestartCmd())
	initsystemCmd.AddCommand(newInitSystemIsExistsCmd())
	initsystemCmd.AddCommand(newInitSystemIsEnabledCmd())
	initsystemCmd.AddCommand(newInitSystemIsActiveCmd())
	return initsystemCmd
}

func newInitSystemStartCmd() *cobra.Command {
	var initsystemCmd = &cobra.Command{
		Use:   "start",
		Short: "start initsystem service",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return initsystemInterface.ServiceStart(args[0])
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			return initsystemInit()
		},
	}
	return initsystemCmd
}

func newInitSystemEnableCmd() *cobra.Command {
	var initsystemCmd = &cobra.Command{
		Use:   "enable",
		Short: "enable initsystem service",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return initsystemInterface.ServiceEnable(args[0])
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			return initsystemInit()
		},
	}
	return initsystemCmd
}

func newInitSystemStopCmd() *cobra.Command {
	var initsystemCmd = &cobra.Command{
		Use:   "stop",
		Short: "stop initsystem service",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return initsystemInterface.ServiceStop(args[0])
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			return initsystemInit()
		},
	}
	return initsystemCmd
}

func newInitSystemRestartCmd() *cobra.Command {
	var initsystemCmd = &cobra.Command{
		Use:   "restart",
		Short: "restart initsystem service",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return initsystemInterface.ServiceRestart(args[0])
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			return initsystemInit()
		},
	}
	return initsystemCmd
}

func newInitSystemIsExistsCmd() *cobra.Command {
	var initsystemCmd = &cobra.Command{
		Use:   "is-exists",
		Short: "is exists initsystem service",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			out := initsystemInterface.ServiceExists(args[0])
			fmt.Println(out)
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			return initsystemInit()
		},
	}
	return initsystemCmd
}

func newInitSystemIsEnabledCmd() *cobra.Command {
	var initsystemCmd = &cobra.Command{
		Use:   "is-enabled",
		Short: "is enabled initsystem service",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			out := initsystemInterface.ServiceIsEnabled(args[0])
			fmt.Println(out)
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			return initsystemInit()
		},
	}
	return initsystemCmd
}

func newInitSystemIsActiveCmd() *cobra.Command {
	var initsystemCmd = &cobra.Command{
		Use:   "is-active",
		Short: "is active initsystem service",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			out := initsystemInterface.ServiceIsActive(args[0])
			fmt.Println(out)
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			return initsystemInit()
		},
	}
	return initsystemCmd
}

func initsystemInit() error {
	inte, err := initsystem.GetInitSystem()
	if err != nil {
		return err
	}
	initsystemInterface = inte
	return nil
}
