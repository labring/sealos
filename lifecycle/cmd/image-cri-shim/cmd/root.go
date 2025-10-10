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
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/labring/image-cri-shim/pkg/shim"
	"github.com/labring/image-cri-shim/pkg/types"
	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/version"
)

var cfg *types.Config
var shimAuth *types.ShimAuthConfig
var cfgFile string

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "image-cri-shim",
	Short: "cri for kubelet endpoint-image-service",
	// Uncomment the following line if your bare application
	// has an action associated with it:
	Version: fmt.Sprintf("%s-%s", version.Get().GitVersion, version.Get().GitCommit),
	Run: func(cmd *cobra.Command, args []string) {
		run(cfg, shimAuth)
	},
	PreRunE: func(cmd *cobra.Command, args []string) error {
		var err error
		cfg, err = types.Unmarshal(cfgFile)
		if err != nil {
			return fmt.Errorf("image shim config load error: %w", err)
		}
		shimAuth, err = cfg.PreProcess()
		if err != nil {
			return fmt.Errorf("image shim config pre process error: %w", err)
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
	rootCmd.Flags().StringVarP(&cfgFile, "file", "f", types.DefaultImageCRIShimConfig, "image shim root config")
}

func run(cfg *types.Config, auth *types.ShimAuthConfig) {
	logger.Info("socket info shim: %v ,image: %v, registry: %v", cfg.ImageShimSocket, cfg.RuntimeSocket, cfg.Address)
	imgShim, err := shim.NewShim(cfg, auth)
	if err != nil {
		logger.Fatal("failed to new image_shim, %s", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	err = imgShim.Setup()
	if err != nil {
		logger.Fatal("failed to setup image_shim, %s", err)
	}

	err = imgShim.Start()
	if err != nil {
		logger.Fatal(fmt.Sprintf("failed to start image_shim, %s", err))
	}

	watchDone := make(chan struct{})
	go func() {
		defer close(watchDone)
		if err := watchAuthConfig(ctx, cfgFile, imgShim, cfg.ReloadInterval.Duration); err != nil {
			logger.Error("config watcher stopped with error: %v", err)
		}
	}()

	signalCh := make(chan os.Signal, 1)
	signal.Notify(signalCh, syscall.SIGINT, syscall.SIGTERM)

	<-signalCh
	cancel()
	<-watchDone
	imgShim.Stop()
	_ = os.Remove(cfg.ImageShimSocket)
	logger.Info("shutting down the image_shim")
}

func watchAuthConfig(ctx context.Context, path string, imgShim shim.Shim, interval time.Duration) error {
	if path == "" {
		logger.Warn("config file path is empty, skip dynamic auth reload")
		return nil
	}

	logger.Info("start watching shim config: %s", path)
	if interval <= 0 {
		interval = types.DefaultReloadInterval
	}

	lastHash := ""
	if data, err := os.ReadFile(path); err == nil {
		if cfg, err := types.UnmarshalData(data); err == nil {
			cfg.RegistryDir = types.NormalizeRegistryDir(cfg.RegistryDir)
			digest, err := types.RegistryDirDigest(cfg.RegistryDir)
			if err != nil {
				logger.Warn("failed to fingerprint registry.d %s: %v", cfg.RegistryDir, err)
			} else {
				sum := sha256.Sum256(append(data, digest...))
				lastHash = hex.EncodeToString(sum[:])
			}
		} else {
			logger.Warn("failed to parse shim config %s: %v", path, err)
		}
	}

	currentInterval := interval
	// ticker acts like a pulse; changing the config lets us tune the heartbeat without restart.
	ticker := time.NewTicker(currentInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			data, err := os.ReadFile(path)
			if err != nil {
				logger.Warn("failed to read shim config %s: %v", path, err)
				continue
			}
			cfg, err := types.UnmarshalData(data)
			if err != nil {
				logger.Warn("failed to parse shim config %s: %v", path, err)
				continue
			}
			cfg.RegistryDir = types.NormalizeRegistryDir(cfg.RegistryDir)
			digest, err := types.RegistryDirDigest(cfg.RegistryDir)
			if err != nil {
				logger.Warn("failed to fingerprint registry.d %s: %v", cfg.RegistryDir, err)
				continue
			}
			sum := sha256.Sum256(append(data, digest...))
			hash := hex.EncodeToString(sum[:])
			if hash == lastHash {
				continue
			}
			auth, err := cfg.PreProcess()
			if err != nil {
				logger.Warn("failed to preprocess shim config %s: %v", path, err)
				continue
			}
			imgShim.UpdateAuth(auth)
			lastHash = hash
			logger.Info("reloaded shim auth configuration from %s", path)
			newInterval := cfg.ReloadInterval.Duration
			if newInterval <= 0 {
				newInterval = types.DefaultReloadInterval
			}
			if newInterval != currentInterval {
				ticker.Stop()
				ticker = time.NewTicker(newInterval)
				currentInterval = newInterval
				logger.Info("updated reload interval to %s", newInterval)
			}
		}
	}
}
