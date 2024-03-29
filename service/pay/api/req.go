package api

import "errors"

type VMRequest struct {
	User          string
	Pwd           string
	NS            string
	Type          string
	LaunchPadName string
	Range         VMRange
}

type VMRange struct {
	Start string `mapstructure:"start"`
	End   string `mapstructure:"end"`
	Step  string `mapstructure:"step"`
	Time  string `mapstructure:"time"`
}

type QueryResult struct {
	Status    string `json:"status"`
	IsPartial bool   `json:"isPartial"`
	Data      Data   `json:"data"`
	Stats     Stats  `json:"stats"`
}

type Data struct {
	ResultType string   `json:"resultType"`
	Result     []Result `json:"result"`
}

type Result struct {
	Metric map[string]string `json:"metric"`
	Value  []interface{}     `json:"value"`
	Values [][]interface{}   `json:"values"`
}

type Stats struct {
	SeriesFetched     string `json:"seriesFetched"`
	ExecutionTimeMsec int    `json:"executionTimeMsec"`
}

var (
	ErrNoVMHost        = errors.New("unable to get the victoria-metrics host")
	ErrUncompleteParam = errors.New("at least provide both namespace and query")
	ErrEmptyKubeconfig = errors.New("empty kubeconfig")
	ErrNilNs           = errors.New("namespace not found")
)

var (
	LaunchpadMonitor = map[string]string{
		"cpu":    "sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{container=\"$pod\", namespace=\"$namespace\"}) by (pod) / sum(cluster:namespace:pod_cpu:active:kube_pod_container_resource_limits{container=\"$pod\", namespace=\"$namespace\"}) by (pod)",
		"memory": "sum(container_memory_working_set_bytes{job=\"kubelet\", metrics_path=\"/metrics/cadvisor\", container=\"$pod\", namespace=\"$namespace\",image!=\"\"}) by (pod) / sum(cluster:namespace:pod_memory:active:kube_pod_container_resource_limits{container=\"$pod\", namespace=\"$namespace\"}) by (pod)",
	}
)
