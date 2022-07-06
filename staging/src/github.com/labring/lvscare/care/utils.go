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
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
	"strconv"

	"github.com/labring/lvscare/pkg/glog"

	"github.com/labring/lvscare/pkg/ipvs"
)

//SplitServer is
func SplitServer(server string) (string, uint16) {
	glog.Infof("server %s", server)

	ip, port, err := net.SplitHostPort(server)
	if err != nil {
		glog.Errorf("SplitServer error: %v.", err)
		return "", 0
	}
	glog.V(5).Infof("SplitServer debug: TargetIP: %s, Port: %s", ip, port)
	p, err := strconv.Atoi(port)
	if err != nil {
		glog.Warningf("SplitServer error: %v", err)
		return "", 0
	}
	return ip, uint16(p)
}

//IsHTTPAPIHealth is check http error
func IsHTTPAPIHealth(ip, port, path, schem string) bool {
	http.DefaultTransport.(*http.Transport).TLSClientConfig = &tls.Config{InsecureSkipVerify: true}
	url := fmt.Sprintf("%s://%s%s", schem, net.JoinHostPort(ip, port), path)
	resp, err := http.Get(url)
	if err != nil {
		glog.V(5).Infof("IsHTTPAPIHealth error: %v", err)
		return false
	}
	defer resp.Body.Close()

	_ = resp
	return true
}

func BuildVirtualServer(vip string) *ipvs.VirtualServer {
	ip, port := SplitServer(vip)
	virServer := &ipvs.VirtualServer{
		Address:   net.ParseIP(ip),
		Protocol:  "TCP",
		Port:      port,
		Scheduler: "rr",
		Flags:     0,
		Timeout:   0,
	}
	return virServer
}

func BuildRealServer(real string) *ipvs.RealServer {
	ip, port := SplitServer(real)
	realServer := &ipvs.RealServer{
		Address: net.ParseIP(ip),
		Port:    port,
		Weight:  1,
	}
	return realServer
}
