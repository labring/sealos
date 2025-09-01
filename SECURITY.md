# Security Policy

We sincerely thank security researchers and users for helping to keep the Sealos project and its community safe. Your contributions to identifying and responsibly disclosing security vulnerabilities are invaluable to maintaining the security and integrity of our platform.

## Supported Versions

The following table shows which versions of Sealos are currently supported with security updates:

| Sealos Version | Version Range | Supported |
| -------------- | ------------- | --------- |
| 5.x | >= 5.0.0 | ✅ Yes |
| 4.x | >= 4.0.0, < 5.0.0 | ⚠️ Best-effort |
| 3.x and older | < 4.0.0 | ❌ No |

## Reporting a Vulnerability

We take security vulnerabilities seriously and appreciate your help in responsibly disclosing them. Please follow these steps to report a security vulnerability:

### Preferred Method

**Please do NOT create a public GitHub Issue for security vulnerabilities.** Instead, please report security vulnerabilities privately using one of the following methods:

1. **Email**: Send a detailed report to [security@sealos.io](mailto:security@sealos.io)
2. **GitHub Security Advisory**: Use GitHub's "Privately report a security vulnerability" feature on the repository's "Security" tab

### What to Include

When reporting a vulnerability, please include the following information:

- **Clear description**: A detailed description of the vulnerability
- **Steps to reproduce**: Step-by-step instructions to reproduce the issue
- **Affected versions**: Which versions of Sealos are affected
- **Potential impact**: Assessment of the potential security impact
- **Environment details**: Operating system, Kubernetes version, and other relevant environment information
- **Proof of concept**: If applicable, include a proof of concept (but please be responsible)
- **Suggested fix**: If you have ideas for a fix, please share them (optional but appreciated)

## What to Expect After Reporting

### Response Time

- **Initial acknowledgment**: We will acknowledge receipt of your report within **48 hours**
- **Status updates**: We will provide regular updates on the progress of our investigation

### Process Outline

1. **Triage**: Our security team will review and triage your report
2. **Investigation**: We will investigate the vulnerability and assess its impact
3. **Fix development**: We will work on developing and testing a fix
4. **Timeline**: We aim to address critical vulnerabilities within **14 days** of confirmation
5. **Coordination**: We will keep you informed throughout the process and coordinate on disclosure timing

### Post-Fix Disclosure

After a fix has been developed, tested, and released:

- **Credit**: We will give you appropriate credit for the discovery (unless you prefer to remain anonymous)
- **Public disclosure**: We will issue a public security advisory through GitHub Security Advisories (GHSA)
- **User notification**: Users will be notified through our standard communication channels
- **Disclosure timing**: We follow responsible disclosure practices, typically allowing 90 days for users to update before full public disclosure

## Vulnerability Management Philosophy

We treat security vulnerabilities as our highest priority. Our approach to security includes:

- **Proactive security**: We continuously work to improve the security of Sealos
- **Responsible disclosure**: We believe in coordinated disclosure that protects users while giving credit to researchers
- **Community collaboration**: We work closely with the security research community
- **Transparency**: We strive to be transparent about security issues while protecting users during the remediation process

## Security Updates

Users will be notified of security updates through the following channels:

- **GitHub Releases**: Security fixes will be clearly marked in release notes with a `[SECURITY]` prefix
- **GitHub Security Advisories (GHSA)**: Critical security vulnerabilities will be published as GitHub Security Advisories
- **Project Documentation**: Security updates will be documented in our official documentation
- **Community Channels**: Important security updates may be announced through our official community channels

## Additional Resources

- [Contributing Guidelines](CONTRIBUTING.md#reporting-security-issues)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Sealos Documentation](https://docs.sealos.io)

---

For any questions about this security policy, please contact us at [security@sealos.io](mailto:security@sealos.io).