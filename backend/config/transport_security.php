<?php

return [
    /*
     * `disabled` keeps existing wire contracts unchanged.
     * `observe` accepts ordinary traffic and reports clients advertising a
     * sealed capability. `prefer-sealed` enables compatible registered
     * devices. `require-sealed` is allowed only after acceptance tests and a
     * managed client-update rollout have completed.
     */
    'mode' => env('ACCORE_TRANSPORT_SECURITY_MODE', 'disabled'),

    'protocol' => 'sealed-v1',

    /*
     * The selected implementation profile is deliberately explicit. Private
     * key material is resolved outside this configuration and must never be
     * set through a public API response or a database field.
     */
    'key_algorithm' => env('ACCORE_TRANSPORT_KEY_ALGORITHM', 'x25519-xsalsa20poly1305'),
    'server_key_reference' => env('ACCORE_TRANSPORT_SERVER_KEY_REFERENCE'),
    'session_ttl_seconds' => (int) env('ACCORE_TRANSPORT_SESSION_TTL_SECONDS', 900),
    'replay_ttl_seconds' => (int) env('ACCORE_TRANSPORT_REPLAY_TTL_SECONDS', 900),
    'maximum_envelope_bytes' => (int) env('ACCORE_TRANSPORT_MAX_ENVELOPE_BYTES', 1_048_576),

    /*
     * These routes intentionally remain outside the sealed body contract.
     * Each exception must be covered by the endpoint inventory gate before a
     * mode stronger than `observe` is used.
     */
    'plaintext_route_exceptions' => [
        'up',
        'v1/desktop/bootstrap',
        'v1/desktop/enroll',
        'v1/desktop/policy',
        'v2/transport/negotiate',
    ],
];
