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
	"context"
	"encoding/json"

	casdoorAuth "github.com/casdoor/casdoor-go-sdk/auth"
	"github.com/labring/sealos/pkg/auth/conf"
	"github.com/labring/sealos/pkg/auth/utils"
	"github.com/labring/sealos/pkg/client-go/kubernetes"
	"github.com/labring/sealos/pkg/utils/logger"
	v1 "k8s.io/api/core/v1"

	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const name = "casdoor"

type CasdoorClient struct {
	Client

	Endpoint      string
	ClientID      string
	ClientSecret  string
	JwtPublicKey  string
	JwtPrivateKey string
	Organization  string
	Application   string
	CallbackURL   string
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
	PublicKey       string `json:"publicKey"`
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
	clientID, err := utils.RandomHexStr(10)
	if err != nil {
		return nil, err
	}
	clientSecret, err := utils.RandomHexStr(20)
	if err != nil {
		return nil, err
	}
	client := &CasdoorClient{
		Endpoint:     "http://casdoor-svc.sealos.svc.cluster.local:8000",
		ClientID:     clientID,
		ClientSecret: clientSecret,
		Organization: "sealos",
		Application:  "service-auth",
		CallbackURL:  conf.GlobalConfig.CallbackURL,
	}
	if conf.GlobalConfig.SSOEndpoint != "" {
		client.Endpoint = conf.GlobalConfig.SSOEndpoint
	}

	// Generate jwt public and private key
	publicKey, privateKey, err := utils.CreateJWTPublicAndPrivateKey()
	if err != nil {
		return nil, err
	}
	client.JwtPublicKey = publicKey
	client.JwtPrivateKey = privateKey

	initData := client.newCasdoorInitData()

	newInitData, err := json.Marshal(initData)
	if err != nil {
		return nil, err
	}
	if err = client.initCasdoorServer(string(newInitData)); err != nil {
		return nil, err
	}

	// Init Casdoor SDK
	casdoorAuth.InitConfig(client.Endpoint, client.ClientID, client.ClientSecret, client.JwtPublicKey, "sealos", "service-auth")
	return client, nil
}

func (c *CasdoorClient) GetRedirectURL() (string, error) {
	return casdoorAuth.GetSigninUrl(c.CallbackURL), nil
}

func (c *CasdoorClient) GetUserInfo(state string, code string) (User, error) {
	token, err := casdoorAuth.GetOAuthToken(code, state)
	if err != nil {
		return User{}, err
	}
	casdoorUser, err := casdoorAuth.ParseJwtToken(token.AccessToken)
	if err != nil {
		return User{}, err
	}
	return User{
		ID:   casdoorUser.Id,
		Name: casdoorUser.Name,
	}, nil
}

