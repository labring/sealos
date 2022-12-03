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
	"fmt"

	"golang.org/x/sync/errgroup"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
)

type Phase string

const (
	Preflight Phase = "preflight"
	Init      Phase = "init"
	Addon     Phase = "addon"
)

type Interface interface {
	Preflight(hosts ...string) error
	Init(hosts ...string) error
	RegisterApplier(Phase, ...Applier) error
	ApplyAddons(hosts ...string) error
	Reset(hosts ...string) error
}

type realBootstrap struct {
	ctx          Context
	checks       []Applier
	initializers []Applier
	addons       []Applier
}

type shellWrapper func(string, string) string

func New(cluster *v2.Cluster) Interface {
	ctx := NewContextFrom(cluster)
	bs := &realBootstrap{
		ctx:          ctx,
		checks:       make([]Applier, 0),
		initializers: make([]Applier, 0),
		addons:       make([]Applier, 0),
	}
	// register builtin appliers
	_ = bs.RegisterApplier(Preflight, defaultCheckers...)
	_ = bs.RegisterApplier(Init, defaultInitializers...)
	_ = bs.RegisterApplier(Addon, defaultAddons...)
	return bs
}

func (bs *realBootstrap) Preflight(hosts ...string) error {
	return bs.apply(bs.checks, hosts...)
}

func (bs *realBootstrap) Init(hosts ...string) error {
	return bs.apply(bs.initializers, hosts...)
}

func (bs *realBootstrap) ApplyAddons(hosts ...string) error {
	return bs.apply(bs.addons, hosts...)
}

func (bs *realBootstrap) apply(appliers []Applier, hosts ...string) error {
	return runParallel(hosts, func(host string) error {
		for i := range appliers {
			applier := appliers[i]
			if !applier.Filter(bs.ctx, host) {
				return nil
			}
			logger.Debug("apply %s on host %s", applier.Name(), host)
			if err := applier.Apply(bs.ctx, host); err != nil {
				return err
			}
		}
		return nil
	})
}

func (bs *realBootstrap) RegisterApplier(phase Phase, appliers ...Applier) error {
	switch phase {
	case Preflight:
		bs.checks = append(bs.checks, appliers...)
	case Init:
		bs.initializers = append(bs.initializers, appliers...)
	case Addon:
		bs.addons = append(bs.addons, appliers...)
	default:
		return fmt.Errorf("unknown phase %s", phase)
	}
	return nil
}

func (bs *realBootstrap) Reset(hosts ...string) error {
	appliers := make([]Applier, 0)
	// only undo addons OR?
	appliers = append(appliers, bs.addons...)
	return runParallel(hosts, func(host string) error {
		for i := range appliers {
			applier := appliers[i]
			if !applier.Filter(bs.ctx, host) {
				return nil
			}
			logger.Debug("undo %s on host %s", applier.Name(), host)
			if err := applier.Undo(bs.ctx, host); err != nil {
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

type defaultChecker struct {
	is *ImageShim
}

func (c *defaultChecker) Name() string {
	return "default checker"
}

func (c *defaultChecker) Filter(_ Context, _ string) bool {
	return true
}

func (c *defaultChecker) Apply(ctx Context, host string) error {
	if c.is == nil {
		c.is = NewImageShimHelper(ctx.GetExecer(), ctx.GetCluster().GetRegistryIP())
	}
	shimCmd := c.is.ApplyCMD(ctx.GetData().RootFSPath())
	cmds := []string{ctx.GetShellWrapper()(host, ctx.GetBash().CheckBash()), shimCmd}
	return ctx.GetExecer().CmdAsync(host, cmds...)
}

func (c *defaultChecker) Undo(_ Context, _ string) error {
	return nil
}

type defaultInitializer struct{}

func (initializer *defaultInitializer) Name() string {
	return "default initializer"
}

func (initializer *defaultInitializer) Filter(_ Context, _ string) bool {
	return true
}

func (initializer *defaultInitializer) Apply(ctx Context, host string) error {
	cmds := []string{ctx.GetShellWrapper()(host, ctx.GetBash().InitBash())}
	return ctx.GetExecer().CmdAsync(host, cmds...)
}

func (initializer *defaultInitializer) Undo(_ Context, _ string) error {
	return nil
}

func init() {
	defaultCheckers = append(defaultCheckers, &defaultChecker{})
	defaultInitializers = append(defaultInitializers, &defaultInitializer{})
}

func RegisterApplier(phase Phase, appliers ...Applier) error {
	switch phase {
	case Preflight:
		defaultCheckers = append(defaultCheckers, appliers...)
	case Init:
		defaultInitializers = append(defaultInitializers, appliers...)
	case Addon:
		defaultAddons = append(defaultAddons, appliers...)
	default:
		return fmt.Errorf("unknown phase %s", phase)
	}
	return nil
}
