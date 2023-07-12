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

package manager

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"reflect"
	"sync"
)

type Date string
type Label string
type Message string
type Title string
type Source string
type TypeInfo string
type Resource string
type ENV string

const BaseCount = 1000000

const Key = "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUFvbFBTSzB0UjFKeDZtb25lL2ppeApSWGN6UGlxcU5SSXRmdW1mdWNyNGMxc2dqdlJha0NwcWtDU21lMTR1akJkU0x6QlZzRjkvUWl0UnFNb2NvaEN1CkJ6R25EQ29hWnZXbWVHeE96NEZSejVTeUg1QTlDa3dnbUEzYnFnMWxKSEZTMlZyVjVHVFhFWnphZTZtRmhHOVcKenJMTnpZMlptYTMzOVE1WTNJSDZ6RXIrcTRQbTZDOXBHVGpsSnVodlRvb0dSY2w0bmpZRXc2eHB6ZHZrdi9uSApmZmxsWGZVNDNyRGdQaGkwZDRjWnNuTUJlazUxQkNiRFRuSHlNVFdGT1RoTjc1VVM0bzJxRm9JSEhsM0N0RzE4ClZIZEdRSE1IR0dYcGN3bVhhck1EQndwVWFOSk9kMkhjTTB5dlZEY2xDZzRITkIwVUFWeFNweFlRV3BwNWJzN2gKbHdJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg=="
const FreeQuata = "LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUV2UUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktjd2dnU2pBZ0VBQW9JQkFRQ2lVOUlyUzFIVW5IcWEKaWQ3K09MRkZkek0rS3FvMUVpMSs2Wis1eXZoeld5Q085RnFRS21xUUpLWjdYaTZNRjFJdk1GV3dYMzlDSzFHbwp5aHlpRUs0SE1hY01LaHBtOWFaNGJFN1BnVkhQbExJZmtEMEtUQ0NZRGR1cURXVWtjVkxaV3RYa1pOY1JuTnA3CnFZV0ViMWJPc3MzTmpabVpyZmYxRGxqY2dmck1TdjZyZytib0wya1pPT1VtNkc5T2lnWkZ5WGllTmdURHJHbk4KMitTLytjZDkrV1ZkOVRqZXNPQStHTFIzaHhteWN3RjZUblVFSnNOT2NmSXhOWVU1T0UzdmxSTGlqYW9XZ2djZQpYY0swYlh4VWQwWkFjd2NZWmVsekNaZHFzd01IQ2xSbzBrNTNZZHd6VEs5VU55VUtEZ2MwSFJRQlhGS25GaEJhCm1ubHV6dUdYQWdNQkFBRUNnZ0VBRzVsQnZlK240WXliUWNRWUlFUDJTOWU0NUNSdjNPY1N5aVdoYlA3SDRDRUoKdDVSdkExemEwbGdRNEIvQ3JUblgxTU1VaHBDdCs4dU9yakp5ek5FbUxYM3hKMTNQTUZzcXF3WExIbmVmdDduUgowUkQrZDg0NnFtK012ZXhhR21pVUMvVm9NVlU5eGJaVDVUdU13bGdGdTgzbHRNR1M4SENHSEdtTWpTMGlQWEpyCkRBTm8wZkRmZjYrYzJHZjd0T3QreCtUenFndGFzZ1JGdzlkeU1iYi9pZnlqUjZQblBnR0wxZVF5Rkg0UHcxU0UKQm9qNXkvcE8yWmlITTJnMnRicVl0aWtrMEpsUElJT2lhQnFvT2lkR3c5cEtrYXBBVGs0MHZrWnlqVG1Oa3ZoRwo2enVVdDVqT3NBL0RnMmZoajBzM0w5UjVnbVlxRlBaZnVKK1kyVFVhNlFLQmdRRGg1cE1hNU1HcUpkU2pzQy9pCmt5VEpiVzljcWgyd0wzY0pUc1c4QnpYejJFU25VTVh6Sm03TDY0QkdCdE5WZ01pdStDSEVVYzZrRS85VnhmQkcKZk1mZTdtSnRmcDIxNFA2SFpxT2hhbXFENGtVS1JzdjRWL3JwTlFISWhkZkRwcmR5ZWtqaTBJaVROU0xTdmxwcwo0SjQ3NUxBVi9YZmZWOXpjQVZ1Nk5oS2NUd0tCZ1FDMzlNYVljd0M0RG82ZS9yUHp2anB1TXJzTkg0ZHV0Ri9YCkJiYzhsSHVjTlc4bEN0OFhpcm54c0duY2pqalNIcEVOa2cvVGJMRmNlSHUydlExajBiZjAyZ2RUdXplRUkvMDUKQjRHeUVpNmFJVjVaSjVLS29jMnFsM0gzOVQ4cnZsZGRnTXZYdVBiTk5MM3lKN1hrYTF0L0FraDlEeFBIa1ZYVwp0ck5Tdjh1c09RS0JnRHhaUU10YWVYSmZFT041MmhFSmhqWlppZnFUWjhMOXF5dE5ZLzNMWDFwNVdEM3FramRXCitScDVHNWVaa3pPd1oreDJWVzhBKzlkUmtGRDF4QzdRZndUTFluZ2w3elA3bTRQSW84WW5pN1VYNmFISk1BeDAKVkkrZ25ZMVlWRC9zZGUyYlJZVnllRW43VkFaQTNCOWlFbU9sd0hUZmRmcXdta3djQU1sS1VNWjVBb0dCQUp0OApWOGhQbkZIMmEvSlQwd0s0eldhTGxyTVc3VUJUVVpiTGkvKzJlV3lsZFpaWHhBMkFBbjhZMzhHK3JLUmRsYmxrCnRkKzh4WVVsaVZ3Q0c2azlnRUdEY0NJRDRuN2NkSktabDdSTnpmb1ZMa3dwT0tIWTlaKzFkbTFoYTgycml1akwKam9CK0pJMTZnUHFIT2lVaDRTcFBZYm5pM3BNV2N2bVRYNnNYMWkxeEFvR0FBWFVBVUFFemI5QnlVRmdSenMzZQpFd3YwaDQ0THkwVldaeXhPYkN2V25LbURHM29meFhBY0VQekpNTzZaRnlvb1AxVS8xbklNY3hLa2hLMStDWjFnCkZsdTVsV215N29XVDFQNVRoZ0trdWFGeGttaXZHbE51NU0rS00xRzdvUXVNbk00L2hFUlNMK2cwQWVqd1JGbFYKUUVZM2ZVOWxjMVNFamhpS0Jqa0VPcXc9Ci0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0K"

