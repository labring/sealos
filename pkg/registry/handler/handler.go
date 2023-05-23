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
	"net"
	"net/http"

	"github.com/distribution/distribution/v3/configuration"
	dcontext "github.com/distribution/distribution/v3/context"
	"github.com/distribution/distribution/v3/registry/handlers"
	log "github.com/sirupsen/logrus"
)

const tpl = `
version: 0.1
storage:
  filesystem:
    rootdirectory: %s
http:
  addr: :%d
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

func NewConfigWithRoot(root string) (*configuration.Configuration, error) {
	port, err := getFreePort()
	if err != nil {
		return nil, err
	}
	s := fmt.Sprintf(tpl, root, port)
	rd := bytes.NewReader([]byte(s))
	return configuration.Parse(rd)
}

func New(ctx context.Context, config *configuration.Configuration) (*http.Server, error) {
	// disable logging output
	logger := log.New()
	logger.SetLevel(log.ErrorLevel)
	logEntry := log.NewEntry(logger)
	ctx = dcontext.WithLogger(ctx, logEntry)
	dcontext.SetDefaultLogger(logEntry)

	app := handlers.NewApp(ctx, config)
	return &http.Server{
		Handler: app,
	}, nil
}
