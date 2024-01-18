package v1

import (
	"fmt"
	"strings"
)

type DomainList []string

func (s *DomainList) String() string {
	return fmt.Sprintf("%v", *s)
}

func (s *DomainList) Set(value string) error {
	*s = strings.Split(value, ",")
	return nil
}
