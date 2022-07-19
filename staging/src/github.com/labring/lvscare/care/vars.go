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
	Test          bool
	Interval      int32
	IfaceName     string
	Logger        string
	TargetIP      net.IP
	// runtime
	cleanupFuncs []func() error
	lvs          Lvser
	Route        *route.Route
}

func (l *LvsCare) RegisterFlags(fs *pflag.FlagSet) {
	fs.IPVar(&l.TargetIP, "ip", nil, "target ip")
	fs.BoolVar(&l.RunOnce, "run-once", false, "is run once mode")
	fs.StringVar(&l.VirtualServer, "vs", "", "virtual server like 10.54.0.2:6443")
	fs.StringSliceVar(&l.RealServer, "rs", []string{}, "real server like 192.168.0.2:6443")
	fs.StringVar(&l.Logger, "logger", "INFO", "logger level: DEBG/INFO")
	fs.BoolVarP(&l.Clean, "clean", "C", false, "before run clean ipvs rules")
	fs.BoolVarP(&l.Test, "test", "t", false, "use when any of real server is listening on the same host, "+
		"enable test mode will automatically create a dummy type interface and bind virtual IP to it")
	fs.StringVar(&l.IfaceName, "iface", "lvscare", "name of dummy network interface to setup")

	fs.StringVar(&l.HealthPath, "health-path", "/healthz", "health check path")
	fs.StringVar(&l.HealthSchem, "health-schem", "https", "health check schem")
	fs.Int32Var(&l.Interval, "interval", 5, "health check interval, unit is sec.")
}

var LVS LvsCare
