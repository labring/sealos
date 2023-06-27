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
	"container/list"
	"errors"
	"strings"
)

type Errors interface {
	Concat(separator string, errs ...error) error
}

type ErrorMgr struct {
	errs *list.List
}

func (em *ErrorMgr) Push(infos ...string) {
	if len(infos) == 0 {
		return
	}
	for _, info := range infos {
		em.errs.PushFront(info)
	}
}

func (em *ErrorMgr) Concat(separator string) error {
	if em.errs == nil || em.errs.Len() == 0 {
		return nil
	}
	var res strings.Builder
	for e := em.errs.Back(); e != nil; e = e.Prev() {
		res.WriteString(e.Value.(string))
		if e.Prev() != nil {
			res.WriteString(separator)
		}
	}
	return errors.New(res.String())
}

func NewErrorMgr(errs ...string) *ErrorMgr {
	em := ErrorMgr{errs: list.New()}
	em.Push(errs...)
	return &em
}

func LoadError(err string, em *ErrorMgr) *ErrorMgr {
	em.errs.PushBack(err)
	return em
}