func (c *CasdoorClient) newCasdoorInitData() *CasdoorInitData {
	initData := CasdoorInitData{
		Organizations: []casdoorAuth.Organization{
			{
				Owner:         "admin",
				Name:          "sealos",
				DisplayName:   "sealos",
				WebsiteUrl:    "https://www.sealos.io/",
				Favicon:       "",
				PasswordType:  "plain",
				PhonePrefix:   "86",
				DefaultAvatar: "https://www.sealos.io/img/sealos-left.png",
			},
		},
		Applications: []Application{
			{
				Owner:          "admin",
				Name:           "service-auth",
				DisplayName:    "service-auth",
				Logo:           "https://www.sealos.io/img/sealos-left.png",
				HomepageURL:    "https://www.sealos.io/",
				Organization:   "sealos",
				Cert:           "cert-service-auth",
				EnablePassword: true,
				EnableSignUp:   true,
				ClientID:       c.ClientID,
				ClientSecret:   c.ClientSecret,
				RedirectUris:   []string{conf.GlobalConfig.CallbackURL},
				ExpireInHours:  24 * 30,
				SignupItems: []SignupItem{
					{
						Name:     "ID",
						Visible:  false,
						Required: true,
						Prompted: false,
						Rule:     "Random",
					},
					{
						Name:     "Username",
						Visible:  true,
						Required: true,
						Prompted: false,
						Rule:     "None",
					},
					{
						Name:     "Display name",
						Visible:  true,
						Required: true,
						Prompted: false,
						Rule:     "None",
					},
					{
						Name:     "Password",
						Visible:  true,
						Required: true,
						Prompted: false,
						Rule:     "None",
					},
					{
						Name:     "Confirm password",
						Visible:  true,
						Required: true,
						Prompted: false,
						Rule:     "None",
					},
					{
						Name:     "Email",
						Visible:  true,
						Required: true,
						Prompted: false,
						Rule:     "None",
					},
					{
						Name:     "Phone",
						Visible:  true,
						Required: true,
						Prompted: false,
						Rule:     "None",
					},
					{
						Name:     "Agreement",
						Visible:  true,
						Required: true,
						Prompted: false,
						Rule:     "None",
					},
				},
			},
		},
		Certs: []Cert{
			{
				Owner:           "admin",
				Name:            "cert-service-auth",
				DisplayName:     "Sealos Service Auth Cert",
				Scope:           "JWT",
				Type:            "x509",
				CryptoAlgorithm: "RS256",
				BitSize:         4096,
				ExpireInYears:   99,
				PublicKey:       c.JwtPublicKey,
				PrivateKey:      c.JwtPrivateKey,
			},
		},
	}

	for _, provider := range conf.GlobalConfig.OAuthProviders {
		switch strings.ToLower(provider.Type) {
		case "github":
			if provider.ClientID != "" && provider.ClientSecret != "" {
				initData.Providers = append(initData.Providers, Provider{
					Owner:        "admin",
					Name:         "provider_sealos_github",
					DisplayName:  "Provider for Sealos GitHub",
					Category:     "OAuth",
					Type:         "GitHub",
					ClientID:     provider.ClientID,
					ClientSecret: provider.ClientSecret,
				})
				initData.Applications[0].Providers = append(initData.Applications[0].Providers, ProviderItem{
					Name:      "provider_sealos_github",
					CanSignUp: true,
					CanSignIn: true,
					CanUnlink: true,
					Prompted:  false,
					AlertType: "None",
				})
			}
		default:
			logger.Warn("Not supported provider type: " + provider.Type)
		}
	}

	return &initData
}

func (c *CasdoorClient) initCasdoorServer(initData string) error {
	client, err := kubernetes.NewKubernetesClient(conf.GlobalConfig.Kubeconfig, "")
	if err != nil {
		return err
	}
	// Create configuration as ConfigMap
	if _, err := utils.ApplyConfigMap(client, "casdoor-init-data", "init_data.json", initData); err != nil {
		return err
	}

	// Update deployment to mount ConfigMap. K8s will automatically restart Casdoor server.
	casdoorServer, err := client.Kubernetes().AppsV1().Deployments(conf.Namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		return err
	}

	// As clientId, clientSecret, and JWT keys are generated randomly, we need to replace the old one.
	i := 0
	for _, volume := range casdoorServer.Spec.Template.Spec.Containers[0].VolumeMounts {
		if volume.MountPath != "/init_data.json" {
			casdoorServer.Spec.Template.Spec.Containers[0].VolumeMounts[i] = volume
			i++
		}
	}
	// Mount init data to Casdoor
	// The volume name must be random, otherwise the pod will not restart even when ConfigMap has been updated.
	casdoorServer.Spec.Template.Spec.Containers[0].VolumeMounts = append(casdoorServer.Spec.Template.Spec.Containers[0].VolumeMounts[:i], v1.VolumeMount{
		Name:      "casdoor-init-data-volume-" + c.ClientID,
		MountPath: "/init_data.json",
		SubPath:   "init_data.json",
	})
	casdoorServer.Spec.Template.Spec.Volumes = append(casdoorServer.Spec.Template.Spec.Volumes, v1.Volume{
		Name: "casdoor-init-data-volume-" + c.ClientID,
		VolumeSource: v1.VolumeSource{
			ConfigMap: &v1.ConfigMapVolumeSource{
				LocalObjectReference: v1.LocalObjectReference{
					Name: "casdoor-init-data",
				},
			},
		},
	})
	_, err = client.Kubernetes().AppsV1().Deployments(conf.Namespace).Update(context.TODO(), casdoorServer, metav1.UpdateOptions{})
	return err
}
