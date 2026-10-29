// Package acquisition forwards committed billing facts without joining the payment write path.
package acquisition

import (
	"errors"
	"net/url"
	"strings"
)

type Config struct {
	URL      string
	Secret   string
	Realm    string
	RegionID string
	Currency string
}

// ConfigFromEnv returns nil when forwarding is disabled. All credentials stay server-side.
func ConfigFromEnv(getenv func(string) string, regionID, currency string) (*Config, error) {
	endpoint := strings.TrimSpace(getenv("ACQUISITION_ANALYTICS_URL"))
	secret := strings.TrimSpace(getenv("ACQUISITION_INGEST_SECRET"))
	if endpoint == "" && secret == "" {
		return nil, nil
	}
	realm := strings.TrimSpace(getenv("ACQUISITION_REALM"))
	if endpoint == "" || secret == "" || (realm != "china" && realm != "global") || regionID == "" {
		return nil, errors.New("acquisition billing forwarding configuration is incomplete")
	}
	u, err := url.Parse(endpoint)
	if err != nil || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || u.Path != "/api/analytics/lifecycle" {
		return nil, errors.New("acquisition billing endpoint must be an explicit lifecycle URL")
	}
	loopback := u.Hostname() == "localhost" || u.Hostname() == "127.0.0.1" || u.Hostname() == "::1"
	if u.Scheme != "https" && !(u.Scheme == "http" && loopback) {
		return nil, errors.New("acquisition billing endpoint requires HTTPS")
	}
	currency = strings.ToUpper(strings.TrimSpace(currency))
	if len(currency) != 3 || strings.IndexFunc(currency, func(r rune) bool { return r < 'A' || r > 'Z' }) != -1 {
		return nil, errors.New("acquisition billing currency must be a three-letter code")
	}
	return &Config{URL: endpoint, Secret: secret, Realm: realm, RegionID: regionID, Currency: currency}, nil
}

func (c Config) sourceKey() string { return c.Realm + ":" + c.RegionID }
