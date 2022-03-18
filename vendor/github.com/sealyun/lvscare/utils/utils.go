package utils

import (
	"crypto/tls"
	"fmt"
	"github.com/sealyun/lvscare/internal/glog"
	"github.com/sealyun/lvscare/internal/ipvs"
	"net"
	"net/http"
	"strconv"
	"strings"
)

//SplitServer is
func SplitServer(server string) (string, uint16) {
	s := strings.Split(server, ":")
	if len(s) != 2 {
		glog.Warning("SplitServer error: len(s) is not two.")
		return "", 0
	}
	glog.V(8).Infof("SplitServer debug: IP: %s, Port: %s", s[0], s[1])
	p, err := strconv.Atoi(s[1])
	if err != nil {
		glog.Warningf("SplitServer error: %v", err)
		return "", 0
	}
	return s[0], uint16(p)
}

//IsHTTPAPIHealth is check http error
func IsHTTPAPIHealth(ip, port, path, schem string) bool {
	http.DefaultTransport.(*http.Transport).TLSClientConfig = &tls.Config{InsecureSkipVerify: true}
	url := fmt.Sprintf("%s://%s:%s%s", schem, ip, port, path)
	resp, err := http.Get(url)
	if err != nil {
		glog.V(8).Infof("IsHTTPAPIHealth error: ", err)
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
