"use client";

import { Button, Input, SearchableSelect, SegmentedToggle } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { SetupField } from "./SetupField";
import { SetupSection } from "./SetupSection";
import type { OrganizationProfile, OrganizationSize, OrganizationTemplate, SelectOption } from "../types";

type ProfileDraft = Omit<OrganizationProfile, "industry" | "inventory_enabled" | "applied_at" | "created_nodes">;

interface SetupOrganizationProfileSectionProps {
  templates: OrganizationTemplate[];
  selectedTemplateKey: string;
  draft: ProfileDraft;
  currencyOptions: SelectOption[];
  calendarOptions: SelectOption[];
  isSaving: boolean;
  isApplied: boolean;
  canApply: boolean;
  onTemplateChange: (templateKey: string) => void;
  onChange: (changes: Partial<ProfileDraft>) => void;
  onSave: () => void;
  onApply: () => void;
}

const sizeOptions = [
  { value: "micro", key: "enterpriseCore.setup.profile.size.micro" },
  { value: "small", key: "enterpriseCore.setup.profile.size.small" },
  { value: "medium", key: "enterpriseCore.setup.profile.size.medium" },
  { value: "enterprise", key: "enterpriseCore.setup.profile.size.enterprise" },
] as const;

const generatedStructureKeys = {
  CLIENT: "enterpriseCore.setup.profile.structure.client",
  COMP_CODE: "enterpriseCore.setup.profile.structure.company",
  CONTROLLING_AREA: "enterpriseCore.setup.profile.structure.controllingScope",
  COST_CENTER: "enterpriseCore.setup.profile.structure.costCenter",
  PROFIT_CENTER: "enterpriseCore.setup.profile.structure.profitCenter",
  PLANT: "enterpriseCore.setup.profile.structure.site",
  STORAGE_LOC: "enterpriseCore.setup.profile.structure.inventory",
  PURCH_ORG: "enterpriseCore.setup.profile.structure.purchasing",
  SALES_ORG: "enterpriseCore.setup.profile.structure.sales",
} as const;

function normalizeCode(value: string): string {
  return value.toUpperCase().replace(/\s+/g, "-");
}

