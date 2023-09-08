package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"testing"

	"github.com/labring/sealos/service/pay/conf"
)

func TestCreatePayMethod(t *testing.T) {
	data := map[string]interface{}{
		"appID":         52551563049295029,
		"sign":          "5cd59fac27c881",
		"payMethod":     "wechat",
		"currency":      "CNY",
		"amountOptions": []string{"158", "368", "962", "1018", "2822"},
		"exchangeRate":  1,
		"taxRate":       0.12,
	}
	createPayTest(t, data, http.MethodPut, conf.CreatePayMethod)
}

func TestCreatePayApp(t *testing.T) {
	data := map[string]interface{}{
		"payAppName": "laf.io",
		"appID":      52551563049295029,
		"sign":       "5cd59fac27c881",
	}
	createPayTest(t, data, http.MethodPut, conf.CreatePayApp)
}

func TestGetAppDetails(t *testing.T) {
	data := map[string]interface{}{
		"appID": 52551563049295029,
		"sign":  "5cd59fac27c881",
	}
	createPayTest(t, data, http.MethodGet, conf.GetAppDetails)
}

func TestGetSession_Wechat(t *testing.T) {
	data := map[string]interface{}{
		"appID":     52551563049295029,
		"sign":      "5cd59fac27c881",
		"amount":    "1288",
		"currency":  "CNY",
		"user":      "xy",
		"payMethod": "wechat",
	}
	createPayTest(t, data, http.MethodGet, conf.GetSession)
}

func TestGetSession_Stripe(t *testing.T) {
	data := map[string]interface{}{
		"appID":     52551563049295029,
		"sign":      "5cd59fac27c881",
		"amount":    "1288",
		"currency":  "USD",
		"user":      "xy",
		"payMethod": "stripe",
	}
	createPayTest(t, data, http.MethodGet, conf.GetSession)
}

func TestGetPayStatus(t *testing.T) {
	data := map[string]interface{}{
		"appID":     52551563049295029,
		"sign":      "5cd59fac27c881",
		"orderID":   "I7KJiu6yi0rj8J-ejh",
		"payMethod": "stripe",
		"sessionID": "cs_test_a1w8mZ7SVdWRQ6q0cg5wAhZL8bMMaOt0vDDGdvgCeZ2BxS5MoOPT7uFw8I",
		// "TradeNO": "db27af04c65bd27bb3c3708addbafc01",
	}
	createPayTest(t, data, http.MethodGet, conf.GetPayStatus)
}

func TestGetPayStatus_seesionIDLXD(t *testing.T) {
	data := map[string]interface{}{
		"appID":     52551563049295029,
		"sign":      "5cd59fac27c881",
		"orderID":   "I7KJiu6yi0rj8J-ejh",
		"payMethod": "stripe",
		"sessionID": "cs_test_a1w8mZ7SVdWRQfdsfassaMaOt0vDDGdvgCeZ2BxS5MoOPT7uFw8I",
		// "TradeNO": "db27af04c65bd27bb3c3708addbafc01",
	}
	createPayTest(t, data, http.MethodGet, conf.GetPayStatus)
	//The response should be: {"error":"order does not exist: sessionID mismatch"}
}

func TestGetPayStatus_orderIDLXD(t *testing.T) {
	data := map[string]interface{}{
		"appID":     52551563049295029,
		"sign":      "5cd59fac27c881",
		"orderID":   "I7KJdsdsdsrj8J-ejh",
		"payMethod": "stripe",
		"sessionID": "cs_test_a1w8mZ7SVdWRQ6q0cg5wAhZL8bMMaOt0vDDGdvgCeZ2BxS5MoOPT7uFw8I",
		// "TradeNO": "db27af04c65bd27bb3c3708addbafc01",
	}
	createPayTest(t, data, http.MethodGet, conf.GetPayStatus)
	//The response should be: {"error":"order does not exist: order not found"}
}

func TestGetPayStatus_payMethodLXD(t *testing.T) {
	data := map[string]interface{}{
		"appID":     52551563049295029,
		"sign":      "5cd59fac27c881",
		"orderID":   "I7KJiu6yi0rj8J-ejh",
		"payMethod": "wechat",
		"sessionID": "cs_test_a1w8mZ7SVdWRQ6q0cg5wAhZL8bMMaOt0vDDGdvgCeZ2BxS5MoOPT7uFw8I",
		// "TradeNO": "db27af04c65bd27bb3c3708addbafc01",
	}
	createPayTest(t, data, http.MethodGet, conf.GetPayStatus)
}

func TestGetBill(t *testing.T) {
	data := map[string]interface{}{
		"appID": 52551563049295029,
		"sign":  "5cd59fac27c881",
		"user":  "xy",
	}
	createPayTest(t, data, http.MethodGet, conf.GetBill)
}

func createPayTest(t *testing.T, data map[string]interface{}, httpMethod string, url string) {
	// Create request body data
	jsonData, err := json.Marshal(data)
	if err != nil {
		t.Fatal(err)
	}

	// Create mock request and response objects
	req, err := http.NewRequest(httpMethod, conf.LOCALHOST+conf.GROUP+url, bytes.NewBuffer(jsonData))
	if err != nil {
		t.Fatal(err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}

	// Read response body
	responseBody, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		t.Fatal(err)
	}

	// Print response body
	fmt.Println(string(responseBody))

	// Check response status code
	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status code 200, but got %d", resp.StatusCode)
	}

	// Close response body
	defer resp.Body.Close()
}
