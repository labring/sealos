/*
Copyright 2023 cuisongliu@qq.com.

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

package main

import (
	"github.com/go-bindata/go-bindata"

	"github.com/labring/sealos/pkg/utils/logger"
)

//go:generate go run main.go

func main() {
	logger.Info("generator bindata start")
	bc := &bindata.Config{
		Input: []bindata.InputConfig{
			{
				Path:      "kubeadm",
				Recursive: false,
			},
		},
		Package:    "kubeadm",
		NoCompress: true,
		NoMemCopy:  true,
		NoMetadata: true,
		Output:     "kubeadm/zz_generated_kubeadm.go",
	}
	if err := bindata.Translate(bc); err != nil {
		logger.Fatal(err)
	}
	logger.Info("generator bindata success")
}