const (
	Namespace         Resource = "cloud-system"
	LimitSecretName   Resource = "limit-secret"
	LicenseHistory    Resource = "cloud-license-history"
	LicenseName       Resource = "license"
	UidSecretName     Resource = "cloud-secret"
	UrlConfigName     Resource = "cloud-config"
	MonitorLaunchName Resource = "cloud-start"
	ClientStartName   Resource = "client-start"
)

const (
	ContentType      = "Content-Type"
	ContentTypePlain = "text/plain"
	ContentTypeHTML  = "text/html"
	ContentTypeJSON  = "application/json"
)

const (
	SEALOS                         Source  = "Sealos Cloud"
	ErrorLicenseTitle              Title   = "License Activation Failed"
	InvalidLicenseTitle            Title   = "Invalid License"
	UnKnownErrorOfLicense          Title   = "UnKnown error about license"
	ValidLicenseTitle              Title   = "License Activated"
	RechargeFailedTitle            Title   = "Recharge failed"
	DuplicateLicenseTitle          Title   = "Duplicate License"
	RegistrationSuccessTitle       Title   = "Registration Success"
	InvalidLicenseContent          Message = "The provided license is invalid. Please check and try."
	ErrorLicenseTitleContent       Message = "License delivery encountered an unexpected error. Please ensure your cluster is operating normally..."
	UnKnownErrorOfLicenseCotentent Message = "During the license activation process, a location issue occurred, possibly due to network problems. If it affects your usage, please contact us."
	LicenseTimeOutContent          Message = "The provided license has expired. Please check and try."
	ValidLicenseContent            Message = "Your license has been successfully activated and is ready to use. Enjoy your experience!"
	DuplicateLicenseContent        Message = "The provided license has already been used. Please use a different license."
	RegistrationSuccessContent     Message = "Congratulations! You have successfully registered. Welcome aboard!"
	RechargeFailedContent          Message = "Your license failed to recharge."
)

const (
	ExternalNetworkAccessLabel Label = "external-network-access"
	IsDisabled                 Label = "isDisabled"
	IsCollector                Label = "isCollector"
	IsNotification             Label = "isNotification"
	IsSync                     Label = "isSync"
	IsRead                     Label = "isRead"
	Enabled                    Label = "enabled"
	Disabled                   Label = "disabled"
)

