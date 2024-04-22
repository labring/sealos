//
// Copyright (c) 2015-2023 MinIO, Inc.
//
// This file is part of MinIO Object Storage stack
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <http://www.gnu.org/licenses/>.
//

package objectstorage

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/hex"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/prometheus/prom2json"

	"github.com/minio/minio-go/v7/pkg/s3utils"
	dto "github.com/prometheus/client_model/go"

	jwtgo "github.com/golang-jwt/jwt/v4"
)

// MetricsClient implements MinIO metrics operations
type MetricsClient struct {
	/// JWT token for authentication
	jwtToken string
	// Indicate whether we are using https or not
	secure bool
	// Parsed endpoint url provided by the user.
	endpointURL *url.URL
	// Needs allocation.
	httpClient *http.Client
}

// metricsRequestData - is container for all the values to make a
// request.
type metricsRequestData struct {
	relativePath string // URL path relative to admin API base endpoint
}

// NewMetricsClient - instantiate minio metrics client honoring Prometheus format
func NewMetricsClient(endpoint string, accessKeyID, secretAccessKey string, secure bool) (*MetricsClient, error) {
	jwtToken, err := getPrometheusToken(accessKeyID, secretAccessKey)
	if err != nil {
		return nil, err
	}

	endpointURL, err := getEndpointURL(endpoint, secure)
	if err != nil {
		return nil, err
	}
	return privateNewMetricsClient(endpointURL, jwtToken, secure)
}

// BucketUsageTotalBytesMetrics - returns Bucket Metrics in Prometheus format
func (client *MetricsClient) BucketUsageTotalBytesMetrics(ctx context.Context) ([]*prom2json.Family, error) {
	return client.fetchMetrics(ctx, "bucket", "minio_bucket_usage_total_bytes")
}

// fetchMetrics - returns Metrics of given subsystem in Prometheus format
func (client *MetricsClient) fetchMetrics(ctx context.Context, subSystem string, metricsName string) ([]*prom2json.Family, error) {
	reqData := metricsRequestData{
		relativePath: "/v2/metrics/" + subSystem,
	}

	// Execute GET on /minio/v2/metrics/<subSys>
	resp, err := client.executeGetRequest(ctx, reqData)
	if err != nil {
		return nil, err
	}
	defer closeResponse(resp)

	if resp.StatusCode != http.StatusOK {
		return nil, httpRespToErrorResponse(resp)
	}
	return parsePrometheusResults(resp.Body, metricsName)
}

// closeResponse close non nil response with any response Body.
// convenient wrapper to drain any remaining data on response body.
//
// Subsequently this allows golang http RoundTripper
// to re-use the same connection for future requests.
func closeResponse(resp *http.Response) {
	// Callers should close resp.Body when done reading from it.
	// If resp.Body is not closed, the Client's underlying RoundTripper
	// (typically Transport) may not be able to re-use a persistent TCP
	// connection to the server for a subsequent "keep-alive" request.
	if resp != nil && resp.Body != nil {
		// Drain any remaining Body and then close the connection.
		// Without this closing connection would disallow re-using
		// the same connection for future uses.
		//  - http://stackoverflow.com/a/17961593/4465767
		_, _ = io.Copy(io.Discard, resp.Body)
		resp.Body.Close()
	}
}

func parsePrometheusResults(reader io.Reader, prefix string) (results []*prom2json.Family, err error) {
	filteredReader, err := filterMetricsByPrefix(reader, prefix)
	if err != nil {
		return nil, err
	}
	mfChan := make(chan *dto.MetricFamily)
	errChan := make(chan error)

	go func() {
		defer close(errChan)
		err = prom2json.ParseReader(filteredReader, mfChan)
		if err != nil {
			errChan <- err
		}
	}()

	for mf := range mfChan {
		if !strings.Contains(mf.GetName(), prefix) {
			continue
		}
		results = append(results, prom2json.NewFamily(mf))
	}
	if err := <-errChan; err != nil {
		return nil, err
	}
	return results, nil
}

