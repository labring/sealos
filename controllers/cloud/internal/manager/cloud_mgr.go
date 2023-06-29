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

const BaseCount = 1000000

const (
	Namespace       Resource = "cloud-system"
	LicenseHistory  Resource = "cloud-license-history"
	LicenseName     Resource = "license"
	SecretName      Resource = "cloud-secret"
	ConfigName      Resource = "cloud-config"
	CloudStartName  Resource = "cloud-start"
	ClientStartName Resource = "client-start"
)

const (
	ContentType      = "Content-Type"
	ContentTypePlain = "text/plain"
	ContentTypeHTML  = "text/html"
	ContentTypeJSON  = "application/json"
)

const (
	SEALOS                     Source  = "Sealos Cloud"
	InvalidLicenseTitle        Title   = "Invalid License"
	ValidLicenseTitle          Title   = "License Activated"
	RechargeFailedTitle        Title   = "Recharge failed"
	DuplicateLicenseTitle      Title   = "Duplicate License"
	RegistrationSuccessTitle   Title   = "Registration Success"
	InvalidLicenseContent      Message = "The provided license is invalid. Please check and try."
	LicenseTimeOutContent      Message = "The provided license has expired. Please check and try."
	ValidLicenseContent        Message = "Your license has been successfully activated and is ready to use. Enjoy your experience!"
	DuplicateLicenseContent    Message = "The provided license has already been used. Please use a different license."
	RegistrationSuccessContent Message = "Congratulations! You have successfully registered. Welcome aboard!"
	RechargeFailedContent      Message = "Your license failed to recharge."
)

const (
	ExternalNetworkAccessLabel Label = "external-network-access"
	IsDisabled                 Label = "isDisabled"
	IsRead                     Label = "isRead"
	Enabled                    Label = "enabled"
	Disabled                   Label = "disabled"
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
	UID     string  `json:"uid"`
	License License `json:"license"`
}

type License struct {
	LicensePolicy PolicyAction `json:"licensePolicy"`
	PublicKey     string       `json:"publicKey"`
	Token         string       `json:"token"`
	Description   string       `json:"description"`
}

type HTTPBody struct {
	ContentType string
	StatusCode  int
	Body        []byte
}

type ConvertOptions interface {
	callbackConvert(data interface{}) error
}

func CommunicateWithCloud(method string, url string, content interface{}) (HTTPResponse, *ErrorMgr) {
	var req *http.Request
	var resp *http.Response
	var err error
	var em *ErrorMgr
	// create a http request to cloud
	req, em = sendRequest(method, url, content)
	if em != nil {
		return HTTPResponse{}, LoadError("sendRequest", em)
	}
	resp, em = getResponse(req)
	if err != nil {
		return HTTPResponse{}, LoadError("getResponse", em)
	}
	defer resp.Body.Close()
	return readResponse(resp)
}

func Convert(body []byte, content interface{}) *ErrorMgr {
	if body == nil {
		return NewErrorMgr("Convert", "the body is empty")
	}
	contentValue := reflect.ValueOf(content)
	if contentValue.Kind() != reflect.Ptr || contentValue.IsNil() {
		return NewErrorMgr("Convert", "content must be a non-nil pointer")
	}

	if err := json.Unmarshal(body, content); err != nil {
		return NewErrorMgr("Convert", "json.Unmarshal", err.Error())
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

func sendRequest(method string, url string, content interface{}) (*http.Request, *ErrorMgr) {
	var body []byte
	var req *http.Request
	var err error

	if body, err = json.Marshal(content); err != nil {
		return nil, NewErrorMgr("json.Marshal", err.Error())
	}
	req, err = http.NewRequest(method, url, bytes.NewBuffer(body))
	if err != nil {
		return nil, NewErrorMgr("http.NewRequest", err.Error())
	}
	if method == "POST" {
		req.Header.Set(ContentType, ContentTypeJSON)
	}
	return req, nil
}

func getResponse(req *http.Request) (*http.Response, *ErrorMgr) {
	if req == nil {
		return nil, NewErrorMgr("getResponse", "no http request")
	}
	defer req.Body.Close()
	var resp *http.Response
	var err error
	client := http.Client{}
	resp, err = client.Do(req)
	if err != nil {
		return nil, NewErrorMgr("client.Do", err.Error())
	}
	return resp, nil
}

func readResponse(resp *http.Response) (HTTPResponse, *ErrorMgr) {
	defer resp.Body.Close()
	var httpResp HTTPResponse
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return HTTPResponse{}, NewErrorMgr(err.Error())
	}
	httpResp.Body = bodyBytes
	httpResp.ContentType = resp.Header.Get(ContentType)
	httpResp.StatusCode = resp.StatusCode
	return httpResp, nil
}
