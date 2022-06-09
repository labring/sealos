// Copyright © 2022 https://github.com/distribution/distribution
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

package auth

import (
	"net/http"
	"strings"
)

// APIVersion represents a version of an API including its
// type and version number.
type APIVersion struct {
	// Type refers to the name of a specific API specification
	// such as "registry"
	Type string

	// Version is the version of the API specification implemented,
	// This may omit the revision number and only include
	// the major and minor version, such as "2.0"
	Version string
}

// String returns the string formatted API Version
func (v APIVersion) String() string {
	return v.Type + "/" + v.Version
}

// APIVersions gets the API versions out of an HTTP response using the provided
// version header as the key for the HTTP header.
func APIVersions(resp *http.Response, versionHeader string) []APIVersion {
	versions := []APIVersion{}
	if versionHeader != "" {
		for _, supportedVersions := range resp.Header[http.CanonicalHeaderKey(versionHeader)] {
			for _, version := range strings.Fields(supportedVersions) {
				versions = append(versions, ParseAPIVersion(version))
			}
		}
	}
	return versions
}

// ParseAPIVersion parses an API version string into an APIVersion
// Format (Expected, not enforced):
// API version string = <API type> '/' <API version>
// API type = [a-z][a-z0-9]*
// API version = [0-9]+(\.[0-9]+)?
// TODO(dmcgowan): Enforce format, add error condition, remove unknown type
func ParseAPIVersion(versionStr string) APIVersion {
	idx := strings.IndexRune(versionStr, '/')
	if idx == -1 {
		return APIVersion{
			Type:    "unknown",
			Version: versionStr,
		}
	}
	return APIVersion{
		Type:    strings.ToLower(versionStr[:idx]),
		Version: versionStr[idx+1:],
	}
}
