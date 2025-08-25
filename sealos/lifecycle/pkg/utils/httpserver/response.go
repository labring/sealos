// Copyright © 2022 sealos.
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

package httpserver

import (
	"net/http"

	restful "github.com/emicklei/go-restful/v3"
)

type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// RespError write error to response
func RespError(resp *restful.Response, err error) error {
	// Set response status code
	code := http.StatusInternalServerError

	// String error
	message := err.Error()

	if message == "not found" || len(message) > 7 && message[:7] == "Unknown" {
		code = http.StatusNotFound
	} else if message == "unauthorized" || len(message) > 14 && message[:14] == "not authorized" {
		code = http.StatusUnauthorized
	}

	// Write error response
	return resp.WriteHeaderAndEntity(code, &Response{
		Code:    code,
		Message: message,
	})
}

// RespRedirect redirect url
func RespRedirect(resp *restful.Response, redirectURL string) {
	resp.Header().Set("Location", redirectURL)
	resp.WriteHeader(http.StatusTemporaryRedirect)
}

// RespData write error to response
func RespData(resp *restful.Response, data any) error {
	// Write error response
	return resp.WriteHeaderAndEntity(http.StatusOK, &Response{
		Code:    http.StatusOK,
		Message: "",
		Data:    data,
	})
}
