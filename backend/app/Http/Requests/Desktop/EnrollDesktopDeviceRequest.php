<?php

namespace App\Http\Requests\Desktop;

use Illuminate\Foundation\Http\FormRequest;

class EnrollDesktopDeviceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'server_id' => ['required', 'string', 'max:128'],
            'device_id' => ['required', 'uuid'],
            'display_name' => ['required', 'string', 'min:1', 'max:120'],
            'platform' => ['required', 'in:linux,macos,windows'],
            'client_version' => ['required', 'string', 'regex:/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/', 'max:64'],
            'public_key_fingerprint' => ['required', 'string', 'regex:/^[a-fA-F0-9]{64}$/'],
            'transport_key_id' => ['nullable', 'required_with:transport_public_key,transport_key_algorithm', 'string', 'regex:/^[A-Za-z0-9][A-Za-z0-9._-]{7,95}$/'],
            'transport_key_algorithm' => ['nullable', 'required_with:transport_public_key,transport_key_id', 'in:x25519-xsalsa20poly1305'],
            'transport_public_key' => ['nullable', 'required_with:transport_key_id,transport_key_algorithm', 'string', 'regex:/^[A-Za-z0-9_-]{43}$/'],
            'certificate_fingerprint' => ['nullable', 'string', 'regex:/^[a-fA-F0-9]{64}$/'],
            'enrollment_evidence' => ['required', 'string', 'min:64', 'max:128'],
        ];
    }
}
