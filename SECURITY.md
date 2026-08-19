# Security Notes

## Credential rotation

The original repository history contained a hardcoded administrator password in `backend/src/utils/seed.js` and the README. The productionized source removes that credential, but deleting it from the current working tree does not remove it from Git history.

If this repository has ever been pushed to a shared or public remote, rotate any credentials that were ever used with that password immediately. Do the same for any real database, SMTP, JWT, or API credentials that may have existed in local or historical files.

For a repository that must be treated as clean from a secret-scanning perspective, rewrite/remove the affected Git history using an approved repository-history procedure and force-push only with explicit team approval.

## Production limitations

This project is not certified for real-world banking use. A production deployment requires organization-specific security architecture, threat modeling, penetration testing, secret/key management, monitoring, backup/recovery, fraud controls, AML/KYC controls, privacy controls, regulatory review, and operational approval.
