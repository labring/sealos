package server

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/rand"
	"net"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"text/template"
	"time"

	"github.com/cesanta/glog"
	"github.com/docker/distribution/registry/auth/token"
	"github.com/labring/service/hub/api"
	"github.com/labring/service/hub/auth"
)

var (
	hostPortRegex = regexp.MustCompile(`^(?:\[(.+)\]:\d+|([^:]+):\d+)$`)
	scopeRegex    = regexp.MustCompile(`([a-z0-9]+)(\([a-z0-9]+\))?`)
)

type AuthServer struct {
	config         *Config
	authenticators api.Authenticator
	authorizers    api.Authorizer
}

func NewAuthServer(c *Config) (*AuthServer, error) {
	as := &AuthServer{
		config:         c,
		authenticators: auth.NewSealosAuthn(),
		authorizers:    auth.NewSealosAuthz(),
	}
	return as, nil
}

type AuthRequest struct {
	RemoteConnAddr string
	RemoteAddr     string
	RemoteIP       net.IP
	User           string
	Password       api.PasswordString
	Account        string
	Service        string
	Scopes         []AuthScope
	Labels         api.Labels
}

type AuthScope struct {
	Type    string
	Class   string
	Name    string
	Actions []string
}

type AuthzResult struct {
	scope            AuthScope
	autorizedActions []string
}

func (ar AuthRequest) String() string {
	return fmt.Sprintf("{%s:%s@%s %s}", ar.User, ar.Password, ar.RemoteAddr, ar.Scopes)
}

func parseRemoteAddr(ra string) net.IP {
	hp := hostPortRegex.FindStringSubmatch(ra)
	if hp != nil {
		if hp[1] != "" {
			ra = hp[1]
		} else if hp[2] != "" {
			ra = hp[2]
		}
	}
	res := net.ParseIP(ra)
	return res
}

func parseScope(scope string) (string, string, error) {
	parts := scopeRegex.FindStringSubmatch(scope)
	if parts == nil {
		return "", "", fmt.Errorf("malformed scope request")
	}

	switch len(parts) {
	case 3:
		return parts[1], "", nil
	case 4:
		return parts[1], parts[3], nil
	default:
		return "", "", fmt.Errorf("malformed scope request")
	}
}

func (as *AuthServer) ParseRequest(req *http.Request) (*AuthRequest, error) {
	ar := &AuthRequest{RemoteConnAddr: req.RemoteAddr, RemoteAddr: req.RemoteAddr}
	if as.config.Server.RealIPHeader != "" {
		hv := req.Header.Get(as.config.Server.RealIPHeader)
		ips := strings.Split(hv, ",")

		realIPPos := as.config.Server.RealIPPos
		if realIPPos < 0 {
			realIPPos = len(ips) + realIPPos
			if realIPPos < 0 {
				realIPPos = 0
			}
		}

		ar.RemoteAddr = strings.TrimSpace(ips[realIPPos])
		glog.V(3).Infof("Conn ip %s, %s: %s, addr: %s", ar.RemoteAddr, as.config.Server.RealIPHeader, hv, ar.RemoteAddr)
		if ar.RemoteAddr == "" {
			return nil, fmt.Errorf("client address not provided")
		}
	}
	ar.RemoteIP = parseRemoteAddr(ar.RemoteAddr)
	if ar.RemoteIP == nil {
		return nil, fmt.Errorf("unable to parse remote addr %s", ar.RemoteAddr)
	}
	user, password, haveBasicAuth := req.BasicAuth()
	if haveBasicAuth {
		ar.User = user
		ar.Password = api.PasswordString(password)
	} else if req.Method == "POST" {
		// username and password could be part of form data
		username := req.FormValue("username")
		password := req.FormValue("password")
		if username != "" && password != "" {
			ar.User = username
			ar.Password = api.PasswordString(password)
		}
	}
	ar.Account = req.FormValue("account")
	if ar.Account == "" {
		ar.Account = ar.User
	} else if haveBasicAuth && ar.Account != ar.User {
		return nil, fmt.Errorf("user and account are not the same (%q vs %q)", ar.User, ar.Account)
	}
	ar.Service = req.FormValue("service")
	if err := req.ParseForm(); err != nil {
		return nil, fmt.Errorf("invalid form value")
	}
	// https://github.com/docker/distribution/blob/1b9ab303a477ded9bdd3fc97e9119fa8f9e58fca/docs/spec/auth/scope.md#resource-scope-grammar
	if req.FormValue("scope") != "" {
		for _, scopeValue := range req.Form["scope"] {
			for _, scopeStr := range strings.Split(scopeValue, " ") {
				parts := strings.Split(scopeStr, ":")
				var scope AuthScope

				scopeType, scopeClass, err := parseScope(parts[0])
				if err != nil {
					return nil, err
				}

				switch len(parts) {
				case 3:
					scope = AuthScope{
						Type:    scopeType,
						Class:   scopeClass,
						Name:    parts[1],
						Actions: strings.Split(parts[2], ","),
					}
				case 4:
					scope = AuthScope{
						Type:    scopeType,
						Class:   scopeClass,
						Name:    parts[1] + ":" + parts[2],
						Actions: strings.Split(parts[3], ","),
					}
				default:
					return nil, fmt.Errorf("invalid scope: %q", scopeStr)
				}
				sort.Strings(scope.Actions)
				ar.Scopes = append(ar.Scopes, scope)
			}
		}
	}
	return ar, nil
}

