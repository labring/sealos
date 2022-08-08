/*
Copyright 2022 sealos.

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
	http2 "net/http"
	"net/url"
	"time"

	"github.com/labring/endpoints-operator/library/probe/http"
	"github.com/pkg/errors"
)

func Request(address string, header map[string]string) (string, error) {
	prob := http.New(false)
	timeout := time.Duration(10) * time.Second
	url, err := url.Parse(address)
	if url != nil {
		head := http2.Header{}
		for k, v := range header {
			head.Add(k, v)
		}
		_, data, err := prob.Probe(url, head, timeout)
		return data, err
	}
	return "", errors.Wrap(err, "convert url error")
}
