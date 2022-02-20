// Copyright 2020 Huawei Technologies Co.,Ltd.
//
// Licensed to the Apache Software Foundation (ASF) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The ASF licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

package def

import (
	"fmt"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"
	"io"
	"mime/multipart"
	"net/textproto"
	"os"
	"strings"
)

var quoteEscape = strings.NewReplacer("\\", "\\\\", `"`, "\\\"")

func escapeQuotes(s string) string {
	return quoteEscape.Replace(s)
}

type FilePart struct {
	Headers textproto.MIMEHeader
	Content *os.File
}

func NewFilePart(content *os.File) *FilePart {
	return &FilePart{
		Content: content,
	}
}

func NewFilePartWithContentType(content *os.File, contentType string) *FilePart {
	var headers = make(textproto.MIMEHeader)
	headers.Set("Content-Type", contentType)

	return &FilePart{
		Headers: headers,
		Content: content,
	}
}

func (f FilePart) Write(w *multipart.Writer, name string) error {
	var h textproto.MIMEHeader
	if f.Headers != nil {
		h = f.Headers
	} else {
		h = make(textproto.MIMEHeader)
	}

	h.Set("Content-Disposition",
		fmt.Sprintf(`form-data; name="%s"; filename="%s"`,
			escapeQuotes(name), escapeQuotes(f.Content.Name())))

	if f.Headers.Get("Content-Type") == "" {
		h.Set("Content-Type", "application/octet-stream")
	}

	writer, err := w.CreatePart(h)
	if err != nil {
		return err
	}

	_, err = io.Copy(writer, f.Content)
	return err
}

type MultiPart struct {
	Content interface{}
}

func NewMultiPart(content interface{}) *MultiPart {
	return &MultiPart{
		Content: content,
	}
}

func (m MultiPart) Write(w *multipart.Writer, name string) error {
	err := w.WriteField(name, converter.ConvertInterfaceToString(m.Content))
	return err
}

type FormData interface {
	Write(*multipart.Writer, string) error
}
