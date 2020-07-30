package service

import (
	"github.com/fanux/lvscare/internal/ipvs"
)

//BuildLvscare is
func BuildLvscare() Lvser {
	l := &lvscare{}
	handle := ipvs.New()
	l.handle = handle

	return l
}
