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
	Preflight  Phase = "preflight"
	Init       Phase = "init"
	Postflight Phase = "postflight"
)

type Interface interface {
	Apply(hosts ...string) error
	RegisterApplier(Phase, ...Applier) error
	Delete(hosts ...string) error
}

type realBootstrap struct {
	ctx          Context
	preflights   []Applier
	initializers []Applier
	postflights  []Applier
}

func New(cluster *v2.Cluster) Interface {
	ctx := NewContextFrom(cluster)
	bs := &realBootstrap{
		ctx:          ctx,
		preflights:   make([]Applier, 0),
		initializers: make([]Applier, 0),
		postflights:  make([]Applier, 0),
	}
	// register builtin appliers
	_ = bs.RegisterApplier(Preflight, defaultPreflights...)
	_ = bs.RegisterApplier(Init, defaultInitializers...)
	_ = bs.RegisterApplier(Postflight, defaultPostflights...)
	return bs
}

func (bs *realBootstrap) Apply(hosts ...string) error {
	appliers := make([]Applier, 0)
	appliers = append(appliers, bs.preflights...)
	appliers = append(appliers, bs.initializers...)
	appliers = append(appliers, bs.postflights...)
	logger.Debug("apply %+v on hosts %+v", appliers, hosts)
	for i := range appliers {
		applier := appliers[i]
		if err := runParallel(hosts, func(host string) error {
			if !applier.Filter(bs.ctx, host) {
				return nil
			}
			logger.Debug("apply %s on host %s", applier, host)
			return applier.Apply(bs.ctx, host)
		}); err != nil {
			return err
		}
	}
	return nil
}

func (bs *realBootstrap) RegisterApplier(phase Phase, appliers ...Applier) error {
	switch phase {
	case Preflight:
		bs.preflights = append(bs.preflights, appliers...)
	case Init:
		bs.initializers = append(bs.initializers, appliers...)
	case Postflight:
		bs.postflights = append(bs.postflights, appliers...)
	default:
		return fmt.Errorf("unknown phase %s", phase)
	}
	return nil
}

func (bs *realBootstrap) Delete(hosts ...string) error {
	appliers := make([]Applier, 0)
	appliers = append(appliers, bs.postflights...)
	appliers = append(appliers, bs.initializers...)
	appliers = append(appliers, bs.preflights...)
	return runParallel(hosts, func(host string) error {
		logger.Debug("delete runParallel %+v on host %s", appliers, host)
		for i := range appliers {
			applier := appliers[i]
			if !applier.Filter(bs.ctx, host) {
				continue
			}
			logger.Debug("undo %s on host %s", applier, host)
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

type defaultChecker struct{ common }

func (c *defaultChecker) String() string {
	return "default_checker"
}

func (c *defaultChecker) Apply(ctx Context, host string) error {
	cmds := []string{ctx.GetBash().CheckBash(host)}
	return ctx.GetExecer().CmdAsync(host, cmds...)
}

type defaultInitializer struct{ common }

func (*defaultInitializer) String() string { return "initializer" }

func (initializer *defaultInitializer) Apply(ctx Context, host string) error {
	cmds := []string{ctx.GetBash().InitBash(host)}
	return ctx.GetExecer().CmdAsync(host, cmds...)
}

func (initializer *defaultInitializer) Undo(ctx Context, host string) error {
	cmds := []string{ctx.GetBash().CleanBash(host)}
	return ctx.GetExecer().CmdAsync(host, cmds...)
}

func init() {
	defaultPreflights = append(defaultPreflights, &defaultChecker{})
	defaultInitializers = append(defaultInitializers, &registryHostApplier{}, &registryApplier{}, &defaultCRIInitializer{}, &apiServerHostApplier{}, &lvscareHostApplier{}, &defaultInitializer{})
}

func RegisterApplier(phase Phase, appliers ...Applier) error {
	switch phase {
	case Preflight:
		defaultPreflights = append(defaultPreflights, appliers...)
	case Init:
		defaultInitializers = append(defaultInitializers, appliers...)
	case Postflight:
		defaultPostflights = append(defaultPostflights, appliers...)
	default:
		return fmt.Errorf("unknown phase %s", phase)
	}
	return nil
}
