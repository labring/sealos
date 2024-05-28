package utils

import (
	"os"
	"testing"
	"time"

	"github.com/volcengine/volc-sdk-golang/service/vms"
)

func TestSendVms(t *testing.T) {
	vms.DefaultInstance.Client.SetAccessKey(os.Getenv("VMS_AK"))
	vms.DefaultInstance.Client.SetSecretKey(os.Getenv("VMS_SK"))
	var testData = struct {
		phone        string
		template     string
		numberPollNo string
		sendTime     time.Time
	}{
		phone:        "",
		template:     "",
		numberPollNo: "",
		sendTime:     time.Now(),
	}
	err := SendVms(testData.phone, testData.template, testData.numberPollNo, testData.sendTime, []string{"10:00-20:00"})
	if err != nil {
		t.Fatal(err)
	}
	t.Log("SendVms success")
}
