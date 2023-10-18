package errors

import (
	"fmt"
)

var LicenseInvalidError = fmt.Errorf("the license provided appears to be invalid")
var ClaimsConventError = fmt.Errorf("the claims data provided appears to be invalid")
