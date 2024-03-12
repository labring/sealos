package request

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/labring/sealos/service/launchpad/api"
)

func Request(addr string, params *bytes.Buffer) ([]byte, error) {
	resp, err := http.Post(addr, "application/x-www-form-urlencoded", params)

	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Printf("%v\n", resp)
		return nil, fmt.Errorf("victoria metrics server: %s", resp.Status)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	return body, nil
}

func GetQuery(query *api.VMRequest) (string, error) {
	var result string
	switch query.Type {
	case "cpu":
		result = api.LaunchpadMonitor[query.Type]
	case "memory":
		result = api.LaunchpadMonitor[query.Type]
	default:
		log.Println(query.Type)
	}
	result = strings.ReplaceAll(strings.ReplaceAll(result, "$namespace", query.NS), "$pod", query.LaunchPadName)
	return result, nil
}

func VMNew(query *api.VMRequest) ([]byte, error) {

	result, _ := GetQuery(query)

	formData := url.Values{}
	formData.Set("query", result)
	if query.Range.Start != "" {
		formData.Set("start", query.Range.Start)
		formData.Set("end", query.Range.End)
		formData.Set("step", query.Range.Step)
	} else if query.Range.Time != "" {
		formData.Set("time", query.Range.Time)
	}
	bf := bytes.NewBufferString(formData.Encode())

	vmHost := GetVMServerFromEnv()

	if vmHost == "" {
		return nil, api.ErrNoVMHost
	}

	if len(formData.Get("start")) == 0 {
		return Request(vmHost+"/api/v1/query", bf)
	}
	return Request(vmHost+"/api/v1/query_range", bf)
}

func GetVMServerFromEnv() string {
	return os.Getenv("VM_SERVICE_HOST")
}
