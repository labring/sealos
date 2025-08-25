package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"testing"

	"github.com/labring/sealos/service/pay/helper"
)

func TestCreatePayMethod_Wechat(t *testing.T) {
	data := map[string]interface{}{
		"appID":         helper.TestAppID,
		"sign":          helper.TestSign,
		"payMethod":     "wechat",
		"currency":      "CNY",
		"amountOptions": []string{"158", "368", "962", "1018", "2822"},
		"exchangeRate":  1,
		"taxRate":       0.12,
	}
	createPayTest(t, data, http.MethodPut, helper.CreatePayMethod)
}

func TestCreatePayMethod_Stripe(t *testing.T) {
	data := map[string]interface{}{
		"appID":         helper.TestAppID,
		"sign":          helper.TestSign,
		"payMethod":     "stripe",
		"currency":      "USD",
		"amountOptions": []string{"258", "568", "862", "1218", "1822"},
		"exchangeRate":  2,
		"taxRate":       0.2,
	}
	createPayTest(t, data, http.MethodPut, helper.CreatePayMethod)
}

func TestCreatePayApp(t *testing.T) {
	data := map[string]interface{}{
		"payAppName": "laf.io",
		"appID":      helper.TestAppID,
		"sign":       helper.TestSign,
	}
	createPayTest(t, data, http.MethodPut, helper.CreatePayApp)
}

func TestAuthentication(t *testing.T) {
	data := map[string]interface{}{
		"payAppName": "laf.io",
		"appID":      helper.TestAppID + 123,
		"sign":       helper.TestSign + "123",
	}
	createPayTest(t, data, http.MethodPut, helper.CreatePayApp)
}

func TestGetAppDetails(t *testing.T) {
	data := map[string]interface{}{
		"appID": helper.TestAppID,
		"sign":  helper.TestSign,
	}
	createPayTest(t, data, http.MethodGet, helper.GetAppDetails)
}

func TestGetSession_Wechat(t *testing.T) {
	data := map[string]interface{}{
		"appID":     helper.TestAppID,
		"sign":      helper.TestSign,
		"amount":    "1288",
		"currency":  "CNY",
		"user":      helper.TestUser,
		"payMethod": "wechat",
	}
	createPayTest(t, data, http.MethodGet, helper.GetSession)
}

func TestGetSession_Stripe(t *testing.T) {
	data := map[string]interface{}{
		"appID":     helper.TestAppID,
		"sign":      helper.TestSign,
		"amount":    "1288",
		"currency":  "USD",
		"user":      helper.TestUser,
		"payMethod": "stripe",
	}
	createPayTest(t, data, http.MethodGet, helper.GetSession)
}

func TestGetPayStatus(t *testing.T) {
	data := map[string]interface{}{
		"appID":     helper.TestAppID,
		"sign":      helper.TestSign,
		"orderID":   helper.TestOrderID,
		"payMethod": helper.Stripe,
		"user":      helper.TestUser,
		"sessionID": helper.TestSessionID,
		//"TradeNO": 	 helper.TestTradeNO,
	}
	createPayTest(t, data, http.MethodGet, helper.GetPayStatus)
}

func TestGetPayStatus_seesionIDLXD(t *testing.T) {
	data := map[string]interface{}{
		"appID":     helper.TestAppID,
		"sign":      helper.TestSign,
		"orderID":   helper.TestOrderID,
		"payMethod": helper.Stripe,
		"user":      helper.TestUser,
		"sessionID": helper.TestSessionID + "abc",
		// "TradeNO": "db27af04c65bd27bb3c3708addbafc01",
	}
	createPayTest(t, data, http.MethodGet, helper.GetPayStatus)
	//The response should be: {"error":"order does not exist: sessionID mismatch"}
}

func TestGetPayStatus_orderIDLXD(t *testing.T) {
	data := map[string]interface{}{
		"appID":     helper.TestAppID,
		"sign":      helper.TestSign,
		"orderID":   helper.TestOrderID + "abc",
		"payMethod": helper.Stripe,
		"user":      helper.TestUser,
		"sessionID": helper.TestSessionID,
		// "TradeNO": "db27af04c65bd27bb3c3708addbafc01",
	}
	createPayTest(t, data, http.MethodGet, helper.GetPayStatus)
	//The response should be: {"error":"order does not exist: order not found"}
}

func TestGetPayStatus_payMethodLXD(t *testing.T) {
	data := map[string]interface{}{
		"appID":     helper.TestAppID,
		"sign":      helper.TestSign,
		"orderID":   helper.TestOrderID,
		"payMethod": helper.Wechat,
		"user":      helper.TestUser,
		"sessionID": helper.TestSessionID,
		// "TradeNO": "db27af04c65bd27bb3c3708addbafc01",
	}
	createPayTest(t, data, http.MethodGet, helper.GetPayStatus)
}

func TestGetPayStatus_userLXD(t *testing.T) {
	data := map[string]interface{}{
		"appID":     helper.TestAppID,
		"sign":      helper.TestSign,
		"orderID":   helper.TestOrderID,
		"payMethod": helper.Wechat,
		"user":      helper.TestUser + "123",
		"sessionID": helper.TestSessionID,
		// "TradeNO": "db27af04c65bd27bb3c3708addbafc01",
	}
	createPayTest(t, data, http.MethodGet, helper.GetPayStatus)
}

func TestGetBill(t *testing.T) {
	data := map[string]interface{}{
		"appID": helper.TestAppID,
		"sign":  helper.TestSign,
		"user":  helper.TestUser,
	}
	createPayTest(t, data, http.MethodGet, helper.GetBill)
}

func createPayTest(t *testing.T, data map[string]interface{}, httpMethod string, url string) {
	// Create request body data
	jsonData, err := json.Marshal(data)
	if err != nil {
		t.Fatal(err)
	}

	// Create mock request and response objects
	req, err := http.NewRequest(httpMethod, helper.LOCALHOST+helper.GROUP+url, bytes.NewBuffer(jsonData))
	if err != nil {
		t.Fatal(err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}

	// Read response body
	responseBody, err := io.ReadAll(resp.Body)
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
