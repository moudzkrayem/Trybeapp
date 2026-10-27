# Security Policy

## Supported Versions

We actively provide security updates for the following versions of Trybe:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of our community seriously. If you believe you have found a security vulnerability in Trybe, please report it to us responsibly.

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please send an email to **security@trybe.app**.

### What to Include
To help us resolve the issue faster, please include:
- A description of the vulnerability.
- Steps to reproduce the issue (proof-of-concept).
- The potential impact if exploited.
- Any suggested fix or mitigation.

## Our Process

1. **Acknowledgment**: We will acknowledge receipt of your report within 48 hours.
2. **Investigation**: We will investigate the report and determine the severity.
3. **Resolution**: If valid, we will work on a fix. We aim to resolve critical issues within 7 days.
4. **Disclosure**: Once fixed, we will coordinate a public disclosure if appropriate.

## Security Features & Commitments

Trybe is built with a "Security First" mindset using industry-standard tools:

- **Firebase Authentication**: We use secure, managed identity providers to handle user credentials.
- **Firestore Security Rules**: All data access is controlled by granular server-side rules that verify user identity and permissions before every read or write.
- **Data Encryption**: All data is encrypted in transit (SSL/TLS) and at rest within Google Cloud Infrastructure.
- **Input Validation**: We utilize `Zod` for strict schema validation on both the client and server (Genkit Flows).

## User Responsibilities

While we handle platform security, users are encouraged to:
- Use strong, unique passwords.
- Enable Multi-Factor Authentication (MFA) on their connected accounts (Google, etc.).
- Exercise judgment when meeting new people in person, as outlined in our [Important Notice](/settings).

---
*Thank you for helping keep the Trybe community safe.*
