package auth

import (
	"errors"
)

var (
	ErrNoAuth       = errors.New("no permission for this namespace")
	ErrNoSealosHost = errors.New("unable to get the sealos host")
	ErrNoNamespace  = errors.New("no namespace specified or found in kubeconfig")
)
