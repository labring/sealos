package request

import "testing"

func TestAddNamespaceMatcher(t *testing.T) {
	tests := []struct {
		name      string
		query     string
		namespace string
		want      string
	}{
		{
			name:      "keeps existing namespace matcher",
			query:     `sum(max_over_time(mysql_global_status_threads_connected{namespace=~"ns-m0mugwwk", workloads_kubeblocks_io_instance="test-mysql-mysql"}[1m]))`,
			namespace: "ns-m0mugwwk",
			want:      `sum(max_over_time(mysql_global_status_threads_connected{namespace=~"ns-m0mugwwk", workloads_kubeblocks_io_instance="test-mysql-mysql"}[1m]))`,
		},
		{
			name:      "adds namespace matcher",
			query:     `sum(rate(container_cpu_usage_seconds_total{pod=~"app-.*"}[1m]))`,
			namespace: "ns-m0mugwwk",
			want:      `sum(rate(container_cpu_usage_seconds_total{namespace=~"ns-m0mugwwk",pod=~"app-.*"}[1m]))`,
		},
		{
			name:      "does not treat podnamespace as namespace matcher",
			query:     `Device_utilization_desc_of_container{podnamespace=~"ns-m0mugwwk",podname=~"app-.*"}`,
			namespace: "ns-m0mugwwk",
			want:      `Device_utilization_desc_of_container{namespace=~"ns-m0mugwwk",podnamespace=~"ns-m0mugwwk",podname=~"app-.*"}`,
		},
		{
			name:      "supports empty selector",
			query:     `up{}`,
			namespace: "ns-m0mugwwk",
			want:      `up{namespace=~"ns-m0mugwwk"}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := addNamespaceMatcher(tt.query, tt.namespace)
			if got != tt.want {
				t.Fatalf("addNamespaceMatcher() = %q, want %q", got, tt.want)
			}
		})
	}
}