export function SetupOrganizationProfileSection({
  templates,
  selectedTemplateKey,
  draft,
  currencyOptions,
  calendarOptions,
  isSaving,
  isApplied,
  canApply,
  onTemplateChange,
  onChange,
  onSave,
  onApply,
}: SetupOrganizationProfileSectionProps) {
  const { t: i18n, locale } = useI18n();
  const isArabic = locale === "ar-SA";
  const selectedTemplate = templates.find((template) => template.key === selectedTemplateKey) ?? null;
  const requiresInventory = selectedTemplate?.requires_inventory === true;
  const templateLabel = (template: OrganizationTemplate) => isArabic ? template.label_ar : template.label_en;
  const sizeLabels = sizeOptions.map((option) => ({
    value: option.value,
    label: i18n.catalog[option.key],
  }));
  const generatedLabels = selectedTemplate?.generated_types.map((type) => {
    const key = generatedStructureKeys[type as keyof typeof generatedStructureKeys];
    return key ? i18n.catalog[key] : type;
  }) ?? [];

  return (
    <SetupSection
      id="setup-organization-profile"
      title={i18n.catalog["enterpriseCore.setup.profile.title"]}
      description={i18n.catalog["enterpriseCore.setup.profile.description"]}
    >
      <section className="setup-profile-block" aria-labelledby="setup-template-choice-heading">
        <div className="setup-profile-heading">
          <span className="setup-profile-step">1</span>
          <div>
            <h3 id="setup-template-choice-heading">{i18n.catalog["enterpriseCore.setup.profile.templateChoice.title"]}</h3>
            <p>{i18n.catalog["enterpriseCore.setup.profile.templateChoice.description"]}</p>
          </div>
        </div>
        <div className="setup-template-grid" aria-label={i18n.catalog["enterpriseCore.setup.profile.templateChoice.ariaLabel"]}>
          {templates.map((template) => {
            const active = template.key === selectedTemplateKey;
            return (
              <button
                key={template.key}
                type="button"
                className={`setup-template-card ${active ? "is-selected" : ""}`}
                aria-pressed={active}
                onClick={() => onTemplateChange(template.key)}
                disabled={isApplied}
              >
                <strong>{templateLabel(template)}</strong>
                <span>{isArabic ? template.description_ar : template.label_en}</span>
                <small>{template.requires_inventory
                  ? i18n.catalog["enterpriseCore.setup.profile.templateChoice.includesInventory"]
                  : i18n.catalog["enterpriseCore.setup.profile.templateChoice.noInventory"]}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="setup-profile-block" aria-labelledby="setup-company-details-heading">
        <div className="setup-profile-heading">
          <span className="setup-profile-step">2</span>
          <div>
            <h3 id="setup-company-details-heading">{i18n.catalog["enterpriseCore.setup.profile.companyDetails.title"]}</h3>
            <p>{i18n.catalog["enterpriseCore.setup.profile.companyDetails.description"]}</p>
          </div>
        </div>
        <div className="settings-form-grid setup-form-grid">
          <SetupField id="setup-organization-size" label={i18n.catalog["enterpriseCore.setup.profile.field.organizationSize"]} required>
            <SegmentedToggle
              value={draft.organization_size}
              options={sizeLabels}
              onChange={(value) => onChange({ organization_size: value as OrganizationSize })}
            />
          </SetupField>
          <SetupField id="setup-company-name" label={i18n.catalog["enterpriseCore.setup.profile.field.companyName"]} required>
            <Input
              id="setup-company-name"
              className="setup-input"
              value={draft.company_name}
              onChange={(event) => onChange({ company_name: event.target.value })}
              disabled={isApplied}
              required
            />
          </SetupField>
          <SetupField id="setup-company-code" label={i18n.catalog["enterpriseCore.setup.profile.field.companyCode"]} required>
            <Input
              id="setup-company-code"
              className="setup-input"
              dir="ltr"
              value={draft.company_code}
              onChange={(event) => onChange({ company_code: normalizeCode(event.target.value) })}
              disabled={isApplied}
              required
            />
          </SetupField>
          <SetupField id="setup-country-code" label={i18n.catalog["enterpriseCore.setup.profile.field.country"]} required>
            <Input
              id="setup-country-code"
              className="setup-input"
              dir="ltr"
              maxLength={2}
              value={draft.country_code}
              onChange={(event) => onChange({ country_code: event.target.value.toUpperCase() })}
              disabled={isApplied}
              required
            />
          </SetupField>
          <SetupField id="setup-profile-currency" label={i18n.catalog["enterpriseCore.setup.profile.field.currency"]} required>
            <SearchableSelect
              id="setup-profile-currency"
              className="setup-select"
              value={draft.currency_id || null}
              options={currencyOptions}
              onChange={(value) => onChange({ currency_id: typeof value === "number" ? value : Number(value) || 0 })}
              disabled={isApplied}
            />
          </SetupField>
        </div>
      </section>

      {requiresInventory ? (
        <section className="setup-template-subsection" aria-labelledby="setup-site-details-heading">
          <div className="setup-profile-heading">
            <span className="setup-profile-step">3</span>
            <div>
              <h3 id="setup-site-details-heading">{i18n.catalog["enterpriseCore.setup.profile.siteDetails.title"]}</h3>
              <p>{i18n.catalog["enterpriseCore.setup.profile.siteDetails.description"]}</p>
            </div>
          </div>
          <div className="settings-form-grid setup-form-grid">
            <SetupField id="setup-primary-site-name" label={i18n.catalog["enterpriseCore.setup.profile.field.siteName"]} required>
              <Input
                id="setup-primary-site-name"
                className="setup-input"
                value={draft.primary_site_name ?? ""}
                onChange={(event) => onChange({ primary_site_name: event.target.value })}
                disabled={isApplied}
                required
              />
            </SetupField>
            <SetupField id="setup-primary-site-code" label={i18n.catalog["enterpriseCore.setup.profile.field.siteCode"]} required>
              <Input
                id="setup-primary-site-code"
                className="setup-input"
                dir="ltr"
                value={draft.primary_site_code ?? ""}
                onChange={(event) => onChange({ primary_site_code: normalizeCode(event.target.value) })}
                disabled={isApplied}
                required
              />
            </SetupField>
            <SetupField id="setup-profile-calendar" label={i18n.catalog["enterpriseCore.setup.profile.field.siteCalendar"]} required>
              <SearchableSelect
                id="setup-profile-calendar"
                className="setup-select"
                value={draft.factory_calendar_id ?? null}
                options={calendarOptions}
                onChange={(value) => onChange({ factory_calendar_id: typeof value === "number" ? value : Number(value) || null })}
                disabled={isApplied}
              />
            </SetupField>
          </div>
        </section>
      ) : null}

      <aside className="setup-template-preview" aria-live="polite">
        <strong>{i18n.catalog["enterpriseCore.setup.profile.preview.title"]}</strong>
        {generatedLabels.length > 0 ? (
          <div className="setup-template-summary-list">
            {generatedLabels.map((label) => <span key={label}>{label}</span>)}
          </div>
        ) : <p>{i18n.catalog["enterpriseCore.setup.profile.preview.chooseTemplate"]}</p>}
        <small>{i18n.catalog["enterpriseCore.setup.profile.preview.laterExpansion"]}</small>
      </aside>

      <div className="setup-actions setup-actions-primary">
        <Button type="button" onClick={onSave} isLoading={isSaving} disabled={isApplied}>
          {i18n.catalog["enterpriseCore.setup.profile.action.save"]}
        </Button>
        <Button type="button" variant="secondary" onClick={onApply} isLoading={isSaving} disabled={!canApply || isApplied}>
          {isApplied
            ? i18n.catalog["enterpriseCore.setup.profile.action.applied"]
            : i18n.catalog["enterpriseCore.setup.profile.action.apply"]}
        </Button>
      </div>
    </SetupSection>
  );
}
