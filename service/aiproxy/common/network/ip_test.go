package network

import (
	"testing"

	"github.com/smartystreets/goconvey/convey"
)

func TestIsIpInSubnet(t *testing.T) {
	ip1 := "192.168.0.5"
	ip2 := "125.216.250.89"
	subnet := "192.168.0.0/24"
	convey.Convey("TestIsIpInSubnet", t, func() {
		if ok, err := isIPInSubnet(ip1, subnet); err != nil {
			t.Errorf("failed to check ip in subnet: %s", err)
		} else {
			convey.So(ok, convey.ShouldBeTrue)
		}
		if ok, err := isIPInSubnet(ip2, subnet); err != nil {
			t.Errorf("failed to check ip in subnet: %s", err)
		} else {
			convey.So(ok, convey.ShouldBeFalse)
		}
	})
}
