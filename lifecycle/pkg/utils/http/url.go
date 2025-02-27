/*
Copyright 2021 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package http

import (
	"context"
	"crypto/tls"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/labring/sealos/pkg/utils/logger"
)

func IsURL(u string) (*url.URL, bool) {
	if uu, err := url.Parse(u); err == nil && uu != nil && uu.Host != "" {
		return uu, true
	}
	return nil, false
}

func WaitUntilEndpointAlive(ctx context.Context, endpoint string) error {
	if !strings.HasPrefix(endpoint, "http") {
		endpoint = "http://" + endpoint
	}
	u, err := url.Parse(endpoint)
	if err != nil {
		return err
	}
	logger.Debug("checking if endpoint %s is alive", u.String())
	for {
		select {
		case <-ctx.Done():
			return err
		default:
			var resp *http.Response
			resp, err = DefaultClient.Get(u.String())
			if err == nil {
				_, _ = io.Copy(io.Discard, resp.Body)
				resp.Body.Close()
				logger.Debug("http endpoint %s is alive", u.String())
				return nil
			}
			time.Sleep(100 * time.Millisecond)
		}
	}
}

var DefaultClient = &http.Client{
	Transport: DefaultSkipVerify,
}

var DefaultSkipVerify = &http.Transport{
	Proxy:               http.ProxyFromEnvironment,
	MaxIdleConnsPerHost: 100,
	DialContext: (&net.Dialer{
		Timeout:   30 * time.Second,
		KeepAlive: 30 * time.Second,
	}).DialContext,
	MaxIdleConns:          100,
	IdleConnTimeout:       90 * time.Second,
	TLSHandshakeTimeout:   10 * time.Second,
	ExpectContinueTimeout: 1 * time.Second,
	// nosemgrep
	TLSClientConfig: &tls.Config{
		InsecureSkipVerify: true,
	},
}
