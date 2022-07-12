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
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/labring/lvscare/pkg/route"
	"github.com/labring/lvscare/pkg/utils"
	"github.com/labring/sealos/pkg/utils/logger"
)

//VsAndRsCare is
func (care *LvsCare) VsAndRsCare() {
	lvs := BuildLvscare()
	//set inner lvs
	care.lvs = lvs
	if care.Clean {
		logger.Info("lvscare deleteVirtualServer")
		err := lvs.DeleteVirtualServer(care.VirtualServer, false)
		if err != nil {
			logger.Info("virtualServer is not exist skip...: %v", err)
		}
	}
	care.createVsAndRs()
	if care.RunOnce {
		return
	}
	t := time.NewTicker(time.Duration(care.Interval) * time.Second)
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	for {
		select {
		case <-t.C:
			// in some cases, virtual server maybe removed
			isAvailable := care.lvs.IsVirtualServerAvailable(care.VirtualServer)
			if !isAvailable {
				err := care.lvs.CreateVirtualServer(care.VirtualServer, true)
				//virtual server is exists
				if err != nil {
					logger.Error("failed to create virtual server: %v", err)

					return
				}
			}
			//check real server
			lvs.CheckRealServers(care.HealthPath, care.HealthSchem)
		case signa := <-sig:
			logger.Info("receive kill signal: %+v", signa)
			_ = LVS.Route.DelRoute()
			return
		}
	}
}
func (care *LvsCare) SyncRouter() error {
	if len(LVS.VirtualServer) == 0 {
		return errors.New("virtual server can't empty")
	}
	if LVS.TargetIP != nil {
		var ipv4 bool
		vIP, _, err := net.SplitHostPort(LVS.VirtualServer)
		if err != nil {
			return err
		}
		if utils.IsIPv6(LVS.TargetIP) {
			ipv4 = false
		} else {
			ipv4 = true
		}
		if !ipv4 {
			logger.Info("tip: %s is not ipv4", LVS.TargetIP.String())
			return nil
		}
		logger.Info("tip: %s,vip: %s", LVS.TargetIP.String(), vIP)
		LVS.Route = route.NewRoute(vIP, LVS.TargetIP.String())
		return LVS.Route.SetRoute()
	}
	return nil
}

func SetTargetIP() error {
	if LVS.TargetIP == nil {
		LVS.TargetIP = net.ParseIP(os.Getenv("LVSCARE_NODE_IP"))
	}

	return nil
}
