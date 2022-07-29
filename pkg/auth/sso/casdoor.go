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

	k8sErrors "k8s.io/apimachinery/pkg/api/errors"

	"github.com/pkg/errors"

	casdoorAuth "github.com/casdoor/casdoor-go-sdk/auth"
	"github.com/labring/sealos/pkg/auth/conf"
	"github.com/labring/sealos/pkg/auth/utils"
	"github.com/labring/sealos/pkg/client-go/kubernetes"
	v1 "k8s.io/api/core/v1"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const name = "casdoor"
const initDataName = "casdoor-init-data"

type CasdoorClient struct {
	Client

	Endpoint       string
	ClientID       string
	ClientSecret   string
	JwtCertificate string
	JwtPrivateKey  string
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
	client := &CasdoorClient{
		Endpoint:     conf.GlobalConfig.SSOEndpoint,
		Organization: "sealos",
		Application:  "service-auth",
		CallbackURL:  conf.GlobalConfig.CallbackURL,
	}
	if err := client.initCasdoorServer(); err != nil {
		return nil, errors.Wrap(err, "Init Casdoor server failed")
	}
	// Init Casdoor SDK
	casdoorAuth.InitConfig(client.Endpoint, client.ClientID, client.ClientSecret, client.JwtCertificate, "sealos", "service-auth")
	return client, nil
}

func (c *CasdoorClient) GetRedirectURL() (string, error) {
	return casdoorAuth.GetSigninUrl(c.CallbackURL), nil
}

func (c *CasdoorClient) GetUserInfo(state, code string) (User, error) {
	token, err := casdoorAuth.GetOAuthToken(code, state)
	if err != nil {
		return User{}, errors.Wrap(err, "Get OAuth token failed")
	}
	casdoorUser, err := casdoorAuth.ParseJwtToken(token.AccessToken)
	if err != nil {
		return User{}, errors.Wrap(err, "Parse Jwt token failed")
	}
	return User{
		ID:   casdoorUser.Id,
		Name: casdoorUser.Name,
	}, nil
}

func (c *CasdoorClient) newCasdoorInitData() (*CasdoorInitData, error) {
	var err error
	c.ClientID, err = utils.RandomHexStr(10)
	if err != nil {
		return nil, errors.Wrap(err, "Generate Casdoor client ID failed")
	}
	c.ClientSecret, err = utils.RandomHexStr(20)
	if err != nil {
		return nil, errors.Wrap(err, "Generate Casdoor client secret failed")
	}
	// Generate jwt certificate and private key
	certificate, privateKey, err := utils.CreateJWTCertificateAndPrivateKey()
	if err != nil {
		return nil, errors.Wrap(err, "Create jwt certificate and private key failed")
	}
	c.JwtCertificate = certificate
	c.JwtPrivateKey = privateKey
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
				Certificate:     c.JwtCertificate,
				PrivateKey:      c.JwtPrivateKey,
			},
		},
	}

	for _, provider := range conf.GlobalConfig.OAuthProviders {
		if provider.ClientID != "" && provider.ClientSecret != "" {
			initData.Providers = append(initData.Providers, Provider{
				Owner:        "admin",
				Name:         "provider_sealos_" + provider.Type,
				DisplayName:  "Provider for Sealos " + provider.Type,
				Category:     "OAuth",
				Type:         provider.Type,
				ClientID:     provider.ClientID,
				ClientSecret: provider.ClientSecret,
			})
			initData.Applications[0].Providers = append(initData.Applications[0].Providers, ProviderItem{
				Name:      "provider_sealos_" + provider.Type,
				CanSignUp: true,
				CanSignIn: true,
				CanUnlink: true,
				Prompted:  false,
				AlertType: "None",
			})
		}
	}

	return &initData, nil
}

func (c *CasdoorClient) initCasdoorServer() error {
	client, err := kubernetes.NewKubernetesClient(conf.GlobalConfig.Kubeconfig, "")
	if err != nil {
		return errors.Wrap(err, "Create k8s client failed")
	}

	initData := &CasdoorInitData{}
	configMap, err := client.Kubernetes().CoreV1().ConfigMaps(conf.Namespace).Get(context.TODO(), initDataName, metav1.GetOptions{})
	// If Casdoor has already been initialized, we just read init data for connection
	if err == nil {
		err := json.Unmarshal([]byte(configMap.Data["init_data.json"]), initData)
		if err != nil {
			return errors.Wrap(err, "Parse existed Casdoor init data failed")
		}
		c.ClientID = initData.Applications[0].ClientID
		c.ClientSecret = initData.Applications[0].ClientSecret
		c.JwtCertificate = initData.Certs[0].Certificate
		return nil
	} else if k8sErrors.IsNotFound(err) {
		initData, err = c.newCasdoorInitData()
		if err != nil {
			return errors.Wrap(err, "Create new Casdoor init data failed")
		}
		newInitData, err := json.Marshal(initData)
		if err != nil {
			return errors.Wrap(err, "Marshal Casdoor init data failed")
		}

		// Create configuration as ConfigMap
		if _, err := utils.ApplyConfigMap(client, initDataName, "init_data.json", string(newInitData)); err != nil {
			return errors.Wrap(err, "Create Casdoor init data as ConfigMap failed")
		}

		// Update deployment to mount ConfigMap. K8s will automatically restart Casdoor server.
		casdoorServer, err := client.Kubernetes().AppsV1().Deployments(conf.Namespace).Get(context.TODO(), name, metav1.GetOptions{})
		if err != nil {
			return errors.Wrap(err, "Get Casdoor deployment failed")
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
		return errors.Wrap(err, "Mount init data to Casdoor deployment failed")
	} else {
		return errors.Wrap(err, "Check Casdoor init data from Configmap failed")
	}
}
