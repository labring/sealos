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
	"math"
	"testing"
	"time"

	"github.com/labring/sealos/controllers/pkg/common"
	"k8s.io/apimachinery/pkg/api/resource"

	v1 "github.com/prometheus/client_golang/api/prometheus/v1"
)

func Test_prometheus_QueryNSTraffics(t *testing.T) {
	p, err := NewPrometheus("http://10.96.3.154:9090")
	if err != nil {
		t.Fatal(err)
	}
	//curl -G 'http://10.96.3.154:9090/api/v1/query_range' \
	//     --data-urlencode 'query=sealos_nm_trafficstat_ipv4_ingress_bytes_total{targetNamespace="profiling"}' \
	//     --data-urlencode 'start=2023-08-16T03:48:42.781Z' \
	//     --data-urlencode 'end=2023-08-16T05:48:42.781Z' \
	//     --data-urlencode 'step=1h'
	metering, err := p.QueryNSTraffics("profiling", QueryParams{
		Range: &v1.Range{
			//time.Time类型
			Start: time.Date(2023, 8, 16, 5, 48, 42, 781000000, time.UTC),
			End:   time.Date(2023, 8, 16, 6, 48, 42, 781000000, time.UTC),
			Step:  time.Hour,
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	fmt.Printf("%+v", metering)
}

func Test_prometheus_QueryAllNSTraffics(t *testing.T) {
	p, err := NewPrometheus("http://10.96.3.154:9090")
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now().UTC()
	queryTime := time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), 0, 0, 0, time.UTC)
	metering, err := p.QueryAllNSTraffics(QueryParams{
		Range: &v1.Range{
			//time.Time类型
			Start: queryTime.Add(-18 * time.Hour).UTC(),
			End:   queryTime,
			Step:  time.Hour,
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	for i := range metering {
		meter := metering[i]
		fmt.Printf("%s network traffic > time %s, value: %d, amount: %d \n\n", meter.Category, meter.Time.Format("2006-01-02 15:04:05"), calculateValue(meter.Value), calculateAmount(common.Price{
			Price: 586,
		}, meter.Value))
	}
}

func calculateValue(value int64) int64 {
	return int64(math.Ceil(
		float64(resource.NewQuantity(value, resource.BinarySI).MilliValue()) /
			float64(common.PricesUnit[common.NetWork].MilliValue())))
}

func calculateAmount(netPrice common.Price, value int64) int64 {
	return int64(math.Ceil(float64(netPrice.Price) / float64(1024*1024) * float64(value)))
}
