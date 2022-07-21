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
	"net"
	"os"
	"os/signal"
	"os/user"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/labring/lvscare/pkg/route"
	"github.com/labring/lvscare/pkg/utils"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/utils/hosts"
	"github.com/labring/sealos/pkg/utils/logger"
)

//VsAndRsCare is
func (care *LvsCare) VsAndRsCare() (err error) {
	if care.lvs == nil {
		care.lvs = BuildLvscare()
	}

	defer func() {
		if err != nil {
			return
		}
		err = care.CleanUp()
	}()

	cleanVirtualServer := func() error {
		logger.Info("lvscare deleteVirtualServer")
		err := care.lvs.DeleteVirtualServer(care.VirtualServer, false)
		if err != nil {
			logger.Warn("virtualServer is not exist skip: %v", err)
		}
		return err
	}

	// clean and exit
	if care.Clean {
		care.cleanupFuncs = append(care.cleanupFuncs, cleanVirtualServer)
		if care.Route != nil {
			care.cleanupFuncs = append(care.cleanupFuncs, care.Route.DelRoute)
		}
		return
	}

	if care.IfaceName != "" {
		if err = care.setupDummyIfaceOrSkip(); err != nil {
			return
		}
	}

	if err = care.createVsAndRs(); err != nil {
		return
	}
	if care.RunOnce {
		return
	}
	// clean ipvs rule before exiting
	care.cleanupFuncs = append(care.cleanupFuncs, cleanVirtualServer)

	t := time.NewTicker(time.Duration(care.Interval) * time.Second)
	defer t.Stop()
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	for {
		select {
		case <-t.C:
			// in some cases, virtual server maybe removed
			isAvailable := care.lvs.IsVirtualServerAvailable(care.VirtualServer)
			if !isAvailable {
				err = care.lvs.CreateVirtualServer(care.VirtualServer, true)
				if err != nil {
					logger.Error("failed to create virtual server: %v", err)
					return
				}
			}
			// check real server
			care.lvs.CheckRealServers(care.HealthPath, care.HealthSchem)
		case signa := <-sig:
			logger.Info("receive kill signal: %+v", signa)
			return
		}
	}
}

func (care *LvsCare) CleanUp() error {
	var errs []string
	for _, fn := range care.cleanupFuncs {
		if err := fn(); err != nil {
			errs = append(errs, err.Error())
		}
	}
	if len(errs) > 0 {
		return errors.New(strings.Join(errs, ", "))
	}
	return nil
}

var syncOnce sync.Once

func (care *LvsCare) SyncRouter() (err error) {
	syncOnce.Do(func() {
		if care.Route != nil {
			if err := care.Route.SetRoute(); err != nil {
				return
			}
			if !care.RunOnce {
				care.cleanupFuncs = append(care.cleanupFuncs, care.Route.DelRoute)
			}
		}
	})
	return
}

func (care *LvsCare) setupDummyIfaceOrSkip() error {
	ips, err := ipAddrsFromNetworkAddrs(care.RealServer...)
	if err != nil {
		return err
	}
	hasLocal, err := isAnyLocalHostAddr(ips...)
	if err != nil {
		return err
	}
	if !hasLocal {
		return nil
	}

	vIP, _, err := net.SplitHostPort(care.VirtualServer)
	if err != nil {
		return err
	}
	logger.Info("create dummy interface with name '%s'", care.IfaceName)
	link, err := utils.GetOrCreateDummyLink(care.IfaceName)
	if err != nil {
		return err
	}
	care.cleanupFuncs = append(care.cleanupFuncs, func() error {
		logger.Info("remove dummy interface %s", care.IfaceName)
		return utils.DeleteLinkByName(care.IfaceName)
	})

	logger.Info("assign IP %s/32 to interface", vIP)
	return utils.AssignIPToLink(vIP+"/32", link)
}

func (care *LvsCare) validatePermission() error {
	curUser, err := user.Current()
	if err != nil {
		return err
	}
	if curUser.Uid != "0" {
		return fmt.Errorf("must run with root privileges, current user %s", curUser.Uid)
	}
	return nil
}

func (care *LvsCare) ValidateAndSetDefaults() error {
	if err := care.validatePermission(); err != nil {
		return err
	}
	if len(care.VirtualServer) == 0 {
		return errors.New("virtual server can't be empty")
	}
	if len(care.RealServer) == 0 {
		return errors.New("real server can't be empty")
	}
	if care.TargetIP == nil {
		if v := os.Getenv("LVSCARE_NODE_IP"); len(v) > 0 {
			care.TargetIP = net.ParseIP(v)
		} else {
			hf := &hosts.HostFile{Path: constants.DefaultHostsPath}
			if ip, ok := hf.HasDomain(constants.DefaultLvscareDomain); ok {
				care.TargetIP = net.ParseIP(ip)
			}
		}
	}
	if care.TargetIP != nil {
		var ipv4 bool
		vIP, _, err := net.SplitHostPort(care.VirtualServer)
		if err != nil {
			return err
		}
		if utils.IsIPv6(care.TargetIP) {
			ipv4 = false
		} else {
			ipv4 = true
		}
		if !ipv4 {
			logger.Info("skip: %s is not ipv4", care.TargetIP.String())
			return nil
		}
		care.Route = route.NewRoute(vIP, care.TargetIP.String())
	}
	return nil
}
