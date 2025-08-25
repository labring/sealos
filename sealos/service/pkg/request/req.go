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

	"github.com/labring/sealos/service/pkg/api"
)

func Request(addr string, params *bytes.Buffer) ([]byte, error) {
	resp, err := http.Post(addr, "application/x-www-form-urlencoded", params)

	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Printf("%v\n", resp)
		return nil, fmt.Errorf("prometheus server: %s", resp.Status)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	return body, nil
}

func PrometheusPre(query *api.PromRequest) ([]byte, error) {
	result := strings.ReplaceAll(query.Query, "$", "namespace=~\""+query.NS+"\"")
	result = strings.ReplaceAll(result, "{", "{namespace=~\""+query.NS+"\",")
	log.Println(result)

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

	prometheusHost := GetPromServerFromEnv()

	if prometheusHost == "" {
		return nil, api.ErrNoPromHost
	}

	log.Println(bf)

	if len(formData.Get("start")) == 0 {
		return Request(prometheusHost+"/api/v1/query", bf)
	}
	return Request(prometheusHost+"/api/v1/query_range", bf)
}

func GetQuery(query *api.PromRequest) (string, error) {
	var result string
	switch query.Type {
	case "apecloud-mysql":
		result = api.Mysql[query.Query]
	case "redis":
		result = api.Redis[query.Query]
	case "mongodb":
		result = api.Mongo[query.Query]
	case "postgresql":
		result = api.Pgsql[query.Query]
	case "minio":
		result = api.Minio[query.Query]
	case "kafka":
		result = api.Kafka[query.Query]
	default:
		fmt.Println(query.Type)
	}

	fmt.Println(query.Cluster)
	if query.Type == "minio" {
		instance := os.Getenv("OBJECT_STORAGE_INSTANCE")
		result = strings.ReplaceAll(result, "#", instance)
	}
	result = strings.ReplaceAll(result, "#", query.NS)
	result = strings.ReplaceAll(result, "@", query.Cluster)
	return result, nil
}

func PrometheusNew(query *api.PromRequest) ([]byte, error) {
	result, _ := GetQuery(query)
	log.Println(result)

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

	prometheusHost := GetPromServerFromEnv()

	if prometheusHost == "" {
		return nil, api.ErrNoPromHost
	}

	log.Println(bf)

	if len(formData.Get("start")) == 0 {
		return Request(prometheusHost+"/api/v1/query", bf)
	}
	return Request(prometheusHost+"/api/v1/query_range", bf)
}

func GetPromServerFromEnv() string {
	return os.Getenv("PROMETHEUS_SERVICE_HOST")
}
