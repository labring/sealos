package crypto

import (
	"fmt"
	"testing"
	"time"

	v1 "github.com/labring/sealos/controllers/monitor/api/v1"
)

const Token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJTZWFsb3MiLCJpYXQiOjE2ODkxNDYyOTAsImFtdCI6NTAwMCwibm9kIjoxLCJ0dGUiOjMwfQ.lj1IYb_6vvWfYiLhm3DRpjAu4E3SsjWR9TA09ynB09HXx5Qa3FNXSE-kmpccjhn-lZd0miDwAEVxLDLNhFCGnrqMsSCAlwIK_ymoCSlNFntYAIMRU-uF6eu6JMc44Ol6eR2MlOdklYsfj0lxEwEG55uTIZGfMcHjJapGr4J0ONsloMYGn-eqEjLv3gXzNc5IsNWkRzDyLnK1IbuQo7pXo3yGcR7TQZn5cvOm03xU-jvCaYrl-MDhTbRnJ2XPTqgrtQxgspjApk6gvWKIfZTLY78e4QHFMiv36cdHXLvvvXO5eC8ImVenrjbNeHofP9_OsqbrVaiydc9aj3tHWbqYSQ"
const Key = "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUFvbFBTSzB0UjFKeDZtb25lL2ppeApSWGN6UGlxcU5SSXRmdW1mdWNyNGMxc2dqdlJha0NwcWtDU21lMTR1akJkU0x6QlZzRjkvUWl0UnFNb2NvaEN1CkJ6R25EQ29hWnZXbWVHeE96NEZSejVTeUg1QTlDa3dnbUEzYnFnMWxKSEZTMlZyVjVHVFhFWnphZTZtRmhHOVcKenJMTnpZMlptYTMzOVE1WTNJSDZ6RXIrcTRQbTZDOXBHVGpsSnVodlRvb0dSY2w0bmpZRXc2eHB6ZHZrdi9uSApmZmxsWGZVNDNyRGdQaGkwZDRjWnNuTUJlazUxQkNiRFRuSHlNVFdGT1RoTjc1VVM0bzJxRm9JSEhsM0N0RzE4ClZIZEdRSE1IR0dYcGN3bVhhck1EQndwVWFOSk9kMkhjTTB5dlZEY2xDZzRITkIwVUFWeFNweFlRV3BwNWJzN2gKbHdJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg=="

func TestIsLicenseValid(t *testing.T) {
	fakePublicKey := Key
	fakeLicense := v1.License{
		Spec: v1.LicenseSpec{
			Key:   fakePublicKey,
			Token: Token,
		},
	}
	fmt.Println(time.Now().Unix())
	claims, valid := IsLicenseValid(fakeLicense)

	if valid {
		t.Logf("解码后的内容: %v\n", claims)
	} else {
		t.Error("无法解码内容")
	}
}
