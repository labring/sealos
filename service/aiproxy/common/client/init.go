package client

import (
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/logger"
)

var (
	HTTPClient                   *http.Client
	ImpatientHTTPClient          *http.Client
	UserContentRequestHTTPClient *http.Client
)

func Init() {
	if config.UserContentRequestProxy != "" {
		logger.SysLog(fmt.Sprintf("using %s as proxy to fetch user content", config.UserContentRequestProxy))
		proxyURL, err := url.Parse(config.UserContentRequestProxy)
		if err != nil {
			logger.FatalLog("USER_CONTENT_REQUEST_PROXY set but invalid: " + config.UserContentRequestProxy)
		}
		transport := &http.Transport{
			Proxy: http.ProxyURL(proxyURL),
		}
		UserContentRequestHTTPClient = &http.Client{
			Transport: transport,
			Timeout:   time.Second * time.Duration(config.UserContentRequestTimeout),
		}
	} else {
		UserContentRequestHTTPClient = &http.Client{}
	}
	var transport http.RoundTripper
	if config.RelayProxy != "" {
		logger.SysLog(fmt.Sprintf("using %s as api relay proxy", config.RelayProxy))
		proxyURL, err := url.Parse(config.RelayProxy)
		if err != nil {
			logger.FatalLog("USER_CONTENT_REQUEST_PROXY set but invalid: " + config.UserContentRequestProxy)
		}
		transport = &http.Transport{
			Proxy: http.ProxyURL(proxyURL),
		}
	}

	if config.RelayTimeout == 0 {
		HTTPClient = &http.Client{
			Transport: transport,
		}
	} else {
		HTTPClient = &http.Client{
			Timeout:   time.Duration(config.RelayTimeout) * time.Second,
			Transport: transport,
		}
	}

	ImpatientHTTPClient = &http.Client{
		Timeout:   5 * time.Second,
		Transport: transport,
	}
}
