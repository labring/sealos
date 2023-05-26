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
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"time"

	"github.com/distribution/distribution/v3/configuration"
	"github.com/google/go-containerregistry/pkg/registry"
	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/registry/handler"
	"github.com/labring/sealos/pkg/utils/logger"
)

func newRegistryServeFilesystemCommand() *cobra.Command {
	var (
		port           int
		disableLogging bool
		logLevel       string
	)
	cmd := &cobra.Command{
		Use:     "filesystem",
		Aliases: []string{"fs"},
		Short:   "run a docker distribution registry server for dir",
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			config, err := handler.NewConfig(args[0], port)
			if err != nil {
				return err
			}
			if !disableLogging {
				logger.Info("serving on %s", config.HTTP.Addr)
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

func newRegistryServeInMemCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "inmem",
		Short: "Serve an in-memory registry implementation",
		Long: `This sub-command serves an in-memory registry implementation on port :8080 (or $PORT)

The command blocks while the server accepts pushes and pulls.

Contents are only stored in memory, and when the process exits, pushed data is lost.`,
		Args: cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			ctx := cmd.Context()
			port := os.Getenv("PORT")
			if port == "" {
				port = "0"
			}
			listener, err := net.Listen("tcp", "localhost:"+port)
			if err != nil {
				return err
			}
			porti := listener.Addr().(*net.TCPAddr).Port
			port = fmt.Sprintf("%d", porti)

			s := &http.Server{
				ReadHeaderTimeout: 5 * time.Second, // prevent slowloris, quiet linter
				Handler:           registry.New(),
			}
			logger.Info("serving on port %s", port)

			errCh := make(chan error)
			go func() { errCh <- s.Serve(listener) }()

			<-ctx.Done()
			logger.Info("shutting down...")
			if err := s.Shutdown(ctx); err != nil {
				return err
			}

			if err := <-errCh; !errors.Is(err, http.ErrServerClosed) {
				return err
			}
			return nil
		},
	}
}

func NewServeRegistryCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "serve",
		Short: "run a docker distribution registry server",
	}
	cmd.AddCommand(newRegistryServeFilesystemCommand())
	cmd.AddCommand(newRegistryServeInMemCommand())
	return cmd
}
