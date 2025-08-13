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

package errors

import "errors"

var (
	ErrLicenseInvalid         = errors.New("the license provided appears to be invalid")
	ErrLicenseTypeNotMatch    = errors.New("the license type provided appears to be invalid")
	ErrClaimsConvent          = errors.New("the claims data provided appears to be invalid")
	ErrClusterIDNotMatch      = errors.New("the cluster id provided appears to be invalid")
	ErrClusterLicenseNotMatch = errors.New("the cluster license provided appears to be invalid")
	ErrLicenseExpired         = errors.New("the license provided appears to be expired")
)