func (as *AuthServer) Authenticate(ar *AuthRequest) (bool, api.Labels, error) {
	result, labels, err := as.authenticators.Authenticate(ar.Account, ar.Password)
	glog.V(2).Infof("Authn %s -> %t, %+v, %v", ar.Account, result, labels, err)
	if err != nil {
		if err == api.NoMatch {
			return false, nil, err
		} else if err == api.WrongPass {
			glog.Warningf("Failed authentication with %s: %s", err, ar.Account)
			return false, nil, nil
		}
		err = fmt.Errorf("authentication returned error: %s", err)
		glog.Errorf("%s: %s", ar, err)
		return false, nil, err
	}
	return result, labels, nil
}

func (as *AuthServer) authorizeScope(ai *api.AuthRequestInfo) ([]string, error) {
	result, err := as.authorizers.Authorize(ai)
	glog.V(2).Infof("Authz  %s -> %s, %s", *ai, result, err)
	if err != nil {
		if err == api.NoMatch {
			return nil, nil
		}
		err = fmt.Errorf("authz # returned error: %s", err)
		glog.Errorf("%s: %s", *ai, err)
		return nil, err
	}
	return result, nil
}

func (as *AuthServer) Authorize(ar *AuthRequest) ([]AuthzResult, error) {
	var ares []AuthzResult
	for _, scope := range ar.Scopes {
		ai := &api.AuthRequestInfo{
			Account:    ar.Account,
			Type:       scope.Type,
			Name:       scope.Name,
			Service:    ar.Service,
			IP:         ar.RemoteIP,
			Actions:    scope.Actions,
			Labels:     ar.Labels,
			Kubeconfig: string(ar.Password),
		}
		actions, err := as.authorizeScope(ai)
		if err != nil {
			return nil, err
		}
		ares = append(ares, AuthzResult{scope: scope, autorizedActions: actions})
	}
	return ares, nil
}

// CreateToken https://github.com/docker/distribution/blob/master/docs/spec/auth/token.md#example
func (as *AuthServer) CreateToken(ar *AuthRequest, ares []AuthzResult) (string, error) {
	now := time.Now().Unix()
	tc := &as.config.Token

	// Sign something dummy to find out which algorithm is used.
	_, sigAlg, err := tc.privateKey.Sign(strings.NewReader("dummy"), 0)
	if err != nil {
		return "", fmt.Errorf("failed to sign: %s", err)
	}
	header := token.Header{
		Type:       "JWT",
		SigningAlg: sigAlg,
		KeyID:      tc.publicKey.KeyID(),
	}
	headerJSON, err := json.Marshal(header)
	if err != nil {
		return "", fmt.Errorf("failed to marshal header: %s", err)
	}

	claims := token.ClaimSet{
		Issuer:     tc.Issuer,
		Subject:    ar.Account,
		Audience:   ar.Service,
		NotBefore:  now - 10,
		IssuedAt:   now,
		Expiration: now + tc.Expiration,
		JWTID:      fmt.Sprintf("%d", rand.Int63()),
		Access:     []*token.ResourceActions{},
	}
	for _, a := range ares {
		ra := &token.ResourceActions{
			Type:    a.scope.Type,
			Name:    a.scope.Name,
			Actions: a.autorizedActions,
		}
		if ra.Actions == nil {
			ra.Actions = []string{}
		}
		sort.Strings(ra.Actions)
		claims.Access = append(claims.Access, ra)
	}
	claimsJSON, err := json.Marshal(claims)
	if err != nil {
		return "", fmt.Errorf("failed to marshal claims: %s", err)
	}

	payload := fmt.Sprintf("%s%s%s", joseBase64UrlEncode(headerJSON), token.TokenSeparator, joseBase64UrlEncode(claimsJSON))

	sig, sigAlg2, err := tc.privateKey.Sign(strings.NewReader(payload), 0)
	if err != nil || sigAlg2 != sigAlg {
		return "", fmt.Errorf("failed to sign token: %s", err)
	}
	glog.Infof("New token for %s %+v: %s", *ar, ar.Labels, claimsJSON)
	return fmt.Sprintf("%s%s%s", payload, token.TokenSeparator, joseBase64UrlEncode(sig)), nil
}

