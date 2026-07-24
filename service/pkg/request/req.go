package request

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"

	"github.com/labring/sealos/service/pkg/api"
)

var namespaceMatcherPattern = regexp.MustCompile(`(^|,)\s*namespace\s*(=~|!~|=|!=)`)

func Request(addr string, params *bytes.Buffer) ([]byte, error) {
	//nolint:gosec // Prometheus host is configured by deployment and targets an internal endpoint.
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
	result = addNamespaceMatcher(result, query.NS)
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

func addNamespaceMatcher(query, namespace string) string {
	matcher := "namespace=~\"" + namespace + "\""
	var result strings.Builder
	for {
		open := strings.Index(query, "{")
		if open == -1 {
			result.WriteString(query)
			return result.String()
		}

		closeIdx := strings.Index(query[open:], "}")
		if closeIdx == -1 {
			result.WriteString(query)
			return result.String()
		}
		closeIdx += open

		selector := query[open+1 : closeIdx]
		result.WriteString(query[:open+1])
		switch {
		case namespaceMatcherPattern.MatchString(selector):
			result.WriteString(selector)
		case strings.TrimSpace(selector) == "":
			result.WriteString(matcher)
		default:
			result.WriteString(matcher)
			result.WriteString(",")
			result.WriteString(selector)
		}
		result.WriteString("}")
		query = query[closeIdx+1:]
	}
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
	case "milvus":
		result = api.Milvus[query.Query]
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
	fmt.Println("query result", result)
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
