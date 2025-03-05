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

package care

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/spf13/cobra"
	"sigs.k8s.io/controller-runtime/pkg/manager/signals"

	"github.com/labring/sealos/pkg/utils/logger"
)

var LVS = &runner{
	options: &options{},
	prober:  &httpProber{},
}

type runner struct {
	*options
	prober Prober

	proxier      Proxier
	ruler        Ruler
	cleanupFuncs []func() error
}

func (r *runner) Run() (err error) {
	if !r.options.RunOnce {
		defer func() {
			cleanupErr := r.cleanup()
			if err != nil {
				return
			}
			err = cleanupErr
		}()
	} else {
		if err := r.proxier.TryRun(); err != nil {
			return err
		}
		if stopper, ok := r.proxier.(stopper); ok {
			stopper.Stop()
		}
	}

	cleanVirtualServer := func() error {
		logger.Info("delete IPVS service %s", r.options.VirtualServer)
		err := r.proxier.DeleteVirtualServer(r.options.VirtualServer)
		if err != nil {
			logger.Warn("failed to delete IPVS service: %v", err)
		}
		return err
	}
	if r.options.CleanAndExit {
		r.cleanupFuncs = append(r.cleanupFuncs, cleanVirtualServer)
		if r.ruler != nil {
			r.cleanupFuncs = append(r.cleanupFuncs, r.ruler.Cleanup)
		}
		return
	}
	errCh := make(chan error, 1)
	ctx := signals.SetupSignalHandler()
	go func() {
		errCh <- r.proxier.RunLoop(ctx)
	}()
	// fire at once, no need to check error here
	_ = r.proxier.TryRun()
	// ensure ipvs
	if err := r.ensureIPVSRules(); err != nil {
		return err
	}
	if r.ruler != nil {
		if err := r.ruler.Setup(); err != nil {
			return err
		}
	}
	return <-errCh
}

// run once at startup
func (r *runner) ensureIPVSRules() error {
	if err := r.proxier.EnsureVirtualServer(r.options.VirtualServer); err != nil {
		return err
	}
	for i := range r.options.RealServer {
		if err := r.proxier.EnsureRealServer(r.options.VirtualServer, r.options.RealServer[i]); err != nil {
			return err
		}
	}
	return nil
}

func (r *runner) periodicRun() error {
	// ensure ipset/iptables ruler?
	// or only run once at startup?
	return nil
}

func (r *runner) cleanup() error {
	var errs []string
	for _, fn := range r.cleanupFuncs {
		if err := fn(); err != nil {
			errs = append(errs, err.Error())
		}
	}
	if len(errs) > 0 {
		return errors.New(strings.Join(errs, ", "))
	}
	return nil
}

func (r *runner) RegisterCommandFlags(cmd *cobra.Command) {
	for _, iter := range []interface{}{r.options, r.prober} {
		if registerer, ok := iter.(flagRegisterer); ok {
			registerer.RegisterFlags(cmd.Flags())
		}
		if requirer, ok := iter.(flagRequirer); ok {
			for _, fs := range requirer.RequiredFlags() {
				_ = cmd.MarkFlagRequired(fs)
			}
		}
	}
}

func (r *runner) ValidateAndSetDefaults() error {
	for _, iter := range []interface{}{r.options, r.prober} {
		if validator, ok := iter.(flagValidator); ok {
			if err := validator.ValidateAndSetDefaults(); err != nil {
				return err
			}
		}
	}
	r.proxier = NewProxier(r.options.scheduler, time.Duration(r.options.Interval), r.prober, r.periodicRun)
	virtualIP, _, err := splitHostPort(r.options.VirtualServer)
	if err != nil {
		return err
	}

	var ruler Ruler
	switch r.Mode {
	case routeMode:
		if r.options.TargetIP == nil {
			logger.Warn("running routeMode and Target IP is not valid IP, skipping")
			break
		}
		ruler, err = newRouteImpl(virtualIP, r.options.TargetIP.String())
	case linkMode:
		ruler, err = newIptablesImpl(r.options.IfaceName, r.options.MasqueradeBit, r.options.VirtualServer)
	case "":
		// do nothing, disable ruler
	default:
		return fmt.Errorf("not yet support mode %s", r.Mode)
	}
	if err == nil {
		r.ruler = ruler
	}

	return err
}
