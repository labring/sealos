/*
Copyright 2023 fengxsong@outlook.com

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
package commands

import (
	"github.com/distribution/distribution/v3/configuration"
	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/registry/handler"
)

func NewServeRegistryCommand() *cobra.Command {
	var (
		port           int
		disableLogging bool
		logLevel       string
	)
	cmd := &cobra.Command{
		Use:   "serve",
		Short: "run a docker distribution registry server for dir",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			config, err := handler.NewConfig(args[0], port)
			if err != nil {
				return err
			}
			config.Log.Level = configuration.Loglevel(logLevel)
			config.Log.AccessLog.Disabled = disableLogging
			errCh := handler.Run(cmd.Context(), config)
			return <-errCh
		},
	}
	cmd.Flags().IntVarP(&port, "port", "p", 0, "listening port, default is random unused port")
	cmd.Flags().BoolVar(&disableLogging, "disable-logging", false, "disable logging output")
	cmd.Flags().StringVar(&logLevel, "log-level", "error", "configure logging level")
	return cmd
}
