# Sealed Transport Cryptographic Profile Gate

## Status

`sealed-v1` remains **disabled**. The current enrollment identifier, `x25519-xsalsa20poly1305`, is limited to validating and lifecycle-managing an X25519-compatible device public key. It is not an enabled message-encryption profile, a negotiated session format, or a claim of RFC 9180 conformance.

No controller, request, response, or client transport behavior may depend on a cryptographic profile until every acceptance condition in this document has passed in CI and security review.

## Candidate profile for evaluation only

The sole candidate to evaluate before implementing a session negotiation endpoint is the standards-defined HPKE ciphersuite:

| Element | Candidate | Reason for evaluation |
| --- | --- | --- |
| KEM | `DHKEM(X25519, HKDF-SHA256)` | Matches the intended X25519 key lifecycle and is specified by RFC 9180. |
| KDF | `HKDF-SHA256` | Required by the selected DHKEM and available in both target ecosystems. |
| AEAD | `ChaCha20-Poly1305` | Standard RFC 9180 AEAD option with associated-data support. |
| Protocol identifier if accepted | `hpke-v1-x25519-hkdf-sha256-chacha20poly1305` | Must not appear in a production capability response before cross-runtime acceptance. |

HPKE supports associated data, which is required to bind each message to the version, direction, method, canonical path, session identifier, sequence, selected key identifier, and response status. The existing `crypto_box` family is not used as a shortcut for this contract: it is a different construction and must not be labelled HPKE.

## Required implementation evidence

| Gate | Required evidence | Failure behavior |
| --- | --- | --- |
| Standards vectors | PHP and Rust independently open the same RFC 9180 known-answer vectors for the selected ciphersuite. | Block the dependency and profile decision. |
| Cross-runtime vectors | PHP-sealed values open in Rust and Rust-sealed values open in PHP, in both transport directions. | Block negotiation and envelope middleware. |
| AAD binding | Changing any bound metadata, including method, canonical path, direction, sequence, session or response status, makes opening fail. | Fail closed without controller execution. |
| Key handling | Long-lived device and server private material stays outside database records, TypeScript, browser storage, telemetry and logs. | Block implementation. |
| Session lifecycle | Session contexts are short-lived, directional, replay-protected and invalidated on device/server-key revocation or expiry. | Block activation. |
| Dependency review | Exact package versions, licenses, advisories, enabled features and maintenance status are reviewed and pinned. | No production dependency change. |
| Regression safety | Disabled-mode API behavior remains byte-for-byte compatible for unsealed clients. | Revert the increment. |

## Library evaluation boundary

The PHP candidate is `paragonie/hpke`, whose documented API exposes RFC 9180 ciphersuites and sender/receiver contexts. The Rust candidate is `hpke` from `rozbb/rust-hpke`, which documents the selected X25519, HKDF-SHA256 and ChaCha20-Poly1305 components. The Rust project explicitly states that it has not had a paid formal audit; this is a review input, not an approval.

Neither library is added by this document. The currently published PHP candidate release also declares runtime requirements beyond the existing Sodium extension, including GMP, OpenSSL and ECC-related packages; this must be validated against every supported server runtime before any dependency change. A separate dependency commit must include locked versions, minimal features, reproducible vectors and the full test results before it can be considered for merge.

## References

1. RFC 9180, *Hybrid Public Key Encryption*: <https://www.rfc-editor.org/rfc/rfc9180.html>
2. Libsodium, *Authenticated encryption*: <https://libsodium.gitbook.io/doc/public-key_cryptography/authenticated_encryption>
3. Paragon Initiative Enterprises, *HPKE for PHP*: <https://github.com/paragonie/hpke-php>
4. rozbb, *rust-hpke*: <https://github.com/rozbb/rust-hpke>
5. Rust `hpke` API documentation: <https://docs.rs/hpke/latest/hpke/>
