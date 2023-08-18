// Copyright © 2023 sealos.
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

package prometheus

import (
	"bytes"
	"context"
	"fmt"
	"text/template"
	"time"

	"github.com/prometheus/client_golang/api"
	v1 "github.com/prometheus/client_golang/api/prometheus/v1"
	"github.com/prometheus/common/model"
)

type Query struct {
	Namespace string
}

type QueryTmplType int

const (
	TrafficsNS QueryTmplType = iota
	TrafficsAll
)

var QueryTmplMap = map[QueryTmplType]string{
	TrafficsNS:  `sealos_nm_trafficstat_ipv4_ingress_bytes_total{targetNamespace="{{.Namespace}}"}`,
	TrafficsAll: `sealos_nm_trafficstat_ipv4_ingress_bytes_total`,
}

type QueryParams struct {
	Tmpl      QueryTmplType
	Range     *v1.Range
	Namespace string
}

type QueryExecutor interface {
	Execute(params QueryParams) (model.Value, error)
}

type queryExecutor struct {
	client v1.API
}

func (q QueryParams) GetTmpl() string {
	return QueryTmplMap[q.Tmpl]
}

func (exe *queryExecutor) Execute(params QueryParams) (model.Value, error) {
	t, err := template.New("query").Parse(params.GetTmpl())
	if err != nil {
		return nil, err
	}

	var queryStr bytes.Buffer
	if err := t.Execute(&queryStr, params); err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	var (
		result   model.Value
		warnings v1.Warnings
	)
	if params.Range != nil {
		result, warnings, err = exe.client.QueryRange(ctx, queryStr.String(), *params.Range)
	} else {
		result, warnings, err = exe.client.Query(ctx, queryStr.String(), time.Now())
	}
	if err != nil {
		return nil, err
	}
	if len(warnings) > 0 {
		fmt.Println(warnings)
	}
	return result, nil
}

func NewQueryExecutor(address string) (QueryExecutor, error) {
	client, err := api.NewClient(api.Config{Address: address})
	if err != nil {
		return nil, err
	}
	return &queryExecutor{client: v1.NewAPI(client)}, nil
}
