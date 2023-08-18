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

package metrics

//sealos_nm_trafficstat_ipv4_ingress_bytes_total
//{container="kube-rbac-proxy", endpoint="https",
//identity="external", instance="10.0.1.117:8443",
//job="sealos-networkmanager-controller-manager-metrics-service",
//namespace="sealos-networkmanager-system",
//pod="sealos-networkmanager-controller-manager-csz4f",
//service="sealos-networkmanager-controller-manager-metrics-service",
//targetNamespace="default"}

//curl -G 'http://10.96.3.154:9090/api/v1/query_range' \
//     --data-urlencode 'query=sealos_nm_trafficstat_ipv4_ingress_bytes_total{targetNamespace="profiling"}' \
//     --data-urlencode 'start=2023-08-16T03:48:42.781Z' \
//     --data-urlencode 'end=2023-08-16T05:48:42.781Z' \
//     --data-urlencode 'step=1h'
