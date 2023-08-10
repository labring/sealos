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
	// SealosNamespace = "sealos-system"
	ClusterInfo    = "cluster-info"
	URLConfig      = "url-config"
	LicenseHistory = "license-history"
	LicenseName    = "license"
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

const BaseCount = 1000000

const Key = "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUFvbFBTSzB0UjFKeDZtb25lL2ppeApSWGN6UGlxcU5SSXRmdW1mdWNyNGMxc2dqdlJha0NwcWtDU21lMTR1akJkU0x6QlZzRjkvUWl0UnFNb2NvaEN1CkJ6R25EQ29hWnZXbWVHeE96NEZSejVTeUg1QTlDa3dnbUEzYnFnMWxKSEZTMlZyVjVHVFhFWnphZTZtRmhHOVcKenJMTnpZMlptYTMzOVE1WTNJSDZ6RXIrcTRQbTZDOXBHVGpsSnVodlRvb0dSY2w0bmpZRXc2eHB6ZHZrdi9uSApmZmxsWGZVNDNyRGdQaGkwZDRjWnNuTUJlazUxQkNiRFRuSHlNVFdGT1RoTjc1VVM0bzJxRm9JSEhsM0N0RzE4ClZIZEdRSE1IR0dYcGN3bVhhck1EQndwVWFOSk9kMkhjTTB5dlZEY2xDZzRITkIwVUFWeFNweFlRV3BwNWJzN2gKbHdJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg=="

const MaxSizeThresholdStr = "800Ki"

const (
	Sealos                     string = "Sealos Cloud"
	ClusterCapacityNoticeTitle string = "Attention: Cluster Capacity Alert"
	LicenseNoticeTitle         string = "Attention: License Issue"
	InvalidLicenseMessage      string = "The license provided appears to be invalid. Please verify and try again."
	ExpiredLicenseMessage      string = "The license provided has expired. Please renew and try again."
	ValidLicenseMessage        string = "Your license has been successfully activated and is now ready for use. Enjoy your Sealos experience!"
	DuplicateLicenseMessage    string = "The license provided has already been activated. Please use a different license."
	RechargeFailedMessage      string = "License recharge operation failed."
)

const (
	CreatTimeField = "iat"
	AmountField    = "amt"
	NodeField      = "nod"
	CPUField       = "cpu"
	DurationField  = "tte"
	AddNodeField   = "and"
	AddCPUField    = "adc"
)

const (
	PeriodicPolicy = "Periodic"
	OncePolicy     = "Once"
)
