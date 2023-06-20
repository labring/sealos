package cloudtool

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"reflect"

	"github.com/labring/sealos/pkg/utils/logger"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
	cl "sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	Namespace       string = "cloud-system"
	LicenseName     string = "cloud-license"
	SecretName      string = "cloud-secret"
	ConfigName      string = "cloud-config"
	CloudStartName  string = "cloud-start"
	ClientStartName string = "client-start"
)

const (
	ContentTypePlain = "text/plain"
	ContentTypeHTML  = "text/html"
	ContentTypeJSON  = "application/json"
)

type Collector struct {
	UID       string    `json:"uid"`
	License   License   `json:"license"`
	SecretKey SecretKey `json:"secretKey"`
	Resource  Resource  `json:"resource"`
}

type ClusterInfo struct {
	UID       string   `json:"uid"`
	PublicKey string   `json:"publicKey"`
	Policy    Policy   `json:"policy"`
	License   License  `json:"license"`
	Resource  Resource `json:"resource"`
}

type SyncRequest struct {
	UID string `json:"uid"`
}

type Policy struct {
	LicensePolicy string `json:"licensePolicy"`
}

type License struct {
	Token string `json:"token"`
}

type Resource struct {
	NodeNum int64 `json:"nodeNum"`
}

type SecretKey struct {
	PrivateKey string `json:"privateKey"`
	PublicKey  string `json:"publicKey"`
}

type HttpBody struct {
	ContentType string
	StatusCode  int
	Body        []byte
}

func parse(content interface{}) ([]byte, error) {
	var err error
	var JSONString []byte
	if JSONString, err = json.Marshal(content); err != nil {
		logger.Error("failed to parse ctx to JsonString", err)
	}
	return JSONString, err
}

func CommunicateWithCloud(method string, url string, content interface{}) (HttpBody, error) {
	var req *http.Request
	var resp *http.Response
	var err error
	if req, err = createRequest(method, url, content); err != nil {
		return HttpBody{}, err
	}
	if resp, err = getResponse(req); err != nil {
		return HttpBody{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, err := readResponse(resp)
		if err != nil {
			logger.Error("status code not ok &&", err)
			return HttpBody{}, err
		}
		logger.Error("error:", "status code:", resp.StatusCode, "response body:", string(body.Body))
		return HttpBody{}, nil
	}
	return readResponse(resp)
}

func createRequest(method string, url string, content interface{}) (*http.Request, error) {
	var err error
	var body []byte
	var req *http.Request
	if body, err = parse(content); err != nil {
		logger.Error("failed to generate a new Http Reaquest", err)
		return nil, err
	}
	req, err = http.NewRequest(method, url, bytes.NewBuffer(body))
	if err != nil {
		logger.Error("CloudClient can't generate a new Http Reaquest ", err)
		return nil, err
	}
	if method == "POST" {
		req.Header.Set("Content-Type", "application/json")
	}
	return req, nil
}

func getResponse(req *http.Request) (*http.Response, error) {
	if req == nil {
		logger.Info("no http request")
		return nil, errors.New("no http request")
	}
	//logger.Error(cc.CloudURL)
	var resp *http.Response
	var err error
	if resp, err = do(req); err != nil {
		logger.Info("failed to send HTTP request ", err)
		return nil, err
	}
	return resp, nil
}

func do(req *http.Request) (*http.Response, error) {
	defer req.Body.Close()
	var err error
	var resp *http.Response
	client := http.Client{}
	resp, err = client.Do(req)
	if err != nil {
		return nil, err
	}
	return resp, nil
}

func readResponse(resp *http.Response) (HttpBody, error) {
	defer resp.Body.Close()
	var err error
	var http_resp HttpBody
	http_resp.Body, err = io.ReadAll(resp.Body)
	http_resp.ContentType = resp.Header.Get("Content-Type")
	http_resp.StatusCode = resp.StatusCode
	if err != nil {
		logger.Error("CloudClient failed to get HTTP response body ", err)
		return HttpBody{}, err
	}
	return http_resp, nil
}

func GetImportantResource(client cl.Client, resource cl.Object, ctx context.Context, namespace string, name string) bool {
	var nn types.NamespacedName = types.NamespacedName{Namespace: namespace, Name: name}
	for {
		if err := client.Get(ctx, nn, resource); err != nil {
			if apierrors.IsNotFound(err) {
				logger.Error("failed to get the", reflect.TypeOf(resource).Elem().Name())
				// lock the cluster
				return false
			}
			logger.Error("failed to get the", reflect.TypeOf(resource).Elem().Name(), err)
			continue
		}
		logger.Info("GetImportantResource success:", reflect.TypeOf(resource).Elem().Name())
		break
	}
	return true
}

func UpdateImportantResource(client cl.Client, cs *CloudSyncManager, ctx context.Context, resource cl.Object) bool {
	for {
		if err := client.Update(context.Background(), resource); err != nil {
			if apierrors.IsNotFound(err) {
				logger.Error("failed to get the", reflect.TypeOf(resource).Elem().Name())
				// lock the cluster
				return false
			}
			logger.Error("failed to get the", reflect.TypeOf(resource).Elem().Name(), err)
			continue
		}
		logger.Info("UpdateImportantResource success:", reflect.TypeOf(resource).Elem().Name())
		break
	}
	return true
}
