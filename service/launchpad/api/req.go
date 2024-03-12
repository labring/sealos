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
	Value  [2]interface{}    `json:"value"`
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
		"cpu":    "sum(container_cpu_usage_seconds_total{job=\"kubelet\", metrics_path=\"/metrics/cadvisor\", namespace=\"ns-hkfnwdfz\",pod=~\"$pod.*\"}) by (pod)",
		"memory": "sum(container_memory_working_set_bytes{job=\"kubelet\", metrics_path=\"/metrics/cadvisor\", namespace=\"ns-hkfnwdfz\",pod=~\"$pod.*\"}) by (pod)",
	}
)
