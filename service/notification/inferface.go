package notification

import "github.com/labring/sealos/service/notification/types"

type ChannelType string

type Interface interface {
	SendMessage(message *types.Message, user *types.User, opts *types.Options) error
}
