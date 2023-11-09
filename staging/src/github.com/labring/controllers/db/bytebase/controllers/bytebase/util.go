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

package bytebase

import (
	"crypto/rand"
	"math/big"
	"strings"
	"time"

	bbv1 "github.com/labring/sealos/controllers/db/bytebase/apis/bytebase/v1"
)

// isExpired return true if the bb has expired
func isExpired(bb *bbv1.Bytebase) bool {
	anno := bb.ObjectMeta.Annotations
	lastUpdateTime, err := time.Parse(time.RFC3339, anno[KeepaliveAnnotation])
	if err != nil {
		// treat parse errors as not expired
		return false
	}

	duration, _ := time.ParseDuration(bb.Spec.Keepalived)
	return lastUpdateTime.Add(duration).Before(time.Now())
}

func buildLabelsMap(bb *bbv1.Bytebase) map[string]string {
	labelsMap := map[string]string{
		"app": bb.Name,
	}
	return labelsMap
}

// generateRandomString returns a securely generated random string.
// It will return an error if the system's secure random
// number generator fails to function correctly, in which
// case the caller should not continue.
func generateRandomString(n int) (string, error) {
	const letters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-"
	ret := make([]byte, n)
	for i := 0; i < n; i++ {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(letters))))
		if err != nil {
			return "", err
		}
		ret[i] = letters[num.Int64()]
	}

	return string(ret), nil
}

func generateDefaultNginxConfigSnippet(rootDomain string) string {
	wholeSnippet := ""
	// clean up X-Frame-Options
	part := `more_clear_headers "X-Frame-Options:"; `
	wholeSnippet += part
	// set up Content-Security-Policy
	part = `more_set_headers "Content-Security-Policy: default-src * blob: data: *.cloud.sealos.io cloud.sealos.io; img-src * data: blob: resource: *.cloud.sealos.io cloud.sealos.io; connect-src * wss: blob: resource:; style-src 'self' 'unsafe-inline' blob: *.cloud.sealos.io cloud.sealos.io resource:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: *.cloud.sealos.io cloud.sealos.io resource: *.baidu.com *.bdstatic.com; frame-src 'self' *.cloud.sealos.io cloud.sealos.io mailto: tel: weixin: mtt: *.baidu.com; frame-ancestors 'self' https://cloud.sealos.io https://*.cloud.sealos.io"; `
	wholeSnippet += strings.ReplaceAll(part, "cloud.sealos.io", rootDomain)
	// set up X-Xss-Protection
	part = `more_set_headers "X-Xss-Protection: 1; mode=block"; `
	wholeSnippet += part
	// set up Cache-Control
	part = `if ($request_uri ~* \.(js|css|gif|jpe?g|png)) {
	        expires 30d;
	        add_header Cache-Control "public";
	    } `
	wholeSnippet += part
	return wholeSnippet
}
