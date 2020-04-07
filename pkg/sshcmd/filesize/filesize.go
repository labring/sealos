package filesize

import (
	"crypto/tls"
	"github.com/wonderivan/logger"
	"net/http"
)

//Do is fetch file size
func Do(url string) int64 {
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}

	client := &http.Client{Transport: tr}
	resp, err := client.Get(url)
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[globals] get file size is error： %s", r)
		}
	}()
	if err != nil {
		panic(err)
	}
	resp.Body.Close()
	return resp.ContentLength
}
