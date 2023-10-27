package errors

import "fmt"

var ErrAdminExists = fmt.Errorf("admin user already exists")
