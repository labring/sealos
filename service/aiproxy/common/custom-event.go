// Copyright 2014 Manu Martinez-Almeida.  All rights reserved.
// Use of this source code is governed by a MIT style
// license that can be found in the LICENSE file.

package common

import (
	"net/http"

	"github.com/labring/sealos/service/aiproxy/common/conv"
)

// Server-Sent Events
// W3C Working Draft 29 October 2009
// http://www.w3.org/TR/2009/WD-eventsource-20091029/

var (
	contentType = []string{"text/event-stream"}
	noCache     = []string{"no-cache"}
)

type OpenAISSE struct {
	Data string
}

const (
	nn   = "\n\n"
	data = "data: "
)

var (
	nnBytes   = conv.StringToBytes(nn)
	dataBytes = conv.StringToBytes(data)
)

func (r OpenAISSE) Render(w http.ResponseWriter) error {
	r.WriteContentType(w)

	w.Write(dataBytes)
	w.Write(conv.StringToBytes(r.Data))
	w.Write(nnBytes)
	return nil
}

func (r OpenAISSE) WriteContentType(w http.ResponseWriter) {
	header := w.Header()
	header["Content-Type"] = contentType

	if _, exist := header["Cache-Control"]; !exist {
		header["Cache-Control"] = noCache
	}
}
