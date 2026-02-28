<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ComplianceProfile;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ComplianceProfileController extends Controller
{
    use BaseApiController;

    /**
     * List all compliance profiles (optionally filtered by authority/policy).
     */
    public function index(Request $request): JsonResponse
    {
        $query = ComplianceProfile::with('taxAuthority');

        if ($request->has('tax_authority_id')) {
            $query->forAuthority($request->input('tax_authority_id'));
        }

        if ($request->has('policy_type')) {
            $query->where('policy_type', $request->input('policy_type'));
        }

        if ($request->boolean('active_only')) {
            $query->active();
        }

        $profiles = $query->orderBy('created_at', 'desc')->get();

        return $this->successResponse(['profiles' => $profiles]);
    }

    /**
     * Show a single compliance profile.
     */
    public function show($id): JsonResponse
    {
        $profile = ComplianceProfile::with('taxAuthority')->findOrFail($id);

        return $this->successResponse(['profile' => $profile]);
    }

    /**
     * Create a new compliance profile.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tax_authority_id'    => 'required|exists:tax_authorities,id',
            'name'                => 'required|string|max:150',
            'code'                => 'required|string|max:40|unique:compliance_profiles,code',
            'policy_type'         => 'required|in:push,pull',
            'transmission_format' => 'required|in:json,xml,yml,excel',
            'key_mapping'         => 'nullable|array',
            'structure_template'  => 'nullable|string',
            // Push fields
            'endpoint_url'        => 'nullable|required_if:policy_type,push|url',
            'auth_type'           => 'nullable|string|in:none,bearer,basic,oauth2,api_key',
            'auth_credentials'    => 'nullable|string',
            'request_headers'     => 'nullable|array',
            'http_method'         => 'nullable|string|in:POST,PUT,PATCH',
            'openapi_spec'        => 'nullable|array',
            // Pull fields
            'allowed_ips'         => 'nullable|array',
            'pull_endpoint_path'  => 'nullable|string|max:100',
            // Common
            'is_active'           => 'boolean',
            'notes'               => 'nullable|string',
        ]);

        $profile = ComplianceProfile::create($data);

        // Auto-generate token for pull profiles
        $rawToken = null;
        if ($profile->isPull()) {
            $rawToken = $profile->generateAccessToken();
        }

        $response = ['profile' => $profile->load('taxAuthority')];

        // Return the raw token on first creation (only time it's fully visible)
        if ($rawToken) {
            $response['access_token'] = $rawToken;
        }

        return $this->successResponse($response, 'Compliance profile created successfully.');
    }

    /**
     * Update an existing compliance profile.
     * Note: `code` is immutable after creation.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $profile = ComplianceProfile::findOrFail($id);

        $data = $request->validate([
            'name'                => 'string|max:150',
            'policy_type'         => 'in:push,pull',
            'transmission_format' => 'in:json,xml,yml,excel',
            'key_mapping'         => 'nullable|array',
            'structure_template'  => 'nullable|string',
            // Push fields
            'endpoint_url'        => 'nullable|url',
            'auth_type'           => 'nullable|string|in:none,bearer,basic,oauth2,api_key',
            'auth_credentials'    => 'nullable|string',
            'request_headers'     => 'nullable|array',
            'http_method'         => 'nullable|string|in:POST,PUT,PATCH',
            'openapi_spec'        => 'nullable|array',
            // Pull fields
            'allowed_ips'         => 'nullable|array',
            'pull_endpoint_path'  => 'nullable|string|max:100',
            // Common
            'is_active'           => 'boolean',
            'notes'               => 'nullable|string',
        ]);

        // Prevent code mutation
        unset($data['code']);

        // If switching from pull → push, revoke any existing token
        if (isset($data['policy_type']) && $data['policy_type'] === 'push' && $profile->isPull()) {
            $profile->revokeToken();
        }

        $profile->update($data);

        // If switching from push → pull and no token exists, auto-generate
        if ($profile->isPull() && !$profile->access_token) {
            $profile->generateAccessToken();
        }

        return $this->successResponse(
            ['profile' => $profile->fresh()->load('taxAuthority')],
            'Compliance profile updated successfully.'
        );
    }

    /**
     * Delete a compliance profile.
     */
    public function destroy($id): JsonResponse
    {
        $profile = ComplianceProfile::findOrFail($id);
        $profile->delete();

        return $this->successResponse([], 'Compliance profile deleted successfully.');
    }

    /**
     * Generate (or regenerate) the access token for a pull-type profile.
     * Returns the raw token — this is the ONLY time it's visible in full.
     */
    public function generateToken(Request $request, $id): JsonResponse
    {
        $profile = ComplianceProfile::findOrFail($id);

        if (!$profile->isPull()) {
            return $this->errorResponse('Token generation is only available for pull-type profiles.', 422);
        }

        $data = $request->validate([
            'expires_in_days' => 'nullable|integer|min:1|max:3650',
        ]);

        $token = $profile->generateAccessToken($data['expires_in_days'] ?? 365);

        return $this->successResponse([
            'access_token'     => $token,
            'token_expires_at' => $profile->fresh()->token_expires_at,
            'pull_endpoint'    => $profile->pull_endpoint,
        ], 'Access token generated successfully.');
    }

    /**
     * Revoke the access token for a pull-type profile.
     */
    public function revokeToken($id): JsonResponse
    {
        $profile = ComplianceProfile::findOrFail($id);

        if (!$profile->isPull()) {
            return $this->errorResponse('Token revocation is only available for pull-type profiles.', 422);
        }

        $profile->revokeToken();

        return $this->successResponse([], 'Access token revoked successfully.');
    }

    /**
     * Get the available system keys that can be mapped.
     * Returns all keys from the tax engine that the user can use in their mapping.
     */
    public function getSystemKeys(): JsonResponse
    {
        $keys = [
            // Invoice keys
            ['key' => 'invoice_number',      'label' => 'رقم الفاتورة',        'type' => 'string',  'group' => 'invoice'],
            ['key' => 'invoice_date',        'label' => 'تاريخ الفاتورة',      'type' => 'date',    'group' => 'invoice'],
            ['key' => 'invoice_type',        'label' => 'نوع الفاتورة',        'type' => 'string',  'group' => 'invoice'],
            ['key' => 'subtotal',            'label' => 'المجموع الفرعي',       'type' => 'number',  'group' => 'invoice'],
            ['key' => 'total_tax',           'label' => 'إجمالي الضريبة',      'type' => 'number',  'group' => 'invoice'],
            ['key' => 'grand_total',         'label' => 'الإجمالي النهائي',     'type' => 'number',  'group' => 'invoice'],
            ['key' => 'discount_amount',     'label' => 'مبلغ الخصم',          'type' => 'number',  'group' => 'invoice'],
            ['key' => 'currency_code',       'label' => 'رمز العملة',           'type' => 'string',  'group' => 'invoice'],
            // Tax-specific keys
            ['key' => 'tax_type_code',       'label' => 'رمز نوع الضريبة',     'type' => 'string',  'group' => 'tax'],
            ['key' => 'tax_rate',            'label' => 'نسبة الضريبة',        'type' => 'number',  'group' => 'tax'],
            ['key' => 'taxable_amount',      'label' => 'المبلغ الخاضع',       'type' => 'number',  'group' => 'tax'],
            ['key' => 'tax_amount',          'label' => 'مبلغ الضريبة',        'type' => 'number',  'group' => 'tax'],
            ['key' => 'tax_authority_code',  'label' => 'رمز الجهة الضريبية',  'type' => 'string',  'group' => 'tax'],
            // Seller keys
            ['key' => 'seller_name',         'label' => 'اسم البائع',          'type' => 'string',  'group' => 'seller'],
            ['key' => 'seller_vat_number',   'label' => 'الرقم الضريبي للبائع', 'type' => 'string',  'group' => 'seller'],
            ['key' => 'seller_cr_number',    'label' => 'السجل التجاري للبائع', 'type' => 'string',  'group' => 'seller'],
            ['key' => 'seller_address',      'label' => 'عنوان البائع',        'type' => 'string',  'group' => 'seller'],
            // Buyer keys
            ['key' => 'buyer_name',          'label' => 'اسم المشتري',         'type' => 'string',  'group' => 'buyer'],
            ['key' => 'buyer_vat_number',    'label' => 'الرقم الضريبي للمشتري','type' => 'string',  'group' => 'buyer'],
            ['key' => 'buyer_address',       'label' => 'عنوان المشتري',       'type' => 'string',  'group' => 'buyer'],
            // Line item keys
            ['key' => 'item_name',           'label' => 'اسم الصنف',           'type' => 'string',  'group' => 'line_item'],
            ['key' => 'item_quantity',       'label' => 'الكمية',              'type' => 'number',  'group' => 'line_item'],
            ['key' => 'item_unit_price',     'label' => 'سعر الوحدة',          'type' => 'number',  'group' => 'line_item'],
            ['key' => 'item_total',          'label' => 'إجمالي الصنف',        'type' => 'number',  'group' => 'line_item'],
            ['key' => 'item_tax_amount',     'label' => 'ضريبة الصنف',         'type' => 'number',  'group' => 'line_item'],
            // Payment keys
            ['key' => 'payment_method',      'label' => 'طريقة الدفع',         'type' => 'string',  'group' => 'payment'],
            ['key' => 'payment_date',        'label' => 'تاريخ الدفع',         'type' => 'date',    'group' => 'payment'],
            ['key' => 'payment_reference',   'label' => 'مرجع الدفع',          'type' => 'string',  'group' => 'payment'],
        ];

        return $this->successResponse(['keys' => $keys]);
    }

    /**
     * Validate a structure template against its format.
     */
    public function validateStructure(Request $request): JsonResponse
    {
        $data = $request->validate([
            'format'    => 'required|in:json,xml,yml',
            'structure' => 'required|string',
        ]);

        $errors = [];

        switch ($data['format']) {
            case 'json':
                json_decode($data['structure']);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    $errors[] = 'JSON syntax error: ' . json_last_error_msg();
                }
                break;

            case 'xml':
                libxml_use_internal_errors(true);
                simplexml_load_string($data['structure']);
                if (libxml_get_errors()) {
                    foreach (libxml_get_errors() as $error) {
                        $errors[] = "XML error line {$error->line}: " . trim($error->message);
                    }
                    libxml_clear_errors();
                }
                break;

            case 'yml':
                try {
                    if (function_exists('yaml_parse')) {
                        $result = yaml_parse($data['structure']);
                        if ($result === false) {
                            $errors[] = 'Invalid YAML syntax';
                        }
                    }
                    // Fallback: check for tabs (always invalid in YAML)
                    if (str_contains($data['structure'], "\t")) {
                        $errors[] = 'Tabs are not allowed in YAML — use spaces for indentation';
                    }
                } catch (\Exception $e) {
                    $errors[] = 'YAML parse error: ' . $e->getMessage();
                }
                break;
        }

        return $this->successResponse([
            'valid'  => empty($errors),
            'errors' => $errors,
        ]);
    }

    // ══════════════════════════════════════════
    // Pull Endpoint (External Access)
    // ══════════════════════════════════════════

    /**
     * Serve compliance data to an external entity via a pull endpoint.
     * This is called by the entity's system using their access token.
     *
     * Route: GET /api/compliance-pull/{code}/{path?}
     * Auth: Bearer token in Authorization header
     */
    public function servePullData(Request $request, string $code, string $path = 'compliance-data'): JsonResponse
    {
        // Extract bearer token
        $token = $request->bearerToken();
        if (!$token) {
            return response()->json([
                'error' => 'Access token required',
                'code'  => 'MISSING_TOKEN',
            ], 401);
        }

        // Find profile by token
        $profile = ComplianceProfile::findByToken($token);
        if (!$profile) {
            return response()->json([
                'error' => 'Invalid or expired access token',
                'code'  => 'INVALID_TOKEN',
            ], 401);
        }

        // Verify profile code matches
        if (strtoupper($profile->code) !== strtoupper($code)) {
            return response()->json([
                'error' => 'Profile code mismatch',
                'code'  => 'CODE_MISMATCH',
            ], 403);
        }

        // Verify IP whitelist
        if (!$profile->isIpAllowed($request->ip())) {
            return response()->json([
                'error' => 'IP address not allowed',
                'code'  => 'IP_BLOCKED',
            ], 403);
        }

        // TODO: Replace with actual data retrieval from the tax engine
        // For now, return a structured placeholder that respects the key mapping
        $sampleData = [
            'profile_code'   => $profile->code,
            'format'         => $profile->transmission_format,
            'generated_at'   => now()->toIso8601String(),
            'data'           => [],
            'message'        => 'Pull endpoint active. Connect to tax engine for live data.',
        ];

        return response()->json($sampleData)
            ->header('Content-Type', $profile->getContentType())
            ->header('X-Profile-Code', $profile->code)
            ->header('X-Generated-At', now()->toIso8601String());
    }
}
