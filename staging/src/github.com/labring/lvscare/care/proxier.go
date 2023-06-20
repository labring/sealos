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
	"context"
	"errors"
	"net"
	"strconv"
	"sync"
	"time"

	"k8s.io/kubernetes/pkg/util/ipvs"

	"github.com/labring/sealos/pkg/utils/logger"
)

type Proxier interface {
	EnsureVirtualServer(vs string) error
	DeleteVirtualServer(vs string) error
	EnsureRealServer(vs, rs string) error
	DeleteRealServer(vs, rs string) error
	RunLoop(context.Context) error
	TryRun() error
}

type endpoint struct {
	IP   string
	Port uint16
}

func (ep *endpoint) String() string {
	return net.JoinHostPort(ep.IP, strconv.Itoa(int(ep.Port)))
}

func NewProxier(scheduler string, interval time.Duration, prober Prober, syncFn func() error) Proxier {
	return &realProxier{
		scheduler:  scheduler,
		ipvsHandle: ipvs.New(),
		syncFn:     syncFn,
		serviceMap: make(map[endpoint]map[string]endpoint),
		prober:     prober,
		ticker:     time.NewTicker(interval),
		tryCh:      make(chan struct{}, 1),
		errCh:      make(chan error, 1),
	}
}

type realProxier struct {
	scheduler  string
	ipvsHandle ipvs.Interface
	syncFn     func() error

	// for prober
	serviceMap map[endpoint]map[string]endpoint
	prober     Prober
	ticker     *time.Ticker
	tryCh      chan struct{}
	errCh      chan error
}

func (p *realProxier) ensureVirtualServer(vs *ipvs.VirtualServer) (*ipvs.VirtualServer, error) {
	applied, _ := p.ipvsHandle.GetVirtualServer(vs)
	if applied == nil {
		logger.Debug("Add new IPVS service", vs.String())
		if err := p.ipvsHandle.AddVirtualServer(vs); err != nil {
			logger.Error("Failed to add IPVS service: %v", err)
			return nil, err
		}
	} else if !applied.Equal(vs) {
		logger.Debug("IPVS service is changed %s", applied.String())
		if err := p.ipvsHandle.UpdateVirtualServer(vs); err != nil {
			logger.Error("Failed to update IPVS service: %v", err)
			return nil, err
		}
	}
	return vs, nil
}

func (p *realProxier) EnsureVirtualServer(vs string) error {
	ep, err := parseEndpoint(vs)
	if err != nil {
		return err
	}
	_, err = p.ensureVirtualServer(p.buildVirtualServer(&ep))
	if err != nil {
		return err
	}
	if _, ok := p.serviceMap[ep]; !ok {
		p.serviceMap[ep] = make(map[string]endpoint)
	}
	return nil
}

func (p *realProxier) DeleteVirtualServer(vs string) error {
	ep, err := parseEndpoint(vs)
	if err != nil {
		return err
	}
	vSrv := p.buildVirtualServer(&ep)
	applied, _ := p.ipvsHandle.GetVirtualServer(vSrv)
	if applied != nil {
		if err := p.ipvsHandle.DeleteVirtualServer(vSrv); err != nil {
			logger.Error("Failed to delete IPVS service: %v", err)
			return err
		}
	}
	delete(p.serviceMap, ep)
	return nil
}

func (p *realProxier) getRealServer(vs *ipvs.VirtualServer, rs *ipvs.RealServer) (*ipvs.RealServer, error) {
	applied, err := p.ipvsHandle.GetRealServers(vs)
	if err != nil {
		return nil, err
	}
	for i := range applied {
		if applied[i].Equal(rs) {
			return applied[i], nil
		}
	}
	return nil, nil
}

func (p *realProxier) getServersByEndpoint(vs, rs endpoint) (*ipvs.VirtualServer, *ipvs.RealServer, error) {
	vSrv, err := p.ensureVirtualServer(p.buildVirtualServer(&vs))
	if err != nil {
		return nil, nil, err
	}
	rSrv, err := p.getRealServer(vSrv, p.buildRealServer(&rs))
	if err != nil {
		return nil, nil, err
	}
	return vSrv, rSrv, nil
}

func (p *realProxier) EnsureRealServer(vs, rs string) error {
	vsEp, err := parseEndpoint(vs)
	if err != nil {
		return err
	}
	rsEp, err := parseEndpoint(rs)
	if err != nil {
		return err
	}
	vSrv, rSrv, err := p.getServersByEndpoint(vsEp, rsEp)
	if err != nil {
		return err
	}
	defer func() {
		if err == nil {
			p.serviceMap[vsEp][rsEp.String()] = rsEp
		}
	}()
	if rSrv != nil {
		return nil
	}
	rSrv = p.buildRealServer(&rsEp)
	if err = p.ipvsHandle.AddRealServer(vSrv, rSrv); err != nil {
		logger.Error("Failed to add real server: %v", err)
		return err
	}
	return nil
}

