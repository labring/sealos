/*
Copyright 2023 fengxsong@outlook.com

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

	http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
package handler

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net"
	"net/http"

	"github.com/distribution/distribution/v3/configuration"
	dcontext "github.com/distribution/distribution/v3/context"
	"github.com/distribution/distribution/v3/registry/handlers"
	"github.com/distribution/distribution/v3/registry/listener"

	// registry filesystem driver
	_ "github.com/distribution/distribution/v3/registry/storage/driver/filesystem"
	log "github.com/sirupsen/logrus"
)

const tpl = `
version: 0.1
storage:
  filesystem:
    rootdirectory: %s
  maintenance:
    uploadpurging:
      enabled: false
http:
  addr: :%d
  secret: asecretforlocaldevelopment
`

func getFreePort() (port int, err error) {
	var a *net.TCPAddr
	if a, err = net.ResolveTCPAddr("tcp", "localhost:0"); err == nil {
		var l *net.TCPListener
		if l, err = net.ListenTCP("tcp", a); err == nil {
			defer l.Close()
			return l.Addr().(*net.TCPAddr).Port, nil
		}
	}
	return
}

func NewConfig(root string, port int) (*configuration.Configuration, error) {
	if port <= 0 {
		var err error
		port, err = getFreePort()
		if err != nil {
			return nil, err
		}
	}

	s := fmt.Sprintf(tpl, root, port)
	rd := bytes.NewReader([]byte(s))
	return configuration.Parse(rd)
}

func configureLogging(ctx context.Context, config *configuration.Configuration) context.Context {
	// disable logging output or increase logging level
	logger := log.New()
	if config.Log.AccessLog.Disabled {
		logger.Out = io.Discard
	}
	var logLevel log.Level
	lvl, err := log.ParseLevel(string(config.Log.Level))
	if err != nil {
		logLevel = log.ErrorLevel
	} else {
		logLevel = lvl
	}
	logger.SetLevel(logLevel)
	logEntry := log.NewEntry(logger)
	ctx = dcontext.WithLogger(ctx, logEntry)
	dcontext.SetDefaultLogger(logEntry)
	return ctx
}

func New(ctx context.Context, config *configuration.Configuration) (*http.Server, error) {
	ctx = configureLogging(ctx, config)
	return &http.Server{
		Handler: handlers.NewApp(ctx, config),
	}, nil
}

func Run(ctx context.Context, config *configuration.Configuration) chan error {
	errCh := make(chan error, 1)
	srv, err := New(ctx, config)
	if err != nil {
		errCh <- err
		return errCh
	}
	ln, err := listener.NewListener(config.HTTP.Net, config.HTTP.Addr)
	if err != nil {
		errCh <- err
		return errCh
	}
	go func() {
		errCh <- srv.Serve(ln)
	}()
	go func() {
		// once receive nil or error then server will shutdown
		<-errCh
		_ = srv.Shutdown(ctx)
	}()
	return errCh
}
