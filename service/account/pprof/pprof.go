package pprof

import (
	"net"
	"net/http"
	//nolint:gosec
	_ "net/http/pprof"
	"strconv"
	"time"
)

var pprofMux *http.ServeMux

func init() {
	pprofMux = http.DefaultServeMux
	http.DefaultServeMux = http.NewServeMux()
}

func RunPprofServer(port int) error {
	server := http.Server{
		Addr:              net.JoinHostPort("127.0.0.1", strconv.Itoa(port)),
		Handler:           pprofMux,
		ReadHeaderTimeout: time.Second * 5,
	}

	return server.ListenAndServe()
}
