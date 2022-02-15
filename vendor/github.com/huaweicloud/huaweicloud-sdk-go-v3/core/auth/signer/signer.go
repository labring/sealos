// HWS API Gateway Signature
// based on https://github.com/datastream/aws/blob/master/signv4.go
// Copyright (c) 2014, Xianjie
// License that can be found in the LICENSE file

package signer

import (
	"crypto/hmac"
	"crypto/sha256"
	"fmt"
	"net/url"
	"reflect"
	"sort"
	"strings"
	"time"

	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/request"
)

const (
	BasicDateFormat     = "20060102T150405Z"
	Algorithm           = "SDK-HMAC-SHA256"
	HeaderXDate         = "X-Sdk-Date"
	HeaderHost          = "host"
	HeaderAuthorization = "Authorization"
	HeaderContentSha256 = "X-Sdk-Content-Sha256"
)

func hmacsha256(key []byte, data string) ([]byte, error) {
	h := hmac.New(sha256.New, key)
	if _, err := h.Write([]byte(data)); err != nil {
		return nil, err
	}
	return h.Sum(nil), nil
}

func CanonicalRequest(r *request.DefaultHttpRequest, signedHeaders []string) (string, error) {
	var hexEncode string

	userHeaders := r.GetHeaderParams()
	if hex, ok := userHeaders[HeaderContentSha256]; ok {
		hexEncode = hex
	} else {
		buffer, err := r.GetBodyToBytes()
		if err != nil {
			return "", err
		}
		data := buffer.Bytes()

		hexEncode, err = HexEncodeSHA256Hash(data)
		if err != nil {
			return "", err
		}
	}

	return fmt.Sprintf("%s\n%s\n%s\n%s\n%s\n%s",
		r.GetMethod(),
		CanonicalURI(r),
		CanonicalQueryString(r),
		CanonicalHeaders(r, signedHeaders),
		strings.Join(signedHeaders, ";"), hexEncode), nil
}

// CanonicalURI returns request uri
func CanonicalURI(r *request.DefaultHttpRequest) string {
	pattens := strings.Split(r.GetPath(), "/")

	var uri []string
	for _, v := range pattens {
		uri = append(uri, escape(v))
	}

	urlPath := strings.Join(uri, "/")
	if len(urlPath) == 0 || urlPath[len(urlPath)-1] != '/' {
		urlPath = urlPath + "/"
	}

	return urlPath
}

// CanonicalQueryString
func CanonicalQueryString(r *request.DefaultHttpRequest) string {
	var query = make(map[string][]string, 0)
	for key, value := range r.GetQueryParams() {
		valueWithType := value.(reflect.Value)

		if valueWithType.Kind() == reflect.Slice {
			params := r.CanonicalSliceQueryParamsToMulti(valueWithType)
			for _, param := range params {
				if _, ok := query[key]; !ok {
					query[key] = make([]string, 0)
				}
				query[key] = append(query[key], param)
			}
		} else if valueWithType.Kind() == reflect.Map {
			params := r.CanonicalMapQueryParams(key, valueWithType)
			for _, param := range params {
				for k, v := range param {
					if _, ok := query[k]; !ok {
						query[k] = make([]string, 0)
					}
					query[k] = append(query[k], v)
				}
			}
		} else {
			if _, ok := query[key]; !ok {
				query[key] = make([]string, 0)
			}
			query[key] = append(query[key], r.CanonicalStringQueryParams(valueWithType))
		}
	}

	var keys []string
	for key := range query {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	var a []string
	for _, key := range keys {
		k := escape(key)
		sort.Strings(query[key])
		for _, v := range query[key] {
			kv := fmt.Sprintf("%s=%s", k, escape(v))
			a = append(a, kv)
		}
	}
	queryStr := strings.Join(a, "&")

	return queryStr
}

// CanonicalHeaders
func CanonicalHeaders(r *request.DefaultHttpRequest, signerHeaders []string) string {
	var a []string
	header := make(map[string][]string)
	userHeaders := r.GetHeaderParams()

	for k, v := range userHeaders {
		if _, ok := header[strings.ToLower(k)]; !ok {
			header[strings.ToLower(k)] = make([]string, 0)
		}
		header[strings.ToLower(k)] = append(header[strings.ToLower(k)], v)
	}

	for _, key := range signerHeaders {
		value := header[key]
		if strings.EqualFold(key, HeaderHost) {
			if u, err := url.Parse(r.GetEndpoint()); err == nil {
				header[HeaderHost] = []string{u.Host}
			}
		}

		sort.Strings(value)
		for _, v := range value {
			a = append(a, key+":"+strings.TrimSpace(v))
		}
	}

	return fmt.Sprintf("%s\n", strings.Join(a, "\n"))
}

// SignedHeaders
func SignedHeaders(headers map[string]string) []string {
	var signedHeaders []string
	for key := range headers {
		if strings.HasPrefix(strings.ToLower(key), "content-type") {
			continue
		}
		signedHeaders = append(signedHeaders, strings.ToLower(key))
	}
	sort.Strings(signedHeaders)

	return signedHeaders
}

// Create a "String to Sign".
func StringToSign(canonicalRequest string, t time.Time) (string, error) {
	hash := sha256.New()
	_, err := hash.Write([]byte(canonicalRequest))
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s\n%s\n%x",
		Algorithm, t.UTC().Format(BasicDateFormat), hash.Sum(nil)), nil
}

// Create the HWS Signature.
func SignStringToSign(stringToSign string, signingKey []byte) (string, error) {
	hm, err := hmacsha256(signingKey, stringToSign)
	return fmt.Sprintf("%x", hm), err
}

// HexEncodeSHA256Hash returns hexcode of sha256
func HexEncodeSHA256Hash(body []byte) (string, error) {
	hash := sha256.New()
	if body == nil {
		body = []byte("")
	}
	_, err := hash.Write(body)
	return fmt.Sprintf("%x", hash.Sum(nil)), err
}

// Get the finalized value for the "Authorization" header. The signature parameter is the output from SignStringToSign
func AuthHeaderValue(signature, accessKey string, signedHeaders []string) string {
	return fmt.Sprintf("%s Access=%s, SignedHeaders=%s, Signature=%s", Algorithm, accessKey, strings.Join(signedHeaders, ";"), signature)
}

// SignRequest set Authorization header
func Sign(r *request.DefaultHttpRequest, ak string, sk string) (map[string]string, error) {
	var err error
	var t time.Time
	var headerParams = make(map[string]string)

	userHeaders := r.GetHeaderParams()
	if date, ok := userHeaders[HeaderXDate]; ok {
		t, err = time.Parse(BasicDateFormat, date)
		if date == "" || err != nil {
			t = time.Now()
			userHeaders[HeaderXDate] = t.UTC().Format(BasicDateFormat)
			headerParams[HeaderXDate] = t.UTC().Format(BasicDateFormat)
		}
	} else {
		t = time.Now()
		userHeaders[HeaderXDate] = t.UTC().Format(BasicDateFormat)
		headerParams[HeaderXDate] = t.UTC().Format(BasicDateFormat)
	}

	signedHeaders := SignedHeaders(userHeaders)

	canonicalRequest, err := CanonicalRequest(r, signedHeaders)
	if err != nil {
		return nil, err
	}

	stringToSign, err := StringToSign(canonicalRequest, t)
	if err != nil {
		return nil, err
	}

	signature, err := SignStringToSign(stringToSign, []byte(sk))
	if err != nil {
		return nil, err
	}

	headerParams[HeaderAuthorization] = AuthHeaderValue(signature, ak, signedHeaders)
	return headerParams, nil
}
