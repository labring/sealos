/*
Copyright 2022.

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

package processor

import (
	"errors"
	"strings"
)

const (
	RunGuestFailed = "RunGuestFailed"
)

func IsRunGuestFailed(err error) bool {
	if err == nil {
		return false
	}
	return strings.HasPrefix(err.Error(), RunGuestFailed)
}

var ErrCancelled = errors.New("cancelled")

type CheckError struct {
	err error
}

func (e *CheckError) Error() string {
	return e.err.Error()
}

func NewCheckError(err error) error {
	if err != nil {
		err = &CheckError{err: err}
	}
	return err
}

type PreProcessError struct {
	err error
}

func (e *PreProcessError) Error() string {
	return e.err.Error()
}

func NewPreProcessError(err error) error {
	if err != nil {
		err = &PreProcessError{err: err}
	}
	return err
}
