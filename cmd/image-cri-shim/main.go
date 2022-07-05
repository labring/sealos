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
	"encoding/base64"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/labring/image-cri-shim/pkg/cri"
	"github.com/labring/image-cri-shim/pkg/glog"
	"github.com/labring/image-cri-shim/pkg/server"
	"github.com/labring/image-cri-shim/pkg/shim"
	"github.com/labring/image-cri-shim/pkg/utils"
	"github.com/labring/sealos/pkg/utils/version"
	"github.com/pkg/errors"
	"github.com/spf13/cobra"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

var shimSocket, criSocket string
var force bool

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "image-cri-shim",
	Short: "cri for kubelet endpoint-image-service",
	// Uncomment the following line if your bare application
	// has an action associated with it:
	Version: version.Get().String(),
	Run: func(cmd *cobra.Command, args []string) {

		run(shimSocket, criSocket)
	},
	PreRunE: func(cmd *cobra.Command, args []string) error {
		data, err := utils.Unmarshal(server.ConfigFile)
		if err != nil {
			return errors.Wrap(err, "image shim config load error")
		}
		shimSocket, _, _ = unstructured.NestedString(data, "shim")
		glog.Infof("shim-socket: %s", shimSocket)
		criSocket, _, _ = unstructured.NestedString(data, "cri")
		glog.Infof("cri-socket: %s", criSocket)
		server.SealosHub, _, _ = unstructured.NestedString(data, "address")
		glog.Infof("hub-address: %s", server.SealosHub)
		force, _, _ = unstructured.NestedBool(data, "force")
		glog.Infof("force: %v", force)
		server.Debug, _, _ = unstructured.NestedBool(data, "debug")
		glog.Infof("debug: %v", server.Debug)
		imageDir, _, _ := unstructured.NestedString(data, "image")
		glog.Infof("image-dir: %v", imageDir)
		server.Auth, _, _ = unstructured.NestedString(data, "auth")
		if server.Auth != "" {
			glog.Infof("auth: %v", server.Auth)
			server.Base64Auth = base64.StdEncoding.EncodeToString([]byte(server.Auth))
			glog.Infof("base64 auth: %v", server.Base64Auth)
		}

		if imageDir != "" {
			server.RunLoad()
		}
		if shimSocket == "" {
			shimSocket = server.SealosShimSock
		}

		if server.SealosHub == "" {
			glog.Warning("registry addr is empty")
		}
		if criSocket == "" {
			socket, err := cri.DetectCRISocket()
			if err != nil {
				return err
			}
			criSocket = socket
		}
		if !force {
			if !isExist(criSocket) {
				return errors.New("cri is running?")
			}
		}
		return nil
	},
}

func isExist(fileName string) bool {
	if _, err := os.Stat(fileName); err != nil {
		return os.IsExist(err)
	}
	return true
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
	rootCmd.Flags().StringVarP(&server.ConfigFile, "file", "f", "", "config file top image shim")
}

func run(socket string, criSocket string) {
	options := shim.Options{
		ShimSocket:  socket,
		ImageSocket: criSocket,
	}
	glog.Infof("socket info shim: %v ,image: %v, registry: %v", socket, criSocket, server.SealosHub)
	_shim, err := shim.NewShim(options)
	if err != nil {
		glog.Fatalf("failed to new _shim, %s", err)
	}

	err = _shim.Setup()
	if err != nil {
		glog.Fatalf("failed to setup image _shim, %s", err)
	}

	err = _shim.Start()
	if err != nil {
		glog.Fatalf(fmt.Sprintf("failed to start image _shim, %s", err))
	}

	signalCh := make(chan os.Signal, 1)
	signal.Notify(signalCh, syscall.SIGINT, syscall.SIGTERM)

	stopCh := make(chan struct{}, 1)
	select {
	case <-signalCh:
		close(stopCh)
	case <-stopCh:
	}
	_ = os.Remove(socket)
	glog.Infof("Shutting down the image _shim")
}
