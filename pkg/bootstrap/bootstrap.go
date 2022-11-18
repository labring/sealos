// Copyright © 2022 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package bootstrap

import (
	"context"

	"golang.org/x/sync/errgroup"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
)

type Interface interface {
	Preflight(hosts ...string) error
	Init(hosts ...string) error
	RegisterDeps(deps ...Dependency)
	ApplyDeps(hosts ...string) error
	Reset(hosts ...string) error
}

type realBootstrap struct {
	ctx  Context
	is   *ImageShim
	deps []Dependency
}

type shellWrapper func(string, string) string

func New(cluster *v2.Cluster) Interface {
	ctx := NewContextFrom(cluster)
	bs := &realBootstrap{
		ctx:  ctx,
		is:   NewImageShimHelper(ctx.GetExecer(), cluster.GetRegistryIP()),
		deps: make([]Dependency, 0),
	}
	// register builtin deps
	bs.RegisterDeps(&registryApplier{})
	return bs
}

func (bs *realBootstrap) Preflight(hosts ...string) error {
	shimCmd := bs.is.ApplyCMD(bs.ctx.GetData().RootFSPath())
	return runParallel(hosts, func(host string) error {
		cmds := []string{bs.ctx.GetShellWrapper()(host, bs.ctx.GetBash().CheckBash()), shimCmd}
		return bs.ctx.GetExecer().CmdAsync(host, cmds...)
	})
}

func (bs *realBootstrap) Init(hosts ...string) error {
	return runParallel(hosts, func(host string) error {
		cmds := []string{bs.ctx.GetShellWrapper()(host, bs.ctx.GetBash().InitBash())}
		return bs.ctx.GetExecer().CmdAsync(host, cmds...)
	})
}

func (bs *realBootstrap) ApplyDeps(hosts ...string) error {
	return runParallel(hosts, func(host string) error {
		for i := range bs.deps {
			dep := bs.deps[i]
			if !dep.Filter(bs.ctx, host) {
				return nil
			}
			logger.Debug("apply dep %s on host %s", dep.Name(), host)
			if err := dep.Apply(bs.ctx, host); err != nil {
				return err
			}
		}
		return nil
	})
}

func (bs *realBootstrap) RegisterDeps(deps ...Dependency) {
	bs.deps = append(bs.deps, deps...)
}

func (bs *realBootstrap) Reset(hosts ...string) error {
	return runParallel(hosts, func(host string) error {
		for i := range bs.deps {
			dep := bs.deps[i]
			if !dep.Filter(bs.ctx, host) {
				return nil
			}
			logger.Debug("undo dep %s on host %s", dep.Name(), host)
			if err := dep.Undo(bs.ctx, host); err != nil {
				return err
			}
		}
		return nil
	})
}

func runParallel(hosts []string, fn func(string) error) error {
	eg, _ := errgroup.WithContext(context.Background())
	for i := range hosts {
		host := hosts[i]
		eg.Go(func() error {
			return fn(host)
		})
	}
	return eg.Wait()
}
