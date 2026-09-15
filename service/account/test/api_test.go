package test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"testing"
	"time"

	"github.com/labring/sealos/service/account/helper"
)

func Test_Auth(t *testing.T) {
	if os.Getenv("RUN_ACCOUNT_EXTERNAL_TESTS") != "true" {
		t.Skip("set RUN_ACCOUNT_EXTERNAL_TESTS=true to run account external tests")
	}
	host := os.Getenv("ACCOUNT_TEST_API_URL")
	kubeConfigPath := os.Getenv("ACCOUNT_TEST_KUBECONFIG")
	if host == "" || kubeConfigPath == "" {
		t.Skip("requires ACCOUNT_TEST_API_URL and ACCOUNT_TEST_KUBECONFIG")
	}
	url := host + helper.GROUP + helper.GetProperties
	// #nosec G703 -- the operator explicitly supplies the test kubeconfig path.
	kubeConfig, err := os.ReadFile(kubeConfigPath)
	if err != nil {
		t.Fatalf("failed to read kubeconfig: %v", err)
	}

	requestBody := map[string]any{
		"startTime":  "2023-01-01T00:00:00Z",
		"endTime":    "2023-12-01T00:00:00Z",
		"owner":      "admin",
		"kubeConfig": string(kubeConfig),
	}

	jsonValue, err := json.Marshal(requestBody)
	if err != nil {
		t.Fatalf("failed to marshal request body: %v", err)
	}

	// #nosec G704 -- the operator explicitly enables and configures this external test.
	request, err := http.NewRequestWithContext(
		context.Background(),
		http.MethodPost,
		url,
		bytes.NewBuffer(jsonValue),
	)
	if err != nil {
		t.Fatalf("failed to create request: %v", err)
	}
	request.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 30 * time.Second}
	// #nosec G704 -- the operator explicitly enables and configures this external test.
	response, err := client.Do(request)
	if err != nil {
		t.Fatalf("failed to post request: %v", err)
	}
	defer response.Body.Close()

	responseBody := new(bytes.Buffer)
	_, err = responseBody.ReadFrom(response.Body)
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}
	fmt.Println("Response:", response.Status)
	fmt.Println("Body:", responseBody.String())
}
