<?php

namespace App\Http\Controllers\Api\V2\EnterpriseCore\OrganizationGovernance;

use App\Domains\EnterpriseCore\OrganizationGovernance\Services\ModuleSelectionService;
use App\Domains\EnterpriseCore\OrganizationGovernance\Services\OrganizationTemplateService;
use App\Http\Controllers\Api\V2\Shared\BaseApiController;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SetupStateController extends Controller
{
    use BaseApiController;

    public function __construct(
        private readonly ModuleSelectionService $modules,
        private readonly OrganizationTemplateService $templates,
    ) {
    }

    public function show(Request $request): JsonResponse
    {
        return $this->successResponse([
            'data' => $this->modules->state($request->user()?->id),
        ]);
    }

    public function organizationTemplates(): JsonResponse
    {
        return $this->successResponse([
            'data' => $this->templates->state(),
        ]);
    }

    public function saveOrganizationProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'template_key' => ['required', 'string', 'max:80'],
            'organization_size' => ['required', 'in:micro,small,medium,enterprise'],
            'company_name' => ['required', 'string', 'max:255'],
            'company_code' => ['required', 'string', 'max:20'],
            'country_code' => ['required', 'string', 'size:2'],
            'currency_id' => ['required', 'integer'],
            'primary_site_name' => ['nullable', 'string', 'max:255'],
            'primary_site_code' => ['nullable', 'string', 'max:20'],
            'factory_calendar_id' => ['nullable', 'integer'],
            'language' => ['nullable', 'in:ar-SA,en-US'],
        ]);

        return $this->successResponse([
            'data' => $this->templates->saveProfile($validated),
        ], 'Organization profile saved.');
    }

    public function applyOrganizationTemplate(Request $request): JsonResponse
    {
        $result = $this->templates->apply($request->user()?->id);

        return $this->successResponse([
            'data' => [
                'application' => $result,
                'state' => $this->modules->state($request->user()?->id),
            ],
        ], 'Organization template applied safely.');
    }

    public function selectModules(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'module_keys' => ['present', 'array'],
            'module_keys.*' => ['string', 'distinct'],
        ]);

        return $this->successResponse([
            'data' => $this->modules->select($validated['module_keys'], $request->user()?->id),
        ], 'Module selection saved.');
    }

    public function activateSelected(Request $request): JsonResponse
    {
        $activation = $this->modules->activateSelected($request->user()?->id);

        return $this->successResponse([
            'data' => [
                'activation' => $activation,
                'state' => $this->modules->state($request->user()?->id),
            ],
        ], 'Selected modules evaluated for activation.');
    }
}
