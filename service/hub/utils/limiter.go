package utils

import (
	"sync"
	"time"

	"golang.org/x/time/rate"
)

type Limiter struct {
	mu sync.Mutex

	// resetInterval is the interval to reset the limiter
	resetInterval time.Duration
	ipBurst       int
	ipLimiters    map[string]*rate.Limiter
	userBurst     int
	userLimiters  map[string]*rate.Limiter
}

func NewLimiter(ipBurst int, userBurst int, resetInterval time.Duration) *Limiter {
	ul := &Limiter{
		ipBurst:       ipBurst,
		userBurst:     userBurst,
		resetInterval: resetInterval,
		ipLimiters:    make(map[string]*rate.Limiter),
		userLimiters:  make(map[string]*rate.Limiter),
	}
	// start a go routine to reset reqLimiter
	go func() {
		ticker := time.NewTicker(ul.resetInterval)
		defer ticker.Stop()
		for range ticker.C {
			ul.mu.Lock()
			ul.ipLimiters = make(map[string]*rate.Limiter)
			ul.userLimiters = make(map[string]*rate.Limiter)
			ul.mu.Unlock()
		}
	}()
	return ul
}

func (ul *Limiter) AllowUser(user string) bool {
	return ul.getUserLimiter(user).AllowN(time.Now(), 1)
}

func (ul *Limiter) AllowIP(ip string) bool {
	return ul.getIPLimiter(ip).AllowN(time.Now(), 1)
}

func (ul *Limiter) getIPLimiter(ip string) *rate.Limiter {
	ul.mu.Lock()
	defer ul.mu.Unlock()

	limiter, ok := ul.ipLimiters[ip]
	if !ok {
		limiter = rate.NewLimiter(rate.Every(ul.resetInterval), ul.ipBurst)
		ul.ipLimiters[ip] = limiter
	}
	return limiter
}

func (ul *Limiter) getUserLimiter(user string) *rate.Limiter {
	ul.mu.Lock()
	defer ul.mu.Unlock()

	limiter, ok := ul.userLimiters[user]
	if !ok {
		limiter = rate.NewLimiter(rate.Every(ul.resetInterval), ul.userBurst)
		ul.userLimiters[user] = limiter
	}
	return limiter
}
