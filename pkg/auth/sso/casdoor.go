// Copyright © 2022 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package sso

import (
	"encoding/json"
	"os"

	casdoorAuth "github.com/casdoor/casdoor-go-sdk/auth"
	"github.com/pkg/errors"
	"golang.org/x/oauth2"

	"github.com/labring/sealos/pkg/auth/conf"
)

type CasdoorClient struct {
	Client

	Endpoint       string
	ClientID       string
	ClientSecret   string
	JwtCertificate string
	Organization   string
	Application    string
	CallbackURL    string
}

type CasdoorInitData struct {
	Organizations []casdoorAuth.Organization `json:"organizations"`
	Applications  []Application              `json:"applications"`
	Users         []casdoorAuth.User         `json:"users"`
	Certs         []Cert                     `json:"certs"`
	Providers     []Provider                 `json:"providers"`
}

type Application struct {
	Owner          string   `json:"owner"`
	Name           string   `json:"name"`
	DisplayName    string   `json:"displayName"`
	Logo           string   `json:"logo"`
	HomepageURL    string   `json:"homepageUrl"`
	Organization   string   `json:"organization"`
	Cert           string   `json:"cert"`
	EnablePassword bool     `json:"enablePassword"`
	EnableSignUp   bool     `json:"enableSignUp"`
	ClientID       string   `json:"clientId"`
	ClientSecret   string   `json:"clientSecret"`
	RedirectUris   []string `json:"redirectUris"`
	ExpireInHours  int      `json:"expireInHours"`

	Providers   []ProviderItem `json:"providers"`
	SignupItems []SignupItem   `json:"signupItems"`
}

type ProviderItem struct {
	Name      string `json:"name"`
	CanSignUp bool   `json:"canSignUp"`
	CanSignIn bool   `json:"canSignIn"`
	CanUnlink bool   `json:"canUnlink"`
	Prompted  bool   `json:"prompted"`
	AlertType string `json:"alertType"`
}

type SignupItem struct {
	Name     string `json:"name"`
	Visible  bool   `json:"visible"`
	Required bool   `json:"required"`
	Prompted bool   `json:"prompted"`
	Rule     string `json:"rule"`
}

type Cert struct {
	Owner           string `json:"owner"`
	Name            string `json:"name"`
	DisplayName     string `json:"displayName"`
	Scope           string `json:"scope"`
	Type            string `json:"type"`
	CryptoAlgorithm string `json:"cryptoAlgorithm"`
	BitSize         int    `json:"bitSize"`
	ExpireInYears   int    `json:"expireInYears"`
	Certificate     string `json:"certificate"`
	PrivateKey      string `json:"privateKey"`
}

type Provider struct {
	Owner        string `json:"owner"`
	Name         string `json:"name"`
	DisplayName  string `json:"displayName"`
	Category     string `json:"category"`
	Type         string `json:"type"`
	ClientID     string `json:"clientId"`
	ClientSecret string `json:"clientSecret"`
}

func NewCasdoorClient() (*CasdoorClient, error) {
	initData, err := readInitDataFromFile()
	if err != nil {
		return nil, errors.Wrap(err, "Read Casdoor init data failed")
	}
	client := &CasdoorClient{
		Endpoint:     conf.GlobalConfig.SSOEndpoint,
		Organization: "sealos",
		Application:  "service-auth",
		CallbackURL:  conf.GlobalConfig.CallbackURL,
	}
	if len(initData.Organizations) != 0 {
		client.Organization = initData.Organizations[0].Name
	}
	if len(initData.Applications) != 0 {
		client.Application = initData.Applications[0].Name
		client.ClientID = initData.Applications[0].ClientID
		client.ClientSecret = initData.Applications[0].ClientSecret
	}
	if len(initData.Certs) != 0 {
		client.JwtCertificate = initData.Certs[0].Certificate
	}
	// Init Casdoor SDK
	casdoorAuth.InitConfig(client.Endpoint, client.ClientID, client.ClientSecret, client.JwtCertificate, client.Organization, client.Application)
	return client, nil
}

func (c *CasdoorClient) GetRedirectURL() (string, error) {
	return casdoorAuth.GetSigninUrl(c.CallbackURL), nil
}

func (c *CasdoorClient) GetToken(state, code string) (*oauth2.Token, error) {
	return casdoorAuth.GetOAuthToken(code, state)
}

func (c *CasdoorClient) GetUserInfo(accessToken string) (*User, error) {
	casdoorUser, err := casdoorAuth.ParseJwtToken(accessToken)
	if err != nil {
		return nil, errors.Wrap(err, "Parse Jwt token failed")
	}
	return &User{
		ID:     casdoorUser.Id,
		Name:   casdoorUser.Name,
		Avatar: casdoorUser.Avatar,
	}, nil
}

func readInitDataFromFile() (*CasdoorInitData, error) {
	path := conf.GlobalConfig.InitDataPath
	if len(path) == 0 {
		path = "/init_data.json"
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, errors.Wrap(err, "Read init data failed")
	}
	var initData CasdoorInitData
	if err := json.Unmarshal(data, &initData); err != nil {
		return nil, errors.Wrap(err, "Unmarshal init data failed")
	}
	return &initData, nil
}
