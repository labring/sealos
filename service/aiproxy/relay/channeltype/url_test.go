package channeltype

import (
	"testing"

	"github.com/smartystreets/goconvey/convey"
)

func TestChannelBaseURLs(t *testing.T) {
	convey.Convey("channel base urls", t, func() {
		convey.So(len(ChannelBaseURLs), convey.ShouldEqual, Dummy)
	})
}