const (
	IsMonitor ENV = "isMonitor"
)

const (
	NetWorkEnv string = "CAN_CONNECT_TO_EXTERNAL_NETWORK"
)

const (
	TRUE  = "true"
	FALSE = "false"
)

type PolicyAction string

type NotificationRequest struct {
	UID       string `json:"uid"`
	Timestamp int64  `json:"timestamp"`
}

type RegisterRequest struct {
	UID string `json:"uid"`
}

type NotificationResponse struct {
	ID        string `json:"_id"`
	Type      string `json:"msgType"`
	Title     string `json:"title"`
	Message   string `json:"message"`
	Timestamp int64  `json:"timestamp"`
}

type HTTPResponse struct {
	ContentType string
	StatusCode  int
	Body        []byte
}

type ClusterInfo struct {
	UID string `json:"uid"`
	Key string `json:"key"`
}

type License struct {
	Token       string `json:"token"`
	Description string `json:"description"`
}

type HTTPBody struct {
	ContentType string
	StatusCode  int
	Body        []byte
}

type ConvertOptions interface {
	callbackConvert(data interface{}) error
}

func SyncWithCloud(method string, url string, content interface{}) (HTTPResponse, error) {
	httpBody, err := CommunicateWithCloud("POST", url, content)
	if err != nil {
		return HTTPResponse{}, fmt.Errorf(err.Error(), "failed to communicate with cloud")
	}
	if IsSuccessfulStatusCode(httpBody.StatusCode) {
		text := http.StatusText(httpBody.StatusCode)
		return HTTPResponse{}, fmt.Errorf(text, "failed to communicate with cloud")
	}
	return httpBody, nil
}

func CommunicateWithCloud(method string, url string, content interface{}) (HTTPResponse, error) {
	var req *http.Request
	var resp *http.Response
	var err error
	// create a http request to cloud
	req, err = sendRequest(method, url, content)
	if err != nil {
		return HTTPResponse{}, fmt.Errorf("sendRequest: %w", err)
	}
	resp, err = getResponse(req)
	if err != nil {
		return HTTPResponse{}, fmt.Errorf("getResponse: %w", err)
	}
	defer resp.Body.Close()
	return readResponse(resp)
}

func Convert(body []byte, content interface{}) error {
	if body == nil {
		return fmt.Errorf("Convert: the body is empty")
	}
	contentValue := reflect.ValueOf(content)
	if contentValue.Kind() != reflect.Ptr || contentValue.IsNil() {
		return fmt.Errorf("Convert: content must be a non-nil pointer")
	}

	if err := json.Unmarshal(body, content); err != nil {
		return fmt.Errorf("Convert: json.Unmarshal: %w", err)
	}

	return nil
}

func IsSuccessfulStatusCode(statusCode int) bool {
	return statusCode == http.StatusOK || statusCode == http.StatusCreated || statusCode == http.StatusAccepted || statusCode == http.StatusNoContent
}

type Task interface {
	Run() error
}

func AsyncCloudTask(wg *sync.WaitGroup, errChannel chan error, tk Task) {
	defer wg.Done()
	errChannel <- tk.Run()
}

func sendRequest(method string, url string, content interface{}) (*http.Request, error) {
	var body []byte
	var req *http.Request
	var err error

	if body, err = json.Marshal(content); err != nil {
		return nil, fmt.Errorf("json.Marshal: %w", err)
	}
	req, err = http.NewRequest(method, url, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("http.NewRequest: %w", err)
	}
	if method == "POST" {
		req.Header.Set(ContentType, ContentTypeJSON)
	}
	return req, nil
}

func getResponse(req *http.Request) (*http.Response, error) {
	if req == nil {
		return nil, fmt.Errorf("getResponse: no http request")
	}
	defer req.Body.Close()
	var resp *http.Response
	var err error
	client := http.Client{}
	resp, err = client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("getResponse: %w", err)
	}
	return resp, nil
}

func readResponse(resp *http.Response) (HTTPResponse, error) {
	defer resp.Body.Close()
	var httpResp HTTPResponse
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return HTTPResponse{}, fmt.Errorf("readResponse: %w", err)
	}
	httpResp.Body = bodyBytes
	httpResp.ContentType = resp.Header.Get(ContentType)
	httpResp.StatusCode = resp.StatusCode
	return httpResp, nil
}
