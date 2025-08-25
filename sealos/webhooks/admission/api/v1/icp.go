// Copyright © 2023 sealos.
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

package v1

import (
	"encoding/json"
	"net/http"
	"net/url"
	"time"

	"github.com/patrickmn/go-cache"
	"golang.org/x/net/publicsuffix"
	netv1 "k8s.io/api/networking/v1"
)

type IcpResponse struct {
	ErrorCode int    `json:"error_code"`
	Reason    string `json:"reason"`
	Result    struct {
		CompanyName string `json:"CompanyName"`
		CompanyType string `json:"CompanyType"`
		MainPage    string `json:"MainPage"`
		SiteLicense string `json:"SiteLicense"`
		SiteName    string `json:"SiteName"`
		VerifyTime  string `json:"VerifyTime"`
	} `json:"result"`
}

type IcpValidator struct {
	enabled  bool
	endpoint string
	key      string

	cache *cache.Cache
}

func NewIcpValidator(icpEnabled bool, icpEndpoint string, icpKey string) *IcpValidator {
	return &IcpValidator{
		enabled:  icpEnabled,
		endpoint: icpEndpoint,
		key:      icpKey,
		cache:    cache.New(5*time.Minute, 3*time.Minute),
	}
}

func (i *IcpValidator) Query(rule *netv1.IngressRule) (*IcpResponse, error) {
	domainName, err := publicsuffix.EffectiveTLDPlusOne(rule.Host)
	if err != nil {
		return nil, err
	}

	// Check if result is already cached
	cached, found := i.cache.Get(domainName)
	if found {
		return cached.(*IcpResponse), nil
	}

	// Query ICP
	data := url.Values{}
	data.Set("domainName", domainName)
	data.Set("key", i.key)

	resp, err := http.PostForm(i.endpoint, data)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var response IcpResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, err
	}

	// Cache the result with the current timestamp
	i.cache.Set(
		domainName,
		&response,
		genCacheTTL(&response),
	)

	return &response, nil
}

// genCacheTTL generates a cache TTL based on the response
func genCacheTTL(rsp *IcpResponse) time.Duration {
	// If the response is valid, and the site license is not empty, cache for 30 days
	if rsp.ErrorCode == 0 && rsp.Result.SiteLicense != "" {
		return 30 * 24 * time.Hour
	}
	// Otherwise, cache for 5 minutes
	return 5 * time.Minute
}