func (p *realProxier) DeleteRealServer(vs, rs string) error {
	vsEp, err := parseEndpoint(vs)
	if err != nil {
		return err
	}
	rsEp, err := parseEndpoint(rs)
	if err != nil {
		return err
	}
	vSrv, rSrv, err := p.getServersByEndpoint(vsEp, rsEp)
	if err != nil {
		return err
	}
	if rSrv == nil {
		return nil
	}
	if err = p.ipvsHandle.DeleteRealServer(vSrv, rSrv); err != nil {
		logger.Error("Failed to delete real server: %v", err)
		return err
	}
	return nil
}

func (p *realProxier) RunLoop(ctx context.Context) error {
	defer p.ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return nil
		case <-p.ticker.C:
			if err := p.TryRun(); err != nil {
				logger.Error(err)
			}
		case _, ok := <-p.tryCh:
			if p.syncFn != nil {
				if err := p.syncFn(); err != nil {
					return err
				}
			}
			if ok {
				p.runCheck()
			}
		case err, ok := <-p.errCh:
			if !ok {
				return nil
			}
			return err
		}
	}
}

func (p *realProxier) TryRun() error {
	// preventing concurrent call
	select {
	case p.tryCh <- struct{}{}:
		return nil
	default:
		return errors.New("currently unavailable, one task in the queue")
	}
}

func (p *realProxier) Stop() {
	close(p.errCh)
}

func (p *realProxier) checkRealServer(wg *sync.WaitGroup, vSrv *ipvs.VirtualServer, rs endpoint) {
	defer wg.Done()
	probeErr := p.prober.Probe(rs.IP, strconv.Itoa(int(rs.Port)))
	rSrv, err := p.getRealServer(vSrv, p.buildRealServer(&rs))
	if err != nil {
		logger.Warn("Failed to get real server: %v", err)
		return
	}
	if probeErr != nil {
		logger.Debug("probe error: %v", probeErr)
		if rSrv != nil {
			if rSrv.Weight != 0 {
				logger.Debug("Trying to update wight to 0 for graceful termination")
				rSrv.Weight = 0
				if err = p.ipvsHandle.UpdateRealServer(vSrv, rSrv); err != nil {
					logger.Warn("Failed to update real server wight: %v", err)
				}
				return
			}
			logger.Debug("Trying to delete real server")
			if err = p.ipvsHandle.DeleteRealServer(vSrv, rSrv); err != nil {
				logger.Warn("Failed to delete real server: %v", err)
			}
		}
		return
	}
	if rSrv != nil {
		if rSrv.Weight == 0 {
			logger.Debug("Trying to update wight to 1 to receive traffic")
			rSrv.Weight = 1
			if err = p.ipvsHandle.UpdateRealServer(vSrv, rSrv); err != nil {
				logger.Warn("Failed to update real server wight: %v", err)
			}
		}
		return
	}
	logger.Debug("Trying to add real server back")
	if err = p.ipvsHandle.AddRealServer(vSrv, p.buildRealServer(&rs)); err != nil {
		logger.Warn("Failed to add real server back: %v", err)
	}
}

func (p *realProxier) runCheck() {
	wg := &sync.WaitGroup{}
	for vs, rsMap := range p.serviceMap {
		vSrv, err := p.ensureVirtualServer(p.buildVirtualServer(&vs))
		if err != nil {
			logger.Error("Failed to get or create IPVS service: %v", err)
			continue
		}
		for _, rs := range rsMap {
			wg.Add(1)
			go p.checkRealServer(wg, vSrv, rs)
		}
	}
	wg.Wait()
}

func (p *realProxier) buildVirtualServer(ep *endpoint) *ipvs.VirtualServer {
	return &ipvs.VirtualServer{
		Address:   net.ParseIP(ep.IP),
		Protocol:  "TCP",
		Port:      ep.Port,
		Scheduler: p.scheduler,
		Flags:     0,
		Timeout:   0,
	}
}

func (p *realProxier) buildRealServer(ep *endpoint) *ipvs.RealServer {
	return &ipvs.RealServer{
		Address: net.ParseIP(ep.IP),
		Port:    ep.Port,
		Weight:  1,
	}
}

func splitHostPort(hostport string) (string, uint16, error) {
	host, port, err := net.SplitHostPort(hostport)
	if err != nil {
		return "", 0, err
	}
	p, err := strconv.ParseUint(port, 10, 16)
	if err != nil {
		return "", 0, err
	}
	return host, uint16(p), nil
}

func parseEndpoint(hostport string) (endpoint, error) {
	host, port, err := splitHostPort(hostport)
	if err != nil {
		return endpoint{}, err
	}
	return endpoint{
		IP:   host,
		Port: port,
	}, nil
}
