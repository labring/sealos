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
	"context"
	"encoding/json"
	"io"
	"net/http"
	"reflect"
	"sync"

	cl "sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	Namespace       string = "cloud-system"
	LicenseName     string = "cloud-license"
	SecretName      string = "cloud-secret"
	ConfigName      string = "cloud-config"
	CloudStartName  string = "cloud-start"
	ClientStartName string = "client-start"
)

const (
	ContentType      = "Content-Type"
	ContentTypePlain = "text/plain"
	ContentTypeHTML  = "text/html"
	ContentTypeJSON  = "application/json"
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

type Collector struct {
	UID      string   `json:"uid"`
	InfoType string   `json:"infoType"`
	Resource Resource `json:"clusterResource,omitempty"`
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

type Resource struct {
	NodeNum string `json:"nodes"`
	GPU     string `json:"gpu"`
	CPU     string `json:"cpu"`
	Memery  string `json:"memery"`
	Disk    string `json:"disk"`
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

func Convert(body []byte, content interface{}, options ...ConvertOptions) *ErrorMgr {
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
	if len(options) > 0 {
		err := options[0].callbackConvert(content)
		if err != nil {
			return NewErrorMgr("Convert", "callbackConvert", err.Error())
		}
	}

	return nil
}

func IsSuccessfulStatusCode(statusCode int) bool {
	return statusCode == http.StatusOK || statusCode == http.StatusCreated || statusCode == http.StatusAccepted || statusCode == http.StatusNoContent
}

//**************************************************************************//

type Worker interface {
	Work(ctx context.Context, client cl.Client) error
}

func AsyncCloudTask(ctx context.Context, client cl.Client, errorchannel chan *ErrorMgr, wg *sync.WaitGroup, wk Worker) {
	defer wg.Done()
	if err := wk.Work(ctx, client); err != nil {
		errorchannel <- NewErrorMgr("asyncCloudTask", err.Error())
	}
}

//**************************************************************************//

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