func filterMetricsByPrefix(reader io.Reader, prefix string) (io.Reader, error) {
	var buf bytes.Buffer
	for {
		line, err := readLine(reader)
		if err == io.EOF {
			break
		} else if err != nil {
			return nil, err
		}
		if bytes.HasPrefix(line, []byte("#")) || !bytes.HasPrefix(line, []byte(prefix)) {
			continue
		}
		if _, err := buf.Write(line); err != nil {
			return nil, err
		}
	}
	return &buf, nil
}

func readLine(reader io.Reader) ([]byte, error) {
	var line []byte
	for {
		b := make([]byte, 1)
		_, err := reader.Read(b)
		if err != nil {
			return nil, err
		}
		line = append(line, b[0])
		if b[0] == '\n' {
			break
		}
	}
	return line, nil
}

// httpRespToErrorResponse returns a new encoded ErrorResponse
// structure as error.
func httpRespToErrorResponse(resp *http.Response) error {
	if resp == nil || resp.Body == nil {
		msg := "Response is empty."
		return ErrInvalidArgument(msg)
	}

	defer closeResponse(resp)
	// Limit to 100K
	body, err := io.ReadAll(io.LimitReader(resp.Body, 100<<10))
	if err != nil {
		return ErrorResponse{
			Code:    resp.Status,
			Message: fmt.Sprintf("Failed to read server response: %s.", err),
		}
	}

	var errResp ErrorResponse
	// Decode the json error
	err = json.Unmarshal(body, &errResp)
	if err != nil {
		// We might get errors as XML, try that.
		xmlErr := xml.Unmarshal(body, &errResp)

		if xmlErr != nil {
			bodyString := string(body)
			if !utf8.Valid(body) {
				bodyString = hex.EncodeToString(body)
			}
			if len(bodyString) > 1024 {
				bodyString = bodyString[:1021] + "..."
			}
			return ErrorResponse{
				Code:    resp.Status,
				Message: fmt.Sprintf("Failed to parse server response (%s): %s", err.Error(), bodyString),
			}
		}
	}
	return errResp
}

// executeGetRequest - instantiates a Get method and performs the request
func (client *MetricsClient) executeGetRequest(ctx context.Context, reqData metricsRequestData) (res *http.Response, err error) {
	req, err := client.newGetRequest(ctx, reqData)
	if err != nil {
		return nil, err
	}
	req.Header.Add("Authorization", "Bearer "+client.jwtToken)
	return client.httpClient.Do(req)
}

// newGetRequest - instantiate a new HTTP GET request
func (client *MetricsClient) newGetRequest(ctx context.Context, reqData metricsRequestData) (req *http.Request, err error) {
	targetURL, err := client.makeTargetURL(reqData)
	if err != nil {
		return nil, err
	}

	return http.NewRequestWithContext(ctx, http.MethodGet, targetURL.String(), nil)
}

// makeTargetURL make a new target url.
func (client *MetricsClient) makeTargetURL(r metricsRequestData) (*url.URL, error) {
	if client.endpointURL == nil {
		return nil, fmt.Errorf("enpointURL cannot be nil")
	}

	host := client.endpointURL.Host
	scheme := client.endpointURL.Scheme
	prefix := libraryMinioURLPrefix

	urlStr := scheme + "://" + host + prefix + r.relativePath
	return url.Parse(urlStr)
}

const (
	defaultPrometheusJWTExpiry = 100 * 365 * 24 * time.Hour
	libraryMinioURLPrefix      = "/minio"
	prometheusIssuer           = "prometheus"

	//metricsRespBodyLimit = 20 << 20 // 10 MiB
)

// getPrometheusToken creates a JWT from MinIO access and secret keys
func getPrometheusToken(accessKey, secretKey string) (string, error) {
	jwt := jwtgo.NewWithClaims(jwtgo.SigningMethodHS512, jwtgo.RegisteredClaims{
		ExpiresAt: jwtgo.NewNumericDate(time.Now().UTC().Add(defaultPrometheusJWTExpiry)),
		Subject:   accessKey,
		Issuer:    prometheusIssuer,
	})

	return jwt.SignedString([]byte(secretKey))
}

func privateNewMetricsClient(endpointURL *url.URL, jwtToken string, secure bool) (*MetricsClient, error) {
	clnt := new(MetricsClient)
	clnt.jwtToken = jwtToken
	clnt.secure = secure
	clnt.endpointURL = endpointURL
	clnt.httpClient = &http.Client{
		Transport: DefaultTransport(secure),
	}
	return clnt, nil
}

