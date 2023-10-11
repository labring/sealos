package v1

import (
	"encoding/json"
	"golang.org/x/net/publicsuffix"
	netv1 "k8s.io/api/networking/v1"
	"net/http"
	"net/url"
	"sync"
	"time"
)

type IcpResponse struct {
	ErrorCode int    `json:"error_code"`
	Reason    string `json:"reason"`
	Result    struct {
		CompanyName string `json:"CompanyName"`
		CompanyType string `json:"CompanyType"`
		MainPage    string `json:"MainPage"`
		SiteLicense string `json:"SiteLicense"`
		SiteName    string `json:"SiteName"`
		VerifyTime  string `json:"VerifyTime"`
	} `json:"result"`
}

type cacheEntry struct {
	icpResponse *IcpResponse
	cachedTime  time.Time
	cacheTTL    time.Duration
}

type IcpValidator struct {
	enabled  bool
	endpoint string
	key      string

	cache sync.Map
}

func NewIcpValidator(icpEnabled bool, icpEndpoint string, icpKey string) *IcpValidator {
	v := &IcpValidator{
		enabled:  icpEnabled,
		endpoint: icpEndpoint,
		key:      icpKey,
	}

	// Start the cleanup routine in a goroutine
	go v.cleanupRoutine()

	return v
}

// cleanupRoutine periodically checks and deletes expired cache entries
func (i *IcpValidator) cleanupRoutine() {
	ticker := time.NewTicker(time.Hour) // checks every one hour
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			i.cleanupExpiredCache()
		}
	}
}

// cleanupExpiredCache checks all cache entries and deletes the expired ones
func (i *IcpValidator) cleanupExpiredCache() {
	i.cache.Range(func(key, value interface{}) bool {
		entry := value.(cacheEntry)
		if time.Since(entry.cachedTime) > entry.cacheTTL {
			i.cache.Delete(key)
		}
		return true
	})
}

func (i *IcpValidator) Query(rule *netv1.IngressRule) (*IcpResponse, error) {
	domainName, err := publicsuffix.EffectiveTLDPlusOne(rule.Host)
	if err != nil {
		return nil, err
	}

	// Check if result is already cached
	cache, found := i.cache.Load(domainName)
	entry := cache.(cacheEntry)
	// Use the cache entry if it's not expired
	if found && time.Since(entry.cachedTime) <= entry.cacheTTL {
		return entry.icpResponse, nil
	} else if time.Since(entry.cachedTime) > entry.cacheTTL {
		// Remove expired cache entry, and query again
		i.cache.Delete(domainName)
	}

	// Query ICP
	data := url.Values{}
	data.Set("domainName", domainName)
	data.Set("key", i.key)
	resp, err := http.PostForm(i.endpoint, data)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var response IcpResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, err
	}

	// Cache the result with the current timestamp, and generate a TTL by the response
	i.cache.Store(domainName, cacheEntry{
		icpResponse: &response,
		cachedTime:  time.Now(),
		cacheTTL:    genCacheTTL(&response),
	})

	return &response, nil
}

// genCacheTTL generates a cache TTL based on the response
func genCacheTTL(rsp *IcpResponse) time.Duration {
	// If the response is valid, and the site license is not empty, cache for 30 days
	if rsp.ErrorCode == 0 && rsp.Result.SiteLicense != "" {
		return 30 * 24 * time.Hour
	}
	// Otherwise, cache for 5 minutes
	return 5 * time.Minute
}
