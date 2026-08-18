package utils

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt"
	"github.com/google/uuid"
)

type JWTManager struct {
	secretKey     []byte
	tokenDuration time.Duration
}

type UserClaims struct {
	jwt.StandardClaims `json:",inline"`
	JwtUser            `json:",inline"`
}

type JwtUser struct {
	Requester    string    `json:"requester,omitempty"`
	UserUID      uuid.UUID `json:"userUid,omitempty"`
	UserCrUID    string    `json:"userCrUid,omitempty"`
	UserCrName   string    `json:"userCrName,omitempty"`
	RegionUID    string    `json:"regionUid,omitempty"`
	UserID       string    `json:"userId,omitempty"`
	WorkspaceID  string    `json:"workspaceId,omitempty"`
	WorkspaceUID string    `json:"workspaceUid,omitempty"`
}

const (
	AdminJWTRequester = "sealos-admin"
	AdminJWTIssuer    = "sealos-admin"
	AdminJWTAudience  = "sealos-account-admin"
)

func NewJWTManager(secretKey string, tokenDuration time.Duration) *JWTManager {
	return &JWTManager{[]byte(secretKey), tokenDuration}
}

func (manager *JWTManager) GenerateToken(user JwtUser) (string, error) {
	claims := UserClaims{
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Add(manager.tokenDuration).Unix(),
		},
		JwtUser: user,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(manager.secretKey)
}

func (manager *JWTManager) VerifyToken(tokenString string) (*UserClaims, error) {
	token, err := jwt.ParseWithClaims(
		tokenString,
		&UserClaims{},
		func(token *jwt.Token) (any, error) {
			_, ok := token.Method.(*jwt.SigningMethodHMAC)
			if !ok {
				return nil, errors.New("unexpected token signing method")
			}

			return manager.secretKey, nil
		},
	)
	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	claims, ok := token.Claims.(*UserClaims)
	if !ok {
		return nil, errors.New("invalid token claims")
	}

	return claims, nil
}

func (manager *JWTManager) ParseUser(token string) (*JwtUser, error) {
	claims, err := manager.VerifyToken(token)
	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}
	return &claims.JwtUser, nil
}

func (manager *JWTManager) GenerateAdminToken(user JwtUser) (string, error) {
	now := time.Now()
	claims := UserClaims{
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: now.Add(manager.tokenDuration).Unix(),
			IssuedAt:  now.Unix(),
			Issuer:    AdminJWTIssuer,
			Audience:  AdminJWTAudience,
		},
		JwtUser: user,
	}
	claims.JwtUser.Requester = AdminJWTRequester

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(manager.secretKey)
}

func (manager *JWTManager) VerifyAdminToken(tokenString string) (*UserClaims, error) {
	token, err := jwt.ParseWithClaims(
		tokenString,
		&UserClaims{},
		func(token *jwt.Token) (any, error) {
			if token.Method == nil || token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
				return nil, errors.New("unexpected token signing method")
			}

			return manager.secretKey, nil
		},
	)
	if err != nil {
		return nil, fmt.Errorf("invalid admin token: %w", err)
	}

	claims, ok := token.Claims.(*UserClaims)
	if !ok {
		return nil, errors.New("invalid admin token claims")
	}
	if !claims.VerifyExpiresAt(time.Now().Unix(), true) {
		return nil, errors.New("admin token expiration is required")
	}
	if !claims.VerifyIssuer(AdminJWTIssuer, true) {
		return nil, errors.New("invalid admin token issuer")
	}
	if !claims.VerifyAudience(AdminJWTAudience, true) {
		return nil, errors.New("invalid admin token audience")
	}
	if claims.JwtUser.Requester != AdminJWTRequester {
		return nil, errors.New("user is not admin")
	}

	return claims, nil
}

func (manager *JWTManager) ParseAdminUser(token string) (*JwtUser, error) {
	claims, err := manager.VerifyAdminToken(token)
	if err != nil {
		return nil, err
	}
	return &claims.JwtUser, nil
}
