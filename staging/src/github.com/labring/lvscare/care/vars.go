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
	"net"

	"github.com/labring/lvscare/pkg/route"
	"github.com/spf13/pflag"
)

type LvsCare struct {
	HealthPath    string
	HealthSchem   string // http or https
	VirtualServer string
	RealServer    []string
	RunOnce       bool
	Clean         bool
	Interval      int32
	IfaceName     string
	Logger        string
	TargetIP      net.IP
	// runtime
	lvs          Lvser
	cleanupFuncs []func() error
	Route        *route.Route
}

func (care *LvsCare) RegisterFlags(fs *pflag.FlagSet) {
	fs.IPVar(&care.TargetIP, "ip", nil, "target ip, as route gateway")
	fs.BoolVar(&care.RunOnce, "run-once", false, "run once mode, creating ipvs rules and routes and exit")
	fs.StringVar(&care.VirtualServer, "vs", "", "virtual server like 10.54.0.2:6443")
	fs.StringSliceVar(&care.RealServer, "rs", []string{}, "real server like 192.168.0.2:6443")
	fs.StringVar(&care.IfaceName, "iface", "", "name of interface to created when specified if needed, "+
		"use when any of real server is listening locally, this command will create a dummy network interface "+
		"and bind virtual ip to it automatically, setting this parameter to null will skip this behaviour")
	fs.StringVar(&care.Logger, "logger", "INFO", "logger level: DEBG/INFO")
	fs.BoolVarP(&care.Clean, "clean", "C", false, "clean existing ipvs rules and routes and then exit")
	fs.StringVar(&care.HealthPath, "health-path", "/healthz", "health check path")
	fs.StringVar(&care.HealthSchem, "health-schem", "https", "health check schem")
	fs.Int32Var(&care.Interval, "interval", 5, "health check interval, unit is sec.")
}

var LVS LvsCare
