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
	"fmt"

	v1 "github.com/prometheus/client_golang/api/prometheus/v1"

	"github.com/labring/sealos/controllers/pkg/common"
	"github.com/prometheus/common/model"
)

type prometheus struct {
	executor QueryExecutor
}

func (p *prometheus) QueryNSTraffics(namespace string, timeRange v1.Range) (*common.Metering, error) {
	matrixData, err := p.queryTraffics(namespace, timeRange)
	if err != nil {
		return nil, err
	}
	////test
	//for _, v := range matrixData {
	//	//for i := range v.Histograms {
	//	//	fmt.Printf("Histograms %d: %s\n", i, v.Histograms[i])
	//	//}
	//	for i := range v.Metric {
	//		fmt.Printf("Metric %s: %s\n", i, v.Metric[i])
	//	}
	//	for i := range v.Values {
	//		fmt.Printf("Value %d: %s\n", i, v.Values[i].Value)
	//		fmt.Printf("Timestamp %d: %s\n", i, v.Values[i].Timestamp)
	//	}
	//}
	return &common.Metering{
		Value:    int64(matrixData[0].Values[0].Value),
		Category: namespace,
		Property: common.NetWork,
		Detail:   "network traffic",
	}, nil
}

func (p *prometheus) queryTraffics(namespace string, timeRange v1.Range) (model.Matrix, error) {
	param := QueryParams{
		Tmpl:  TrafficsAll,
		Range: &timeRange,
	}
	if namespace != "" {
		param.Tmpl = TrafficsNS
		param.Namespace = namespace
	}
	result, err := p.executor.Execute(param)
	if err != nil {
		return nil, err
	}
	matrixData, ok := result.(model.Matrix)
	if !ok {
		return nil, fmt.Errorf("invalid result type: %T", result)
	}
	if len(matrixData) == 0 {
		return nil, fmt.Errorf("query not found data")
	}
	if len(matrixData[0].Values) == 0 {
		return nil, fmt.Errorf("query not found values")
	}
	return matrixData, nil
}

func (p *prometheus) QueryAllNSTraffics(timeRange v1.Range) ([]*common.Metering, error) {
	matrixData, err := p.queryTraffics("", timeRange)
	if err != nil {
		return nil, err
	}
	var metering []*common.Metering
	for _, v := range matrixData {
		ns := string(v.Metric["targetNamespace"])
		if ns == "" {
			continue
		}
		if v.Values == nil || len(v.Values) == 0 {
			continue
		}
		metering = append(metering, &common.Metering{
			Value:    int64(v.Values[0].Value),
			Category: ns,
			Property: common.NetWork,
			Detail:   "network traffic",
		})
	}
	return metering, nil
}

func NewPrometheus(address string) (Interface, error) {
	exe, err := NewQueryExecutor(address)
	if err != nil {
		return nil, err
	}

	return &prometheus{
		executor: exe,
	}, nil
}
