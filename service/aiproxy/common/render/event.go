package render

import (
	"net/http"

	"github.com/labring/sealos/service/aiproxy/common/conv"
)

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

	for _, bytes := range [][]byte{
		dataBytes,
		conv.StringToBytes(r.Data),
		nnBytes,
	} {
		// nosemgrep: go.lang.security.audit.xss.no-direct-write-to-responsewriter.no-direct-write-to-responsewriter
		if _, err := w.Write(bytes); err != nil {
			return err
		}
	}
	return nil
}

func (r OpenAISSE) WriteContentType(w http.ResponseWriter) {
	header := w.Header()
	header["Content-Type"] = contentType

	if _, exist := header["Cache-Control"]; !exist {
		header["Cache-Control"] = noCache
	}
}
