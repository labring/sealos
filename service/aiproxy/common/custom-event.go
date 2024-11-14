// Copyright 2014 Manu Martinez-Almeida.  All rights reserved.
// Use of this source code is governed by a MIT style
// license that can be found in the LICENSE file.

package common

import (
	"io"
	"net/http"
	"strings"

	"github.com/labring/sealos/service/aiproxy/common/conv"
)

// Server-Sent Events
// W3C Working Draft 29 October 2009
// http://www.w3.org/TR/2009/WD-eventsource-20091029/

var (
	contentType = []string{"text/event-stream"}
	noCache     = []string{"no-cache"}
)

var dataReplacer = strings.NewReplacer(
	"\n", "\ndata:",
	"\r", "\\r")

type CustomEvent struct {
	Data  string
	Event string
	ID    string
	Retry uint
}

func encode(writer io.Writer, event CustomEvent) error {
	return writeData(writer, event.Data)
}

const nn = "\n\n"

var nnBytes = conv.StringToBytes(nn)

func writeData(w io.Writer, data string) error {
	_, err := dataReplacer.WriteString(w, data)
	if err != nil {
		return err
	}
	if strings.HasPrefix(data, "data") {
		_, err := w.Write(nnBytes)
		return err
	}
	return nil
}

func (r CustomEvent) Render(w http.ResponseWriter) error {
	r.WriteContentType(w)
	return encode(w, r)
}

func (r CustomEvent) WriteContentType(w http.ResponseWriter) {
	header := w.Header()
	header["Content-Type"] = contentType

	if _, exist := header["Cache-Control"]; !exist {
		header["Cache-Control"] = noCache
	}
}
