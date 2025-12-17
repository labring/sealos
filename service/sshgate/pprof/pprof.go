package pprof

import (
	"fmt"
	"net"
	"net/http"
	//nolint:gosec
	_ "net/http/pprof"
	"time"

	"github.com/sirupsen/logrus"
)

var pprofMux *http.ServeMux

func init() {
	pprofMux = http.DefaultServeMux
	http.DefaultServeMux = http.NewServeMux()
}

// RunPprofServer starts the pprof server on 127.0.0.1:port
func RunPprofServer(port int) error {
	addr := fmt.Sprintf("127.0.0.1:%d", port)
	server := http.Server{
		Addr:              addr,
		Handler:           pprofMux,
		ReadHeaderTimeout: time.Second * 5,
	}

	//nolint:noctx
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return err
	}

	logrus.WithField("component", "pprof").Infof("pprof listening on %s", ln.Addr())

	return server.Serve(ln)
}
