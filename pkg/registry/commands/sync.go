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
	"context"
	"fmt"
	"time"

	imagecopy "github.com/containers/image/v5/copy"
	"github.com/containers/image/v5/types"
	"github.com/spf13/cobra"
	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/registry/sync"
	httputils "github.com/labring/sealos/pkg/utils/http"
)

func NewSyncRegistryCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:     "sync source dst",
		Aliases: []string{"copy"},
		Short:   "sync all images from one registry to another",
		Args:    cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runSync(cmd, args[0], args[1])
		},
	}
	return cmd
}

func runSync(cmd *cobra.Command, source, dst string) error {
	ctx := cmd.Context()
	out := cmd.OutOrStdout()

	sep := sync.ParseRegistryAddress(source)
	dep := sync.ParseRegistryAddress(dst)

	eg, _ := errgroup.WithContext(ctx)
	probeCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	eg.Go(func() error {
		return httputils.WaitUntilEndpointAlive(probeCtx, sep)
	})
	eg.Go(func() error {
		return httputils.WaitUntilEndpointAlive(probeCtx, dep)
	})
	if err := eg.Wait(); err != nil {
		return err
	}

	sysCtx := &types.SystemContext{
		DockerInsecureSkipTLSVerify: types.OptionalBoolTrue,
	}
	if err := sync.ToRegistry(ctx, sysCtx, sep, dep, out, imagecopy.CopySystemImage); err != nil {
		return err
	}
	fmt.Fprintln(out, "Sync completed")
	return nil
}
