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

package run

import (
	"github.com/labring/sealos/test/e2e/testhelper/settings"

	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/test/e2e/testhelper/cmd"
)

var _ Interface = &fakeSingleClient{}

func NewFakeSingleClient() Interface {
	name := "default"
	return &fakeSingleClient{
		SealosCmd:   cmd.NewSealosCmd(settings.E2EConfig.SealosBinPath, &cmd.LocalCmd{}),
		clusterName: name,
	}
}

type fakeSingleClient struct {
	*cmd.SealosCmd
	v1beta1.Cluster
	clusterName string
}

func (c *fakeSingleClient) Run(images ...string) error {
	return c.SealosCmd.Run(&cmd.RunOptions{
		Cluster: c.clusterName,
		Images:  images,
	})
}

func (c *fakeSingleClient) Apply(file string) error {
	return c.SealosCmd.Apply(&cmd.ApplyOptions{
		Clusterfile: file,
	})
}

func (c *fakeSingleClient) Reset() error {
	return c.SealosCmd.Reset(&cmd.ResetOptions{
		Cluster: "default",
		Force:   true,
	})
}