// getEndpointURL - construct a new endpoint.
func getEndpointURL(endpoint string, secure bool) (*url.URL, error) {
	if strings.Contains(endpoint, ":") {
		host, _, err := net.SplitHostPort(endpoint)
		if err != nil {
			return nil, err
		}
		if !s3utils.IsValidIP(host) && !s3utils.IsValidDomain(host) {
			msg := "Endpoint: " + endpoint + " does not follow ip address or domain name standards."
			return nil, ErrInvalidArgument(msg)
		}
	} else {
		if !s3utils.IsValidIP(endpoint) && !s3utils.IsValidDomain(endpoint) {
			msg := "Endpoint: " + endpoint + " does not follow ip address or domain name standards."
			return nil, ErrInvalidArgument(msg)
		}
	}

	// If secure is false, use 'http' scheme.
	scheme := "https"
	if !secure {
		scheme = "http"
	}

	// Strip the obvious :443 and :80 from the endpoint
	// to avoid the signature mismatch error.
	if secure && strings.HasSuffix(endpoint, ":443") {
		endpoint = strings.TrimSuffix(endpoint, ":443")
	}
	if !secure && strings.HasSuffix(endpoint, ":80") {
		endpoint = strings.TrimSuffix(endpoint, ":80")
	}

	// Construct a secured endpoint URL.
	endpointURLStr := scheme + "://" + endpoint
	endpointURL, err := url.Parse(endpointURLStr)
	if err != nil {
		return nil, err
	}

	// Validate incoming endpoint URL.
	return endpointURL, isValidEndpointURL(endpointURL.String())
}

// Verify if input endpoint URL is valid.
func isValidEndpointURL(endpointURL string) error {
	if endpointURL == "" {
		return ErrInvalidArgument("Endpoint url cannot be empty.")
	}
	url, err := url.Parse(endpointURL)
	if err != nil {
		return ErrInvalidArgument("Endpoint url cannot be parsed.")
	}
	if url.Path != "/" && url.Path != "" {
		return ErrInvalidArgument("Endpoint url cannot have fully qualified paths.")
	}
	return nil
}

// DefaultTransport - this default transport is similar to
// http.DefaultTransport but with additional param  DisableCompression
// is set to true to avoid decompressing content with 'gzip' encoding.
var DefaultTransport = func(secure bool) http.RoundTripper {
	tr := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:       5 * time.Second,
			KeepAlive:     15 * time.Second,
			FallbackDelay: 100 * time.Millisecond,
		}).DialContext,
		MaxIdleConns:          1024,
		MaxIdleConnsPerHost:   1024,
		ResponseHeaderTimeout: 60 * time.Second,
		IdleConnTimeout:       60 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
		// Set this value so that the underlying transport round-tripper
		// doesn't try to auto decode the body of objects with
		// content-encoding set to `gzip`.
		//
		// Refer:
		//    https://golang.org/src/net/http/transport.go?h=roundTrip#L1843
		DisableCompression: true,
	}

	if secure {
		tr.TLSClientConfig = &tls.Config{
			// Can't use SSLv3 because of POODLE and BEAST
			// Can't use TLSv1.0 because of POODLE and BEAST using CBC cipher
			// Can't use TLSv1.1 because of RC4 cipher usage
			MinVersion: tls.VersionTLS12,
		}
	}
	return tr
}

// ErrInvalidArgument - Invalid argument response.
func ErrInvalidArgument(message string) error {
	return ErrorResponse{
		Code:      "InvalidArgument",
		Message:   message,
		RequestID: "minio",
	}
}

// ErrorResponse - Is the typed error returned by all API operations.
type ErrorResponse struct {
	XMLName    xml.Name `xml:"Error" json:"-"`
	Code       string
	Message    string
	BucketName string
	Key        string
	RequestID  string `xml:"RequestId"`
	HostID     string `xml:"HostId"`

	// Region where the bucket is located. This header is returned
	// only in HEAD bucket and ListObjects response.
	Region string
}

// Error - Returns HTTP error string
func (e ErrorResponse) Error() string {
	return e.Message
}