func (as *AuthServer) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	glog.V(3).Infof("Request: %+v", req)
	pathPrefix := as.config.Server.PathPrefix
	if as.config.Server.HSTS {
		rw.Header().Add("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
	}
	switch {
	case req.URL.Path == pathPrefix+"/auth/issuer":
		as.doIndex(rw, req)
	case req.URL.Path == pathPrefix+"/auth":
		as.doAuth(rw, req)
	default:
		http.Error(rw, "Not found", http.StatusNotFound)
		return
	}
}

func (as *AuthServer) doIndex(rw http.ResponseWriter, req *http.Request) {
	rw.Header().Set("Content-Type", "text/html; charset=utf-8")
	t, _ := template.New("").Parse("{{.}}")
	s := fmt.Sprintf("<h1>%s</h1>\n", as.config.Token.Issuer)
	_ = t.Execute(rw, s)
}

func (as *AuthServer) doAuth(rw http.ResponseWriter, req *http.Request) {
	ar, err := as.ParseRequest(req)
	var ares []AuthzResult
	if err != nil {
		glog.Warningf("Bad request: %s", err)
		http.Error(rw, fmt.Sprintf("Bad request: %s", err), http.StatusBadRequest)
		return
	}
	glog.V(2).Infof("Auth request: %+v", ar)
	{
		authnResult, labels, err := as.Authenticate(ar)
		if err != nil {
			http.Error(rw, fmt.Sprintf("Authentication failed (%s)", err), http.StatusInternalServerError)
			return
		}
		if !authnResult {
			glog.Warningf("Auth failed: %s", *ar)
			rw.Header()["WWW-Authenticate"] = []string{fmt.Sprintf(`Basic realm="%s"`, as.config.Token.Issuer)}
			http.Error(rw, "Auth failed.", http.StatusUnauthorized)
			return
		}
		ar.Labels = labels
	}
	if len(ar.Scopes) > 0 {
		ares, err = as.Authorize(ar)
		if err != nil {
			http.Error(rw, fmt.Sprintf("Authorization failed (%s)", err), http.StatusInternalServerError)
			return
		}
	} else {
		// Authentication-only request ("docker login"), pass through.
	}
	tk, err := as.CreateToken(ar, ares)
	if err != nil {
		msg := fmt.Sprintf("Failed to generate token %s", err)
		http.Error(rw, msg, http.StatusInternalServerError)
		glog.Errorf("%s: %s", ar, msg)
		return
	}
	// https://www.oauth.com/oauth2-servers/access-tokens/access-token-response/
	// describes that the response should have the token in `access_token`
	// https://docs.docker.com/registry/spec/auth/token/#token-response-fields
	// the token should also be in `token` to support older clients
	result, _ := json.Marshal(&map[string]string{"access_token": tk, "token": tk})
	glog.V(3).Infof("%s", result)
	rw.Header().Set("Content-Type", "application/json")
	t, _ := template.New("").Parse("{{.}}")
	s := fmt.Sprintf("%s\n", result)
	_ = t.Execute(rw, s)
}

func (as *AuthServer) Stop() {
	as.authenticators.Stop()
	as.authorizers.Stop()
	glog.Infof("Server stopped")
}

// Copy-pasted from libtrust where it is private.
func joseBase64UrlEncode(b []byte) string {
	return strings.TrimRight(base64.URLEncoding.EncodeToString(b), "=")
}
