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

const NoticeFrom = "Sealos Cloud"

var Key = "asdhjkwqdaskdjhqjwdakxausdasdajs"

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
