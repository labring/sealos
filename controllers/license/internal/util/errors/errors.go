package errors

import (
	"fmt"
)

var LicenseInvalidError = fmt.Errorf("the license provided appears to be invalid. Please verify and try again")
