package relay

import (
	"testing"

	"github.com/labring/sealos/service/aiproxy/relay/apitype"
	"github.com/smartystreets/goconvey/convey"
)

func TestGetAdaptor(t *testing.T) {
	convey.Convey("get adaptor", t, func() {
		for i := 0; i < apitype.Dummy; i++ {
			a := GetAdaptor(i)
			convey.So(a, convey.ShouldNotBeNil)
		}
	})
}
