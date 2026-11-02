# Security Policy

## Supported Versions

Only the latest release and current minor version branch of Emris AI Desktop App receive security patches.

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | :white_check_mark: |
| < 1.2.0 | :x:                |

## Reporting a Vulnerability

We prioritize the security of Emris AI Desktop App and its users. If you discover a security vulnerability, we appreciate your help in disclosing it responsibly.

### How to Report

1. **Private Vulnerability Reporting (Preferred)**:
   - Navigate to the [Security Advisories tab](https://github.com/RahmatillaXudoyberdiyev/Emris-AI-desktop/security/advisories) on GitHub.
   - Click **"Report a vulnerability"** to open an advisory draft.
   - This keeps details confidential between you and the maintainer until a fix is published.

2. **What to Include**:
   - A detailed description of the vulnerability.
   - Affected version(s) and operating system (Windows 10/11, WebView2 runtime).
   - Clear steps to reproduce the issue or a minimal Proof of Concept (PoC).
   - Potential impact if exploited (e.g., local command execution, directory traversal, credential disclosure).

### What NOT to Do

- **Do NOT open a public GitHub Issue or public discussion** for suspected or confirmed security vulnerabilities before a patch is released.
- Do not attempt unauthorized access to external systems or services.

## Scope & Security Architecture

Emris AI Desktop App executes Python workflows and local commands in a desktop environment. Security features include:
- **Local Virtual Environment Isolation**: Workflows target `.venv` barriers rather than system-wide Python.
- **Terminal Approval Gates**: Shell commands require explicit user verification and approval.
- **Local Credential Storage**: API credentials and secrets are kept locally in secure app data (`%APPDATA%\EmrisAI`) and excluded from source control.

## Response Timeline

- **Initial Response**: Within 48 hours of receipt.
- **Assessment & Status Update**: Within 5 business days.
- **Remediation & Advisory Release**: Patches will be prioritized and published in a security update release.
