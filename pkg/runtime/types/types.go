package types

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type Token struct {
	JoinToken                string       `json:"joinToken,omitempty"`
	DiscoveryTokenCaCertHash []string     `json:"discoveryTokenCaCertHash,omitempty"`
	CertificateKey           string       `json:"certificateKey,omitempty"`
	Expires                  *metav1.Time `json:"expires,omitempty"`
}
