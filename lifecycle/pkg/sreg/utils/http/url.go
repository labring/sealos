// Copyright © 2021 sealos.
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

package http

import (
	"context"
	"net/http"
	"net/url"
	"strings"

	basehttp "github.com/labring/sealos/pkg/utils/http"
)

var DefaultClient = &http.Client{
	Transport: DefaultSkipVerify,
}

var DefaultSkipVerify = basehttp.DefaultSkipVerify

func IsURL(u string) (*url.URL, bool) {
	return basehttp.IsURL(u)
}

func WaitUntilEndpointAlive(ctx context.Context, endpoint string) error {
	if !strings.HasPrefix(endpoint, "http") {
		endpoint = "http://" + endpoint
	}
	if !strings.HasSuffix(endpoint, "/v2/") {
		endpoint = strings.TrimRight(endpoint, "/") + "/v2/"
	}
	return basehttp.WaitUntilEndpointAlive(ctx, endpoint)
}
