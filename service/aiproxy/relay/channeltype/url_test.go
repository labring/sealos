package channeltype

import (
	"testing"

	. "github.com/smartystreets/goconvey/convey"
)

func TestChannelBaseURLs(t *testing.T) {
	Convey("channel base urls", t, func() {
		So(len(ChannelBaseURLs), ShouldEqual, Dummy)
	})
}
