package errors

import (
	"fmt"
)

var ErrLicenseInvalid = fmt.Errorf("the license provided appears to be invalid")
var ErrClaimsConvent = fmt.Errorf("the claims data provided appears to be invalid")
var ErrClusterIdNotMatch = fmt.Errorf("the cluster id provided appears to be invalid")
