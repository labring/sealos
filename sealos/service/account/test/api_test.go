package test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"testing"

	"github.com/labring/sealos/service/account/helper"
)

func Test_Auth(t *testing.T) {
	host := "http://localhost:2333"
	url := host + helper.GROUP + helper.GetProperties
	kubeConfig, err := os.ReadFile("./kubeconfig")
	if err != nil {
		t.Errorf("failed to read kubeconfig: %v", err)
	}

	requestBody := map[string]interface{}{
		"startTime":  "2023-01-01T00:00:00Z",
		"endTime":    "2023-12-01T00:00:00Z",
		"owner":      "admin",
		"kubeConfig": string(kubeConfig),
	}

	jsonValue, err := json.Marshal(requestBody)
	if err != nil {
		t.Errorf("failed to marshal request body: %v", err)
	}

	response, err := http.Post(url, "application/json", bytes.NewBuffer(jsonValue))
	if err != nil {
		t.Errorf("failed to post request: %v", err)
	}
	defer response.Body.Close()

	responseBody := new(bytes.Buffer)
	_, err = responseBody.ReadFrom(response.Body)
	if err != nil {
		t.Errorf("failed to read response body: %v", err)
	}
	fmt.Println("Response:", response.Status)
	fmt.Println("Body:", responseBody.String())
}
