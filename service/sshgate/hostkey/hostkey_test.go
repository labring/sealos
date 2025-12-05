package hostkey_test

import (
	"strings"
	"testing"

	"github.com/labring/sealos/service/sshgate/hostkey"
	"golang.org/x/crypto/ssh"
)

func TestGenerateDeterministicKey(t *testing.T) {
	seed := "test-seed-123"

	// Generate key twice with same seed
	signer1, err := hostkey.GenerateDeterministicKey(seed)
	if err != nil {
		t.Fatalf("Failed to generate key: %v", err)
	}

	signer2, err := hostkey.GenerateDeterministicKey(seed)
	if err != nil {
		t.Fatalf("Failed to generate key: %v", err)
	}

	// Keys should be identical
	fp1 := ssh.FingerprintSHA256(signer1.PublicKey())
	fp2 := ssh.FingerprintSHA256(signer2.PublicKey())

	if fp1 != fp2 {
		t.Errorf("Fingerprints don't match: %s != %s", fp1, fp2)
	}

	// Verify fingerprint format
	if !strings.HasPrefix(fp1, "SHA256:") {
		t.Errorf("Fingerprint doesn't start with SHA256:, got %s", fp1)
	}
}

func TestGenerateDeterministicKeyDifferentSeeds(t *testing.T) {
	signer1, err := hostkey.GenerateDeterministicKey("seed1")
	if err != nil {
		t.Fatalf("Failed to generate key: %v", err)
	}

	signer2, err := hostkey.GenerateDeterministicKey("seed2")
	if err != nil {
		t.Fatalf("Failed to generate key: %v", err)
	}

	fp1 := ssh.FingerprintSHA256(signer1.PublicKey())
	fp2 := ssh.FingerprintSHA256(signer2.PublicKey())

	if fp1 == fp2 {
		t.Error("Different seeds produced same fingerprint")
	}
}

func TestLoad(t *testing.T) {
	// Test with custom seed
	seed := "test-seed"

	signer, err := hostkey.Load(seed)
	if err != nil {
		t.Fatalf("Load() failed: %v", err)
	}

	if signer == nil {
		t.Fatal("Load() returned nil signer")
	}

	// Verify it's a valid key
	fp := ssh.FingerprintSHA256(signer.PublicKey())
	if !strings.HasPrefix(fp, "SHA256:") {
		t.Errorf("Invalid fingerprint format: %s", fp)
	}
}

func TestLoadDefaultSeed(t *testing.T) {
	// Test with default seed
	seed := "sealos-devbox"

	signer1, err := hostkey.Load(seed)
	if err != nil {
		t.Fatalf("Load() failed: %v", err)
	}

	// Load again to verify consistency
	signer2, err := hostkey.Load(seed)
	if err != nil {
		t.Fatalf("Load() failed: %v", err)
	}

	fp1 := ssh.FingerprintSHA256(signer1.PublicKey())
	fp2 := ssh.FingerprintSHA256(signer2.PublicKey())

	if fp1 != fp2 {
		t.Errorf("Default seed produced different keys: %s != %s", fp1, fp2)
	}
}

func TestGetFingerprint(t *testing.T) {
	signer, err := hostkey.GenerateDeterministicKey("test")
	if err != nil {
		t.Fatalf("Failed to generate key: %v", err)
	}

	fp := hostkey.GetFingerprint(signer)
	if !strings.HasPrefix(fp, "SHA256:") {
		t.Errorf("GetFingerprint() returned invalid format: %s", fp)
	}

	// Verify it matches the expected fingerprint
	expected := ssh.FingerprintSHA256(signer.PublicKey())
	if fp != expected {
		t.Errorf("GetFingerprint() = %s, want %s", fp, expected)
	}
}

func TestKeyType(t *testing.T) {
	signer, err := hostkey.GenerateDeterministicKey("test")
	if err != nil {
		t.Fatalf("Failed to generate key: %v", err)
	}

	// Verify it's an ed25519 key
	pubKey := signer.PublicKey()
	if pubKey.Type() != "ssh-ed25519" {
		t.Errorf("Key type = %s, want ssh-ed25519", pubKey.Type())
	}
}
