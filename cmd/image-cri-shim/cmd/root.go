/*
Copyright © 2022 cuisongliu@qq.com

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
	"os"
	"os/signal"
	"syscall"

	"github.com/labring/image-cri-shim/pkg/types"

	"github.com/labring/sealos/pkg/version"

	"github.com/labring/image-cri-shim/pkg/shim"
	"github.com/pkg/errors"
	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/utils/logger"
)

var cfg *types.Config
var cfgFile string

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "image-cri-shim",
	Short: "cri for kubelet endpoint-image-service",
	// Uncomment the following line if your bare application
	// has an action associated with it:
	Version: fmt.Sprintf("%s-%s", version.Get().GitVersion, version.Get().GitCommit),
	Run: func(cmd *cobra.Command, args []string) {
		run(cfg)
	},
	PreRunE: func(cmd *cobra.Command, args []string) error {
		var err error
		cfg, err = types.Unmarshal(cfgFile)
		if err != nil {
			return errors.Wrap(err, "image shim config load error")
		}

		if err = cfg.PreProcess(); err != nil {
			return err
		}

		return nil
	},
}

// Execute adds all child commands to the root command and sets flags appropriately.
// This is called by main.main(). It only needs to happen once to the rootCmd.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

func init() {
	rootCmd.Flags().StringVarP(&cfgFile, "file", "f", "", "image shim root config")
}

func run(cfg *types.Config) {
	logger.Info("socket info shim: %v ,image: %v, registry: %v", cfg.ImageShimSocket, cfg.RuntimeSocket, cfg.Address)
	imgShim, err := shim.NewShim(cfg)
	if err != nil {
		logger.Fatal("failed to new image_shim, %s", err)
	}

	err = imgShim.Setup()
	if err != nil {
		logger.Fatal("failed to setup image_shim, %s", err)
	}

	err = imgShim.Start()
	if err != nil {
		logger.Fatal(fmt.Sprintf("failed to start image_shim, %s", err))
	}

	signalCh := make(chan os.Signal, 1)
	signal.Notify(signalCh, syscall.SIGINT, syscall.SIGTERM)

	stopCh := make(chan struct{}, 1)
	select {
	case <-signalCh:
		close(stopCh)
	case <-stopCh:
	}
	_ = os.Remove(cfg.ImageShimSocket)
	logger.Info("shutting down the image_shim")
}
