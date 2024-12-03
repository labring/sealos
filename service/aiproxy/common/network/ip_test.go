package network

import (
	"context"
	"testing"

	"github.com/smartystreets/goconvey/convey"
)

func TestIsIpInSubnet(t *testing.T) {
	ctx := context.Background()
	ip1 := "192.168.0.5"
	ip2 := "125.216.250.89"
	subnet := "192.168.0.0/24"
	convey.Convey("TestIsIpInSubnet", t, func() {
		convey.So(isIPInSubnet(ctx, ip1, subnet), convey.ShouldBeTrue)
		convey.So(isIPInSubnet(ctx, ip2, subnet), convey.ShouldBeFalse)
	})
}
