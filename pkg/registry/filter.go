/*
Copyright 2022 cuisongliu@qq.com.

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

package registry

import (
	"errors"
	"fmt"
	"strings"

	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/maps"
	strings2 "github.com/labring/sealos/pkg/utils/strings"
)

const none = "<none>"

type FilterType string

const (
	FilterTypeName = "name"
	FilterTypeTag  = "tag"
)

type FilterStrategy string

const (
	FilterStrategyNone    = "none"
	FilterStrategyPrefix  = "prefix"
	FilterStrategySuffix  = "suffix"
	FilterStrategyDefault = "default"
	FilterStrategyEquals  = "equals"
	FilterStrategyAll     = "all"
	FilterStrategyUnknown = "unknown"
)

type Filter struct {
	Name         string
	Tag          string
	nameStrategy FilterStrategy
	tagStrategy  FilterStrategy
}

func (f *Filter) Validate() error {
	check := func(filter string, t FilterType) (FilterStrategy, error) {
		if filter == none {
			if t == FilterTypeName {
				return FilterStrategyUnknown, errors.New("your filter repo not allow is none")
			}
			return FilterStrategyNone, nil
		}

		if filter == "" {
			return FilterStrategyAll, nil
		}
		if len(filter) == 1 && filter == "*" {
			return FilterStrategyAll, nil
		}
		if strings.Contains(filter, "*") {
			if filter[0] == '*' && filter[len(filter)-1] == '*' {
				return FilterStrategyDefault, nil
			}
			if filter[0] == '*' {
				if strings.LastIndex(filter, "*") == 0 {
					return FilterStrategySuffix, nil
				}
				return FilterStrategyUnknown, fmt.Errorf("your filter must has one char '*' , example *ccc ")
			}
			if filter[len(filter)-1] == '*' {
				if strings.LastIndex(filter, "*") == len(filter)-1 {
					return FilterStrategyPrefix, nil
				}
				return FilterStrategyUnknown, fmt.Errorf("your filter must has one char '*' , example ccc* ")
			}
			return FilterStrategyUnknown, fmt.Errorf("not spport char '*' in filter middle")
		}
		return FilterStrategyEquals, nil
	}

	errorlist := make([]error, 0)
	strategy, err := check(f.Name, FilterTypeName)
	if err != nil {
		errorlist = append(errorlist, err)
	}
	f.nameStrategy = strategy

	strategy, err = check(f.Tag, FilterTypeTag)
	if err != nil {
		errorlist = append(errorlist, err)
	}
	f.tagStrategy = strategy

	if len(errorlist) == 0 {
		return nil
	}

	return fmt.Errorf("your filter has some errors: %+v", errorlist)
}

func (f *Filter) Run(data []string, t FilterType) []string {
	if t == FilterTypeName {
		return filter(data, f.Name, f.nameStrategy)
	}
	return filter(data, f.Tag, f.tagStrategy)
}

func newFilter(filter string) *Filter {
	filterMap := maps.StringToMap(filter, ",")
	for key := range filterMap {
		if !strings2.InList(key, []string{FilterTypeName, FilterTypeTag}) {
			logger.Warn("filter key not support: %s", key)
		}
	}
	return &Filter{
		Name: filterMap[FilterTypeName],
		Tag:  filterMap[FilterTypeTag],
	}
}

func filter(data []string, filter string, strategy FilterStrategy) []string {
	prefix := func(data []string, filter string) []string {
		res := make([]string, 0)
		for _, d := range data {
			if strings.HasPrefix(d, filter) {
				res = append(res, d)
			}
		}
		return res
	}

	suffix := func(data []string, filter string) []string {
		res := make([]string, 0)
		for _, d := range data {
			if strings.HasSuffix(d, filter) {
				res = append(res, d)
			}
		}
		return res
	}

	contains := func(data []string, filter string) []string {
		res := make([]string, 0)
		for _, d := range data {
			if strings.Contains(d, filter) {
				res = append(res, d)
			}
		}
		return res
	}

	switch strategy {
	case FilterStrategyDefault:
		return contains(data, filter[1:len(filter)-1])
	case FilterStrategyPrefix:
		return prefix(data, filter[:len(filter)-1])
	case FilterStrategySuffix:
		return suffix(data, filter[1:])
	case FilterStrategyNone:
		return []string{}
	case FilterStrategyAll:
		return data
	case FilterStrategyEquals:
		return []string{filter}
	default:
	}
	return []string{}
}
