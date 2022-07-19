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
	"strings"
	"syscall"
	"time"

	"github.com/labring/lvscare/pkg/route"
	"github.com/labring/lvscare/pkg/utils"
	"github.com/labring/sealos/pkg/utils/logger"
)

// VsAndRsCare is
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
			logger.Warn("virtualServer is not exist skip...: %v", err)
		}
		return err
	}

	if care.Clean {
		// we don't care error here
		_ = cleanVirtualServer()
	}
	if err = care.setupDummyIfaceOrSkip(); err != nil {
		return
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
				// virtual server is exists
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

func (care *LvsCare) setupDummyIfaceOrSkip() error {
	if care.Test {
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
		virIP, virPort := SplitServer(care.VirtualServer)
		if virIP == "" || virPort == 0 {
			return fmt.Errorf("virtual server ip and port is empty")
		}
		logger.Info("create dummy interface with name %s", care.IfaceName)
		link, err := utils.GetOrCreateDummyLink(care.IfaceName)
		if err != nil {
			return err
		}
		care.cleanupFuncs = append(care.cleanupFuncs, func() error {
			logger.Info("remove dummy interface %s", care.IfaceName)
			return utils.DeleteLinkByName(care.IfaceName)
		})
		logger.Info("assign IP %s/32 to interface", virIP)
		return utils.AssignIPToLink(virIP+"/32", link)
	}
	return nil
}

func (care *LvsCare) SyncRouter() error {
	if len(care.VirtualServer) == 0 {
		return errors.New("virtual server can't empty")
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
			logger.Info("tip: %s is not ipv4", care.TargetIP.String())
			return nil
		}
		logger.Info("tip: %s,vip: %s", care.TargetIP.String(), vIP)
		care.Route = route.NewRoute(vIP, care.TargetIP.String())
		if err = care.Route.SetRoute(); err != nil {
			return err
		}
		if !care.RunOnce {
			care.cleanupFuncs = append(care.cleanupFuncs, care.Route.DelRoute)
		}
		return nil
	}
	return nil
}

func SetTargetIP() error {
	if LVS.TargetIP == nil {
		LVS.TargetIP = net.ParseIP(os.Getenv("LVSCARE_NODE_IP"))
	}

	return nil
}
