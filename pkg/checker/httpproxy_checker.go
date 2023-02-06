package checker

import (
	"fmt"
	"net"
	"net/http"
	"net/url"

	"github.com/labring/sealos/pkg/utils/logger"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	netutil "k8s.io/apimachinery/pkg/util/net"
	netutils "k8s.io/utils/net"
)

// HTTPProxyCheck checks if https connection to specific host is going
// to be done directly or over proxy. If proxy detected, it will return warning.
type HTTPProxyCheck struct {
	proto string
	ip    string
}

func NewHTTPProxyCheck(proto, host string) Interface {
	return &HTTPProxyCheck{
		proto: proto,
		ip:    host,
	}
}

// Name returns HTTPProxy as name for HTTPProxyCheck
func (hpc HTTPProxyCheck) Name() string {
	return fmt.Sprintf("%s:HTTPProxyCheck", hpc.ip)
}

// Check validates http connectivity type, direct or via proxy.
func (hpc HTTPProxyCheck) Check(cluster *v2.Cluster, phase string) (warnings, errorList []error) {
	if phase != PhasePre {
		return nil, nil
	}
	logger.Info("%s:validating if the connectivity type is via proxy or direct", hpc.ip)
	u := &url.URL{Scheme: hpc.proto, Host: hpc.ip}
	if netutils.IsIPv6String(hpc.ip) {
		u.Host = net.JoinHostPort(hpc.ip, "1234")
	}
	req, err := http.NewRequest("GET", u.String(), nil)
	if err != nil {
		return nil, []error{err}
	}
	proxy, err := netutil.SetOldTransportDefaults(&http.Transport{}).Proxy(req)
	if err != nil {
		return nil, []error{err}
	}
	if proxy != nil {
		return []error{fmt.Errorf("connection to %q uses proxy %q. If that is not intended, adjust your proxy settings", u, proxy)}, nil
	}
	return nil, nil
}
