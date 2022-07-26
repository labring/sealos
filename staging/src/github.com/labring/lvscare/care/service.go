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
	"strconv"
	"syscall"

	"github.com/labring/lvscare/pkg/ipvs"
	"github.com/labring/sealos/pkg/utils/logger"
)

func BuildLvscare() Lvser {
	l := &lvscare{}
	handle := ipvs.New()
	l.handle = handle

	return l
}

//EndPoint  is
type EndPoint struct {
	IP   string
	Port uint16
}

func (ep EndPoint) String() string {
	return net.JoinHostPort(ep.IP, strconv.Itoa(int(ep.Port)))
}

//Lvser is
type Lvser interface {
	CreateVirtualServer(vs string, config bool) error
	IsVirtualServerAvailable(vs string) bool
	DeleteVirtualServer(vs string, config bool) error

	//config is config to lvscare struct
	CreateRealServer(rs string, config bool) error
	//config is config to lvscare struct
	DeleteRealServer(rs string, config bool) error

	CheckRealServers(path, schem string)
}

type lvscare struct {
	vs     *EndPoint
	rs     []*EndPoint
	handle ipvs.Interface
}

func (l *lvscare) CreateVirtualServer(vs string, config bool) error {
	virIP, virPort := SplitServer(vs)
	if virIP == "" || virPort == 0 {
		logger.Error("CreateVirtualServer error: virtual server ip and port is empty")
		return fmt.Errorf("virtual server ip and port is empty")
	}
	if config {
		l.vs = &EndPoint{IP: virIP, Port: virPort}
	}
	vServer := BuildVirtualServer(vs)
	err := l.handle.AddVirtualServer(vServer)
	if errors.Is(err, syscall.EEXIST) {
		logger.Warn("CreateRealServer exist: %v", err)
		return nil
	}
	if err != nil {
		logger.Warn("CreateVirtualServer error: %v", err)
		return fmt.Errorf("new virtual server failed: %s", err)
	}
	return nil
}
func (l *lvscare) DeleteVirtualServer(vs string, config bool) error {
	vIP, vPort := SplitServer(vs)
	if vIP == "" || vPort == 0 {
		logger.Error("DeleteVirtualServer error: real server ip and port is empty ")
		return fmt.Errorf("virtual server ip and port is null")
	}
	virServer := BuildVirtualServer(vs)
	err := l.handle.DeleteVirtualServer(virServer)
	if err != nil {
		logger.Warn("VirtualServer is not exist, skip...,err: %+v", err)
		return nil
	}
	if config {
		l.vs = nil
	}
	return nil
}

func (l *lvscare) CreateRealServer(rs string, config bool) error {
	realIP, realPort := SplitServer(rs)
	if realIP == "" || realPort == 0 {
		logger.Error("CreateRealServer error: real server ip and port is empty")
		return fmt.Errorf("real server ip and port is empty")
	}
	rsEp := &EndPoint{IP: realIP, Port: realPort}
	if config {
		l.rs = append(l.rs, rsEp)
	}
	realServer := BuildRealServer(rs)
	//vir server build
	if l.vs != nil {
		vServer := BuildVirtualServer(l.vs.String())
		err := l.handle.AddRealServer(vServer, realServer)
		if errors.Is(err, syscall.EEXIST) {
			logger.Warn("CreateRealServer exist: ", err)
			return nil
		}
		if err != nil {
			logger.Error("CreateRealServer error: ", err)
			return fmt.Errorf("new real server failed: %s", err)
		}
		return nil
	}
	logger.Error("CreateRealServer error: virtual server is empty.")
	return fmt.Errorf("virtual server is empty")
}
func (l *lvscare) IsVirtualServerAvailable(vs string) bool {
	virArray, err := l.handle.GetVirtualServers()
	if err != nil {
		logger.Warn("IsVirtualServerAvailable warn: vir servers is empty; %v", err)
		return false
	}
	if l.vs != nil {
		resultVirServer := BuildVirtualServer(vs)
		for _, vir := range virArray {
			logger.Debug("IsVirtualServerAvailable debug: check vir ip: %s, port %v ", vir.Address.String(), vir.Port)
			if vir.String() == resultVirServer.String() {
				return true
			}
		}
	} else {
		logger.Warn("IsVirtualServerAvailable warn: virtual server is not exists now.")
	}
	return false
}

func (l *lvscare) healthCheck(ip, port, path, shem string) bool {
	return IsHTTPAPIHealth(ip, port, path, shem)
}

func (l *lvscare) CheckRealServers(path, schem string) {
	//if realserver unavilable remove it, if recover add it back
	for _, realServer := range l.rs {
		ip := realServer.IP
		port := strconv.Itoa(int(realServer.Port))
		if !l.healthCheck(ip, port, path, schem) {
			err := l.DeleteRealServer(realServer.String(), false)
			if err != nil {
				logger.Warn("CheckRealServers error: %s;  %d; %v ", realServer.IP, realServer.Port, err)
			}
		} else {
			rs, weight := l.GetRealServer(realServer.String())
			if weight == 0 {
				err := l.DeleteRealServer(realServer.String(), false)
				logger.Debug("CheckRealServers debug: remove weight = 0 real server")
				if err != nil {
					logger.Warn("CheckRealServers error[remove weight = 0 real server failed]: %s;  %d; %v ", realServer.IP, realServer.Port, err)
				}
			}
			if rs == nil || weight == 0 {
				//add it back
				ip := realServer.IP
				port := strconv.Itoa(int(realServer.Port))
				err := l.CreateRealServer(net.JoinHostPort(ip, port), false)
				if err != nil {
					logger.Warn("CheckRealServers error[add real server failed]: %s;  %d; %v ", realServer.IP, realServer.Port, err)
				}
			}
		}
	}
}

func (l *lvscare) GetRealServer(rsHost string) (rs *EndPoint, weight int) {
	ip, port := SplitServer(rsHost)
	vs := BuildVirtualServer(l.vs.String())
	dstArray, err := l.handle.GetRealServers(vs)
	if err != nil {
		logger.Error("GetRealServer error[get real server failed]: %s;  %d; %v ", ip, port, err)
		return nil, 0
	}
	dip := net.ParseIP(ip)
	for _, dst := range dstArray {
		logger.Debug("GetRealServer debug[check real server ip]: %s;  %d; %v ", dst.Address.String(), dst.Port, err)
		if dst.Address.Equal(dip) && dst.Port == port {
			return &EndPoint{IP: ip, Port: port}, dst.Weight
		}
	}
	return nil, 0
}

//
func (l *lvscare) DeleteRealServer(rs string, config bool) error {
	realIP, realPort := SplitServer(rs)
	if realIP == "" || realPort == 0 {
		logger.Error("DeleteRealServer error: real server ip and port is empty ")
		return fmt.Errorf("real server ip and port is null")
	}

	if l.vs == nil {
		logger.Error("DeleteRealServer error: virtual service is empty.")
		return fmt.Errorf("virtual service is empty")
	}
	virServer := BuildVirtualServer(l.vs.String())
	realServer := BuildRealServer(rs)
	err := l.handle.DeleteRealServer(virServer, realServer)
	if err != nil {
		logger.Error("DeleteRealServer error[real server delete error]: %v", err)
		return fmt.Errorf("real server delete error: %v", err)
	}
	if config {
		//clean delete data
		var resultRS []*EndPoint
		for _, r := range l.rs {
			if r.IP == realIP && r.Port == realPort {
				continue
			} else {
				resultRS = append(resultRS, &EndPoint{
					IP:   r.IP,
					Port: r.Port,
				})
			}
		}
		l.rs = resultRS
	}

	return nil
}
