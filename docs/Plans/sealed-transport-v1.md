# Sealed Transport v1

## Purpose

`sealed-v1` is an application-layer envelope for ACCORE API JSON messages. It is designed to protect the complete JSON payload, including the names of JSON properties, after the request has entered an HTTPS connection. It is **not** a replacement for TLS 1.3, certificate validation, or authorization. TLS remains mandatory for every API endpoint; the envelope limits what an intermediary that can observe or terminate a normal HTTP flow can read from the JSON body.

The envelope does not conceal HTTP method, URL path, timing, response size, source address, or the small routing metadata required to select and validate a session. Hiding paths would require a separate gateway-dispatch protocol and is explicitly outside `sealed-v1` because it would bypass Laravel's normal routing, middleware, rate limiting, and authorization model.

## Security boundary

The implementation protects a verified client and server against body observation, tampering, cross-endpoint forwarding, replay, and stale-key use. It does not protect a device already compromised at the application level, a malicious server, traffic metadata analysis, or plaintext that an authorized controller has already processed. Device private keys must never appear in TypeScript, local storage, API responses, logs, telemetry, database columns, or error messages.

## Primitives and implementation rule

The implementation must use established libraries rather than a handwritten cipher or key derivation. The preferred profile is a mutually tested X25519 key agreement or RFC 9180 HPKE implementation with HKDF-SHA-256 and an AEAD approved by all three runtimes. The selected libraries must expose a stable encoding and have PHP↔Rust vectors before this profile is enabled. The project must not claim RFC 9180 conformance unless the chosen library implements the RFC profile exactly.

Every payload AEAD operation uses a new nonce. A session derives independent `client_to_server` and `server_to_client` keys. The server accepts each incoming sequence number once, and response sequence numbers are monotonic. Session material has a short lifetime and is never a substitute for the long-lived device key lifecycle.

## Key roles

| Role | Algorithm purpose | Location | Lifecycle |
|---|---|---|---|
| Server transport key | Establishes encrypted sessions | Server secret manager or operating-system protected store | Active, retiring, revoked; identified by `server_kid` |
| Server signing key | Authenticates negotiated policy where application-layer signature is required | Server secret manager or operating-system protected store | Separate from transport key |
| Device encryption key | Enables a registered client to establish a session | Tauri Rust command plus Stronghold/OS keyring | Bound to device, user-session association, tenant and `device_kid` |
| Device signing key | Proves possession at registration and session negotiation | Tauri Rust command plus Stronghold/OS keyring | Bound to the same device lifecycle |
| Session keys | Encrypt a directional API flow | Protected server session store and client process memory | Short-lived; expired and destroyed |

The database stores public keys, fingerprints, algorithm identifiers, key identifiers, states, validity windows, revocation data and audit records. It must not store unwrapped device private keys or server private keys. If a multi-worker server needs persisted session material, that material must be encrypted using an independent platform-managed wrapping key and expire rapidly.

## Enrollment and session negotiation

The existing `/v1/desktop` bootstrap and enrollment flow remains TLS protected and certificate-bound. Client enrollment is extended in a backward-compatible version to publish actual device encryption and signing public keys, not an arbitrary fingerprint. Existing devices remain eligible for the legacy policy until the client updater moves them to a release that supports `sealed-v1`.

A short-lived session negotiation endpoint uses device credentials, the registered device signing key, a fresh client ephemeral agreement key, timestamp, nonce, protocol version and the current server key identifier. The server verifies the device, key state, expiry, signature and anti-replay nonce; it then returns a session identifier, expiry, selected server key identifier and the material needed by the agreed library to derive two directional session keys. The client verifies the server through TLS certificate pinning and the configured server identity before accepting the session.

## Envelope

The network body is JSON only in the following shape. All original request or response fields live inside `ct` and are therefore unavailable to a body observer.

```json
{
  "v": "sealed-v1",
  "sid": "session identifier",
  "kid": "active server or device key identifier",
  "seq": 42,
  "nonce": "base64url nonce",
  "ct": "base64url authenticated ciphertext"
}
```

The authenticated additional data is a canonical binary serialization of: protocol version, message direction, HTTP method, canonical path, session identifier, sequence number, selected key identifier, and response status when applicable. A response can never be opened as a request, and a request for one path cannot be replayed successfully on another path.

## Laravel normalization

A transport middleware first recognizes a `sealed-v1` content type and checks envelope limits. After the session and device binding are validated, it opens the message, parses JSON with strict depth and size limits, and replaces only the request input body before the controller and Form Request execute. Authorization, policies, validation rules and controllers continue to receive their normal request shapes.

The response half of the middleware wraps JSON responses for an accepted sealed request. It does not wrap file streams, multipart uploads, binary downloads, health checks, desktop bootstrap or the negotiation errors required for recovery. Each exception must be declared in an endpoint coverage manifest with an owner and a test.

## Rollout without manual download

A legacy client cannot encrypt data before it contains the necessary implementation. The no-manual-download requirement is met by the current authenticated desktop updater: the server first operates in `observe`, then `prefer-sealed`, and only after automatic client updates reach the required version moves selected tenants or devices to `require-sealed`. The server always keeps TLS, certificate binding and rate limiting active. A temporary legacy window is explicit, time-bounded, audited and cannot silently become permanent.

## Test contract

CI must validate shared PHP↔Rust vectors and the envelope parser; malformed base64url, altered AAD, nonce reuse, replay, wrong direction, wrong path, expired session, retired key, revoked key and oversized message must fail closed. A route manifest test must enumerate all `/v2` routes and require either a sealed-contract test or a documented exception. Tests must exercise normal JSON, validation errors, authorization errors, throttling responses, file policies and device/key rotation.

## References

RFC 9180, *Hybrid Public Key Encryption*, describes a standardized hybrid public-key construction and its use of KEM, KDF and AEAD: https://www.rfc-editor.org/rfc/rfc9180.html

NIST SP 800-57 Part 1 Rev.5 provides key management guidance, including protection and lifecycle concerns for cryptographic keys: https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final

OWASP's TLS Cheat Sheet requires strong TLS as the transport foundation and explains that application protection must not weaken it: https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html
