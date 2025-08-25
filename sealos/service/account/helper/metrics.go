package helper

import (
	"os"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	podName   = os.Getenv("POD_NAME")
	namespace = os.Getenv("POD_NAMESPACE")
	domain    = os.Getenv("DOMAIN")

	registry = prometheus.WrapRegistererWith(
		prometheus.Labels{"pod_name": podName, "namespace": namespace, "domain": domain},
		prometheus.DefaultRegisterer,
	)
	// ErrorCounter is a counter for account service errors
	ErrorCounter = promauto.With(registry).NewCounterVec(
		prometheus.CounterOpts{
			Name: "sealos_account_errors_total",
			Help: "account service error counter",
		},
		[]string{"error_type", "function", "user_uid"},
	)
	// CallCounter is a counter for account service calls
	CallCounter = promauto.With(registry).NewCounterVec(
		prometheus.CounterOpts{
			Name: "sealos_account_calls_total",
			Help: "account service call counter",
		},
		[]string{"function", "user_uid"},
	)
)
