/*
Copyright 2023.

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

package util

const (
	SealosNamespace = "sealos-system"
	ClusterInfo     = "cluster-info"
	URLConfig       = "url-config"
	// add more resource name here
)

const (
	ContentType      = "Content-Type"
	ContentTypePlain = "text/plain"
	ContentTypeHTML  = "text/html"
	ContentTypeJSON  = "application/json"
)

const (
	CollectorURL      = "CollectorURL"
	NotificationURL   = "NotificationURL"
	RegisterURL       = "RegisterURL"
	CloudSyncURL      = "CloudSyncURL"
	LicenseMonitorURL = "LicenseMonitorURL"
	// Add more url here
)

const (
	// pre-defined user name and password
	defaultuser     = "root"
	defaultPassword = "sealos2023"

	// kubernetes default user cr is admin
	// it is corresponding to the root account
	defaultK8sUser = "admin"

	// the default db and collection of mongodb to store user information
	defaultDB         = "test"
	defaultCollection = "user"
)

const NoticeFrom = "Sealos Cloud"
