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

package client

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/labring/sealos/pkg/registry/distributionpkg/client/auth/challenge"

	"github.com/distribution/distribution/v3/registry/api/errcode"
)

// ErrNoErrorsInBody is returned when an HTTP response body parses to an empty
// errcode.Errors slice.
var ErrNoErrorsInBody = errors.New("no error details found in HTTP response body")

// UnexpectedHTTPStatusError is returned when an unexpected HTTP status is
// returned when making a registry api call.
type UnexpectedHTTPStatusError struct {
	Status string
}

func (e *UnexpectedHTTPStatusError) Error() string {
	return fmt.Sprintf("received unexpected HTTP status: %s", e.Status)
}

// UnexpectedHTTPResponseError is returned when an expected HTTP status code
// is returned, but the content was unexpected and failed to be parsed.
type UnexpectedHTTPResponseError struct {
	ParseErr   error
	StatusCode int
	Response   []byte
}

func (e *UnexpectedHTTPResponseError) Error() string {
	return fmt.Sprintf("error parsing HTTP %d response body: %s: %q", e.StatusCode, e.ParseErr.Error(), string(e.Response))
}

func parseHTTPErrorResponse(statusCode int, r io.Reader) error {
	var errors errcode.Errors
	body, err := io.ReadAll(r)
	if err != nil {
		return err
	}

	// For backward compatibility, handle irregularly formatted
	// messages that contain a "details" field.
	var detailsErr struct {
		Details string `json:"details"`
	}
	err = json.Unmarshal(body, &detailsErr)
	if err == nil && detailsErr.Details != "" {
		switch statusCode {
		case http.StatusUnauthorized:
			return errcode.ErrorCodeUnauthorized.WithMessage(detailsErr.Details)
		case http.StatusTooManyRequests:
			return errcode.ErrorCodeTooManyRequests.WithMessage(detailsErr.Details)
		default:
			return errcode.ErrorCodeUnknown.WithMessage(detailsErr.Details)
		}
	}

	if err := json.Unmarshal(body, &errors); err != nil {
		return &UnexpectedHTTPResponseError{
			ParseErr:   err,
			StatusCode: statusCode,
			Response:   body,
		}
	}

	if len(errors) == 0 {
		// If there was no error specified in the body, return
		// UnexpectedHTTPResponseError.
		return &UnexpectedHTTPResponseError{
			ParseErr:   ErrNoErrorsInBody,
			StatusCode: statusCode,
			Response:   body,
		}
	}

	return errors
}

func makeErrorList(err error) []error {
	if errL, ok := err.(errcode.Errors); ok {
		return []error(errL)
	}
	return []error{err}
}

func mergeErrors(err1, err2 error) error {
	return errcode.Errors(append(makeErrorList(err1), makeErrorList(err2)...))
}

// HandleErrorResponse returns error parsed from HTTP response for an
// unsuccessful HTTP response code (in the range 400 - 499 inclusive). An
// UnexpectedHTTPStatusError returned for response code outside of expected
// range.
func HandleErrorResponse(resp *http.Response) error {
	if resp.StatusCode >= 400 && resp.StatusCode < 500 {
		// Check for OAuth errors within the `WWW-Authenticate` header first
		// See https://tools.ietf.org/html/rfc6750#section-3
		for _, c := range challenge.ResponseChallenges(resp) {
			if c.Scheme == "bearer" {
				var err errcode.Error
				// codes defined at https://tools.ietf.org/html/rfc6750#section-3.1
				switch c.Parameters["error"] {
				case "invalid_token":
					err.Code = errcode.ErrorCodeUnauthorized
				case "insufficient_scope":
					err.Code = errcode.ErrorCodeDenied
				default:
					continue
				}
				if description := c.Parameters["error_description"]; description != "" {
					err.Message = description
				} else {
					err.Message = err.Code.Message()
				}

				return mergeErrors(err, parseHTTPErrorResponse(resp.StatusCode, resp.Body))
			}
		}
		err := parseHTTPErrorResponse(resp.StatusCode, resp.Body)
		if uErr, ok := err.(*UnexpectedHTTPResponseError); ok && resp.StatusCode == 401 {
			return errcode.ErrorCodeUnauthorized.WithDetail(uErr.Response)
		}
		return err
	}
	return &UnexpectedHTTPStatusError{Status: resp.Status}
}

// SuccessStatus returns true if the argument is a successful HTTP response
// code (in the range 200 - 399 inclusive).
func SuccessStatus(status int) bool {
	return status >= 200 && status <= 399
}
