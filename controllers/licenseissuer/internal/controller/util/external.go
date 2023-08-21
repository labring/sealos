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

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"reflect"
)

type HTTPBody struct {
	ContentType string
	StatusCode  int
	Body        []byte
}

type HTTPResponse struct {
	ContentType string
	StatusCode  int
	Body        []byte
}

// The Push method is used to handle one-way interaction, that is,
// there is no need to obtain information from the cloud, only need to send information to the cloud.
func Push(url string, content interface{}) error {
	body, err := CommunicateWithCloud("POST", url, content)
	if err != nil {
		return fmt.Errorf("communicateWithCloud: %w", err)
	}
	if !IsSuccessfulStatusCode(body.StatusCode) {
		return fmt.Errorf("error status: %s", http.StatusText(body.StatusCode))
	}
	return nil
}

// The Pull method is used to handle two-way interaction,
// that is, there is a need to obtain information from the cloud,
// and then send information to the cloud.
func Pull(url string, content interface{}) (HTTPResponse, error) {
	body, err := CommunicateWithCloud("POST", url, content)
	if err != nil {
		return HTTPResponse{}, fmt.Errorf("communicateWithCloud: %w", err)
	}
	if !IsSuccessfulStatusCode(body.StatusCode) {
		return HTTPResponse{}, fmt.Errorf("error status: %s", http.StatusText(body.StatusCode))
	}
	return body, nil
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
