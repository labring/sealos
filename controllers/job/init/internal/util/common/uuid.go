package common

import "github.com/google/uuid"

var adminUID string

func AdminUID() string {
	if adminUID == "" {
		adminUID = uuid.New().String()
	}
	return adminUID
}
