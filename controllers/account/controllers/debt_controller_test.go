package controllers

import (
	"testing"
)

func Test_splitSmsCodeMap(t *testing.T) {
	codeMap, err := splitSmsCodeMap("0:SMS_123456,1:SMS_654321,2:SMS_987654")
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("codeMap: %v", codeMap)
	if len(codeMap) != 3 {
		t.Fatal("invalid codeMap")
	}
	if codeMap[0] != "SMS_123456" {
		t.Fatal("invalid codeMap")
	}
	if codeMap[1] != "SMS_654321" {
		t.Fatal("invalid codeMap")
	}
	if codeMap[2] != "SMS_987654" {
		t.Fatal("invalid codeMap")
	}
}
