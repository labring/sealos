package main

import (
	"context"
	"errors"
	"net"
	"net/http"
	"sync/atomic"
	"time"
)

const (
	probeHealthPath  = "/healthz"
	probeStartupPath = "/startupz"
	probeReadyPath   = "/readyz"
)

type probeState struct {
	startup atomic.Bool
	ready   atomic.Bool
}

func (s *probeState) markStartupReady() {
	s.startup.Store(true)
}

func (s *probeState) markReady() {
	s.ready.Store(true)
}

func newProbeHandler(state *probeState) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc(probeHealthPath, func(w http.ResponseWriter, _ *http.Request) {
		writeProbeResponse(w, true)
	})
	mux.HandleFunc(probeStartupPath, func(w http.ResponseWriter, _ *http.Request) {
		writeProbeResponse(w, state.startup.Load())
	})
	mux.HandleFunc(probeReadyPath, func(w http.ResponseWriter, _ *http.Request) {
		writeProbeResponse(w, state.ready.Load())
	})
	return mux
}

func writeProbeResponse(w http.ResponseWriter, ready bool) {
	if !ready {
		http.Error(w, http.StatusText(http.StatusServiceUnavailable), http.StatusServiceUnavailable)
		return
	}

	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok\n"))
}

func startProbeServer(ctx context.Context, addr string, state *probeState) error {
	if addr == "" || addr == "0" {
		return nil
	}

	listener, err := (&net.ListenConfig{}).Listen(ctx, "tcp", addr)
	if err != nil {
		return err
	}

	server := &http.Server{
		Handler:           newProbeHandler(state),
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			setupLog.Error(err, "unable to shut down probe server")
		}
	}()

	go func() {
		if err := server.Serve(listener); err != nil && !errors.Is(err, http.ErrServerClosed) {
			setupLog.Error(err, "probe server stopped unexpectedly")
		}
	}()

	return nil
}
