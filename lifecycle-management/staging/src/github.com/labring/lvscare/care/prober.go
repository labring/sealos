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
	"bytes"
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/spf13/pflag"
	"k8s.io/apimachinery/pkg/util/sets"
)

type Prober interface {
	Probe(string, string) error
}

type httpProber struct {
	HealthPath         string
	HealthScheme       string
	Method             string
	Headers            map[string]string
	Body               string
	ValidStatusCodes   []int
	InsecureSkipVerify bool
	timeout            time.Duration

	client      *http.Client
	validStatus sets.Set[int]
}

func (p *httpProber) RegisterFlags(fs *pflag.FlagSet) {
	fs.StringVar(&p.HealthPath, "health-path", "/healthz", "url path to probed")
	fs.StringVar(&p.HealthScheme, "health-schem", "https", "http scheme for prober")
	fs.StringVar(&p.Method, "health-req-method", "GET", "http request method")
	fs.StringVar(&p.Body, "health-req-body", "", "body to send for health checker")
	fs.StringToStringVar(&p.Headers, "health-req-headers", map[string]string{}, "http request headers")
	fs.IntSliceVar(&p.ValidStatusCodes, "health-status", []int{}, "extra valid status codes greater than 400")
	fs.BoolVar(&p.InsecureSkipVerify, "health-insecure-skip-verify", true, "skip verify insecure request")
	fs.DurationVar(&p.timeout, "health-timeout", 10*time.Second, "http probe timeout")
}

func (p *httpProber) ValidateAndSetDefaults() error {
	if !strings.HasPrefix(p.HealthPath, "/") {
		p.HealthPath = "/" + p.HealthPath
	}
	switch p.HealthScheme {
	case "http", "https":
	default:
		return fmt.Errorf("unsupported scheme %s", p.HealthScheme)
	}
	if p.validStatus == nil {
		p.validStatus = sets.New[int](p.ValidStatusCodes...)
	}
	return nil
}

func (p *httpProber) Probe(host, port string) error {
	if p.client == nil {
		p.client = &http.Client{
			Transport: &http.Transport{
				// nosemgrep
				TLSClientConfig: &tls.Config{InsecureSkipVerify: p.InsecureSkipVerify},
			},
		}
	}
	uri := &url.URL{
		Scheme: p.HealthScheme,
		Host:   net.JoinHostPort(host, port),
		Path:   p.HealthPath,
	}
	var body io.Reader
	if len(p.Body) > 0 {
		body = bytes.NewBufferString(p.Body)
	}
	ctx, cancel := context.WithTimeout(context.Background(), p.timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, p.Method, uri.String(), body)
	if err != nil {
		return err
	}
	if len(p.Headers) > 0 {
		for k, v := range p.Headers {
			vv := strings.Split(v, ",")
			for i := range vv {
				req.Header.Add(k, vv[i])
			}
		}
	}
	resp, err := p.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	defer func() {
		_, _ = io.Copy(io.Discard, resp.Body)
	}()
	if resp.StatusCode/100 >= 4 {
		if p.validStatus.Len() > 0 && p.validStatus.Has(resp.StatusCode) {
			return nil
		}
		return fmt.Errorf("unexpected status code %d", resp.StatusCode)
	}
	return nil
}
