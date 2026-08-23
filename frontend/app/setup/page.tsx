"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { catalogText, useI18n } from "@/lib/i18n";
import { SetupAccountingSection } from "./components/SetupAccountingSection";
import { SetupJourneyStepper, type SetupJourneyStepId } from "./components/SetupJourneyStepper";
import { SetupModuleSelection } from "./components/SetupModuleSelection";
import { SetupOperatingScopeSection } from "./components/SetupOperatingScopeSection";
import { SetupOrganizationProfileSection } from "./components/SetupOrganizationProfileSection";
import { SetupReadinessSummary } from "./components/SetupReadinessSummary";
import { Item, OrganizationProfile, Readiness, SetupState } from "./types";

const accountTypes = ["asset", "liability", "equity", "revenue", "expense"] as const;
type AccountType = (typeof accountTypes)[number];
const recordFields = { code: "code", name: "name" } as const;

const emptyOrganizationProfile: OrganizationProfile = {
  template_key: "",
  industry: "",
  organization_size: "small",
  company_name: "",
  company_code: "",
  country_code: "SA",
  currency_id: 0,
  primary_site_name: "",
  primary_site_code: "",
  factory_calendar_id: null,
  language: "ar-SA",
  inventory_enabled: false,
};

function listFrom(response: unknown): Item[] {
  const payload = (response as { data?: unknown } | undefined)?.data;
  if (Array.isArray(payload)) return payload as Item[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: Item[] }).data;
  }
  return [];
}

function text(item: Item, key: string): string {
  const value = item[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

export default function SetupPage() {
  const { t: i18n, locale } = useI18n();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [setupState, setSetupState] = useState<SetupState | null>(null);
  const [costCenters, setCostCenters] = useState<Item[]>([]);
  const [currencies, setCurrencies] = useState<Item[]>([]);
  const [factoryCalendars, setFactoryCalendars] = useState<Item[]>([]);
  const [accounts, setAccounts] = useState<Item[]>([]);
  const [periods, setPeriods] = useState<Item[]>([]);
  const [posTerminals, setPosTerminals] = useState<Item[]>([]);
  const [nodes, setNodes] = useState<Item[]>([]);
  const [selectedModuleKeys, setSelectedModuleKeys] = useState<string[]>([]);
  const [journeyStep, setJourneyStep] = useState<SetupJourneyStepId>("foundation");
  const [organizationProfile, setOrganizationProfile] = useState<OrganizationProfile>(emptyOrganizationProfile);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("");

  const [accountCode, setAccountCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("asset");
  const [periodName, setPeriodName] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const [workingUnit, setWorkingUnit] = useState("");
  const [workingUnitCode, setWorkingUnitCode] = useState("");
  const [workingUnitName, setWorkingUnitName] = useState("");
  const [costCenterId, setCostCenterId] = useState<number | null>(null);
  const [posTerminalId, setPosTerminalId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [readinessResponse, setupResponse, nodesResponse, costsResponse, currenciesResponse, factoryCalendarsResponse, accountsResponse, periodsResponse, posTerminalsResponse] = await Promise.all([
        fetchAPI<Readiness>(API_ENDPOINTS.ENTERPRISE_CORE.OPERATING_CONTEXT.READINESS),
        fetchAPI<SetupState>(API_ENDPOINTS.ENTERPRISE_CORE.SETUP.STATE),
        fetchAPI(API_ENDPOINTS.ENTERPRISE_CORE.ORG.NODES),
        fetchAPI(`${API_ENDPOINTS.FINANCE.COST_CENTERS.BASE}?limit=500`),
        fetchAPI(API_ENDPOINTS.FINANCE.FOREIGN_EXCHANGE.CURRENCIES.BASE),
        fetchAPI(API_ENDPOINTS.ENTERPRISE_CORE.ORG.FACTORY_CALENDARS),
        fetchAPI(`${API_ENDPOINTS.FINANCE.ACCOUNTS.BASE}?limit=500`),
        fetchAPI(`${API_ENDPOINTS.FINANCE.FISCAL_PERIODS.BASE}?limit=500`),
        fetchAPI(API_ENDPOINTS.ENTERPRISE_CORE.OPERATING_CONTEXT.POS_TERMINALS),
      ]);

      setReadiness(readinessResponse.success ? readinessResponse.data ?? null : null);
      const state = setupResponse.success ? setupResponse.data ?? null : null;
      setSetupState(state);
      setSelectedModuleKeys(state?.selected_module_keys ?? []);
      const templateState = state?.organization_template;
      const savedProfile = templateState?.profile;
      if (savedProfile) {
        setOrganizationProfile({ ...emptyOrganizationProfile, ...savedProfile });
        setSelectedTemplateKey(savedProfile.template_key);
      } else if (templateState?.templates[0]) {
        setSelectedTemplateKey((current) => current || templateState.templates[0].key);
      }
      setNodes(listFrom(nodesResponse).filter((node) => node.status === "active"));
      setCostCenters(listFrom(costsResponse).filter((item) => item.is_active !== false));
      setCurrencies(listFrom(currenciesResponse).filter((item) => item.is_active !== false));
      setFactoryCalendars(listFrom(factoryCalendarsResponse).filter((item) => item.is_active !== false));
      setAccounts(listFrom(accountsResponse).filter((item) => item.is_active !== false));
      setPeriods(listFrom(periodsResponse));
      setPosTerminals(listFrom(posTerminalsResponse).filter((item) => item.is_active !== false));
      const context = (readinessResponse.success ? readinessResponse.data?.context : null) as Item | null;
      setWorkingUnit(text(context ?? {}, "org_node_uuid"));
      setCostCenterId(Number(context?.cost_center_id) || null);
      setPosTerminalId(Number(context?.pos_terminal_id) || null);
    } catch {
      showToast(i18n.catalog["enterpriseCore.setup.failedToLoad"], "error");
    } finally {
      setIsLoading(false);
    }
  }, [i18n.catalog]);

  useEffect(() => { void load(); }, [load]);

  const templateState = setupState?.organization_template;
  const templateApplied = templateState?.is_applied === true;
  const activeNodes = useMemo(() => nodes.filter((node) => text(node, "node_type_id") === "COMP_CODE"), [nodes]);
  const workingUnitOptions = useMemo(() => activeNodes.map((node) => ({
    value: text(node, "node_uuid"),
    label: catalogText(i18n, "enterpriseCore.setup.nodeSummary", {
      value0: text(node, "code"),
      value1: text((node.meta_type as Item | undefined) ?? {}, locale === "ar-SA" ? "display_name_ar" : "display_name") || text(node, "node_type_id"),
    }),
  })), [activeNodes, i18n, locale]);
  const selectedWorkingUnitNode = useMemo(
    () => nodes.find((node) => text(node, "node_uuid") === workingUnit) ?? null,
    [nodes, workingUnit],
  );
  useEffect(() => {
    if (!selectedWorkingUnitNode) return;
    setWorkingUnitCode(text(selectedWorkingUnitNode, "code"));
    const attributes = selectedWorkingUnitNode.attributes_json as Item | undefined;
    setWorkingUnitName(text(attributes ?? {}, "name"));
  }, [selectedWorkingUnitNode]);
  const costOptions = useMemo(() => costCenters.map((center) => ({
    value: Number(center.id),
    label: catalogText(i18n, "enterpriseCore.setup.centerSummary", {
      value0: text(center, recordFields.code),
      value1: text(center, recordFields.name),
    }),
  })), [costCenters, i18n]);
  const posOptions = useMemo(() => posTerminals.map((terminal) => ({
    value: Number(terminal.id),
    label: [text(terminal, "code"), text(terminal, "name")].filter(Boolean).join(" — "),
  })), [posTerminals]);
  const currencyOptions = useMemo(() => currencies.map((currency) => ({
    value: Number(currency.id),
    label: [text(currency, "code"), text(currency, "name")].filter(Boolean).join(" — "),
  })), [currencies]);
  const calendarOptions = useMemo(() => factoryCalendars.map((calendar) => ({
    value: Number(calendar.id),
    label: [text(calendar, "code"), text(calendar, locale === "ar-SA" ? "name_ar" : "name")].filter(Boolean).join(" — "),
  })), [factoryCalendars, locale]);

  const callAndReload = async <T,>(action: () => Promise<{ success?: boolean; message?: string; data?: T }>): Promise<T | null> => {
    setIsSaving(true);
    try {
      const response = await action();
      if (!response.success) throw new Error(response.message);
      showToast(i18n.catalog["enterpriseCore.setup.createdSuccessfully"], "success");
      await load();
      return response.data ?? null;
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : i18n.catalog["enterpriseCore.setup.failedToSave"];
      showToast(message, "error");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const saveOrganizationProfile = async () => {
    await callAndReload(() => fetchAPI(API_ENDPOINTS.ENTERPRISE_CORE.SETUP.ORGANIZATION_PROFILE, {
      method: "POST",
      body: JSON.stringify({ ...organizationProfile, template_key: selectedTemplateKey }),
    }));
  };

  const applyOrganizationTemplate = async () => {
    await callAndReload(() => fetchAPI(API_ENDPOINTS.ENTERPRISE_CORE.SETUP.APPLY_ORGANIZATION_TEMPLATE, { method: "POST" }));
  };

  const createAccount = async () => {
    if (!accountCode.trim() || !accountName.trim()) {
      showToast(i18n.catalog["enterpriseCore.setup.failedToSave"], "error");
      return;
    }
    const saved = await callAndReload(() => fetchAPI(API_ENDPOINTS.FINANCE.ACCOUNTS.BASE, {
      method: "POST",
      body: JSON.stringify({ code: accountCode.trim(), name: accountName.trim(), type: accountType }),
    }));
    if (saved) {
      setAccountCode("");
      setAccountName("");
    }
  };

  const createPeriod = async () => {
    if (!periodName.trim() || !periodStart || !periodEnd) {
      showToast(i18n.catalog["enterpriseCore.setup.failedToSave"], "error");
      return;
    }
    const saved = await callAndReload(() => fetchAPI(API_ENDPOINTS.FINANCE.FISCAL_PERIODS.BASE, {
      method: "POST",
      body: JSON.stringify({ period_name: periodName.trim(), start_date: periodStart, end_date: periodEnd }),
    }));
    if (saved) {
      setPeriodName("");
      setPeriodStart("");
      setPeriodEnd("");
    }
  };

  const saveContext = async () => {
    if (!workingUnit || !costCenterId || !posTerminalId) {
      showToast(i18n.catalog["enterpriseCore.setup.failedToSave"], "error");
      return;
    }
    await callAndReload(() => fetchAPI(API_ENDPOINTS.ENTERPRISE_CORE.OPERATING_CONTEXT.CONFIGURE, {
      method: "POST",
      body: JSON.stringify({
        org_node_uuid: workingUnit,
        cost_center_id: costCenterId,
        pos_terminal_id: posTerminalId,
      }),
    }));
  };

  const saveWorkingUnit = async () => {
    if (!selectedWorkingUnitNode || !workingUnitCode.trim()) {
      showToast(i18n.catalog["enterpriseCore.setup.failedToSave"], "error");
      return;
    }
    const currentAttributes = (selectedWorkingUnitNode.attributes_json as Item | undefined) ?? {};
    await callAndReload(() => fetchAPI(API_ENDPOINTS.ENTERPRISE_CORE.ORG.NODE(text(selectedWorkingUnitNode, "node_uuid")), {
      method: "PUT",
      body: JSON.stringify({
        code: workingUnitCode.trim(),
        attributes: { ...currentAttributes, ...(workingUnitName.trim() ? { name: workingUnitName.trim() } : {}) },
      }),
    }));
  };

  const saveModuleSelection = async () => {
    await callAndReload(() => fetchAPI(API_ENDPOINTS.ENTERPRISE_CORE.SETUP.MODULES, {
      method: "POST",
      body: JSON.stringify({ module_keys: selectedModuleKeys }),
    }));
  };

  const activateSelectedModules = async () => {
    await callAndReload(() => fetchAPI(API_ENDPOINTS.ENTERPRISE_CORE.SETUP.ACTIVATE_SELECTED, { method: "POST" }));
  };

  const toggleModule = (moduleKey: string) => {
    setSelectedModuleKeys((current) => current.includes(moduleKey)
      ? current.filter((key) => key !== moduleKey)
      : [...current, moduleKey]);
  };

  const onboarding = setupState?.onboarding ?? readiness?.onboarding;
  const foundationComplete = onboarding?.phases.foundation.ready === true;
  const operatingLinksComplete = onboarding?.phases.core_operations.ready === true;
  const canConfigureModules = operatingLinksComplete;

  useEffect(() => {
    if (journeyStep === "operating_links" && !foundationComplete) setJourneyStep("foundation");
    if (journeyStep === "optional_capabilities" && !operatingLinksComplete) setJourneyStep(foundationComplete ? "operating_links" : "foundation");
  }, [foundationComplete, journeyStep, operatingLinksComplete]);

  const accountTypeLabels: Record<AccountType, string> = {
    asset: i18n.catalog["enterpriseCore.setup.accountType.asset"],
    liability: i18n.catalog["enterpriseCore.setup.accountType.liability"],
    equity: i18n.catalog["enterpriseCore.setup.accountType.equity"],
    revenue: i18n.catalog["enterpriseCore.setup.accountType.revenue"],
    expense: i18n.catalog["enterpriseCore.setup.accountType.expense"],
  };
  const readinessLabels: Record<string, string> = {
    working_unit: i18n.catalog["enterpriseCore.setup.check.workingUnit"],
    warehouse: i18n.catalog["enterpriseCore.setup.check.warehouse"],
    cost_center: i18n.catalog["enterpriseCore.setup.check.costCenter"],
    profit_center: i18n.catalog["enterpriseCore.setup.check.profitCenter"],
    pos_terminal: i18n.catalog["enterpriseCore.setup.check.posTerminal"],
    organizational_structure: i18n.catalog["enterpriseCore.setup.check.organizationalStructure"],
    open_fiscal_period: i18n.catalog["enterpriseCore.setup.check.openFiscalPeriod"],
    chart_of_accounts: i18n.catalog["enterpriseCore.setup.check.chartOfAccounts"],
  };

  return (
    <div className="settings-wrapper setup-workflow">
      <SetupReadinessSummary
        title={i18n.catalog["enterpriseCore.setup.title"]}
        description={i18n.catalog["enterpriseCore.setup.subtitle"]}
        refreshLabel={i18n.catalog["enterpriseCore.setup.refresh"]}
        openDashboardLabel={i18n.catalog["enterpriseCore.setup.openDashboard"]}
        completeLabel={i18n.catalog["enterpriseCore.setup.complete"]}
        incompleteLabel={i18n.catalog["enterpriseCore.setup.incomplete"]}
        readiness={readiness}
        onboarding={onboarding}
        templateApplied={templateApplied}
        foundationLabel={i18n.catalog["enterpriseCore.setup.profile.step.foundationLabel"]}
        templateLabel={i18n.catalog["enterpriseCore.setup.profile.step.templateLabel"]}
        readinessLabels={readinessLabels}
        isLoading={isLoading}
        canOpenDashboard={readiness?.ready === true && setupState?.setup_required === false}
        onRefresh={() => void load()}
        onOpenDashboard={() => router.push("/01-enterprise-core/system-overview/dashboard/global-dashboard")}
      />
      <SetupJourneyStepper
        activeStep={journeyStep}
        previousLabel={i18n.catalog["common.general.previous"]}
        nextLabel={i18n.catalog["common.general.next"]}
        completeLabel={i18n.catalog["enterpriseCore.setup.complete"]}
        steps={[
          {
            id: "foundation",
            title: i18n.catalog["enterpriseCore.setup.profile.step.foundationTitle"],
            description: i18n.catalog["enterpriseCore.setup.profile.step.foundationDescription"],
            complete: foundationComplete,
            enabled: true,
          },
          {
            id: "operating_links",
            title: i18n.catalog["enterpriseCore.setup.profile.step.operationsTitle"],
            description: i18n.catalog["enterpriseCore.setup.profile.step.operationsDescription"],
            complete: operatingLinksComplete,
            enabled: foundationComplete,
          },
          {
            id: "optional_capabilities",
            title: i18n.catalog["enterpriseCore.setup.profile.step.expansionTitle"],
            description: i18n.catalog["enterpriseCore.setup.profile.step.expansionDescription"],
            complete: onboarding?.starter_bundle_active === true,
            enabled: operatingLinksComplete,
          },
        ]}
        onPrevious={() => setJourneyStep((current) => current === "optional_capabilities" ? "operating_links" : "foundation")}
        onNext={() => setJourneyStep((current) => current === "foundation" ? "operating_links" : "optional_capabilities")}
      />
      {journeyStep === "foundation" ? <>
        <SetupOrganizationProfileSection
          templates={templateState?.templates ?? []}
          selectedTemplateKey={selectedTemplateKey}
          draft={organizationProfile}
          currencyOptions={currencyOptions}
          calendarOptions={calendarOptions}
          isSaving={isSaving}
          isApplied={templateApplied}
          canApply={templateState?.can_apply === true && Boolean(selectedTemplateKey)}
          onTemplateChange={(templateKey) => {
            setSelectedTemplateKey(templateKey);
            setOrganizationProfile((current) => ({ ...current, template_key: templateKey }));
          }}
          onChange={(changes) => setOrganizationProfile((current) => ({ ...current, ...changes }))}
          onSave={() => void saveOrganizationProfile()}
          onApply={() => void applyOrganizationTemplate()}
        />
        {templateApplied ? <p className="readiness-notice success">
          {i18n.catalog["enterpriseCore.setup.profile.appliedNotice"]}
        </p> : null}
        <SetupAccountingSection
          title={i18n.catalog["enterpriseCore.setup.accounting.title"]}
          description={i18n.catalog["enterpriseCore.setup.accounting.description"]}
          accountCodeLabel={i18n.catalog["enterpriseCore.setup.accounting.accountCode"]}
          accountNameLabel={i18n.catalog["enterpriseCore.setup.accounting.accountName"]}
          accountTypeLabel={i18n.catalog["enterpriseCore.setup.accounting.accountType"]}
          createAccountLabel={i18n.catalog["enterpriseCore.setup.accounting.createAccount"]}
          periodNameLabel={i18n.catalog["enterpriseCore.setup.accounting.periodName"]}
          startDateLabel={i18n.catalog["enterpriseCore.setup.accounting.startDate"]}
          endDateLabel={i18n.catalog["enterpriseCore.setup.accounting.endDate"]}
          createPeriodLabel={i18n.catalog["enterpriseCore.setup.accounting.createPeriod"]}
          accountCode={accountCode}
          accountName={accountName}
          accountType={accountType}
          accountTypes={accountTypes}
          accountTypeLabels={accountTypeLabels}
          periodName={periodName}
          periodStart={periodStart}
          periodEnd={periodEnd}
          recordSummary={catalogText(i18n, "enterpriseCore.setup.accounting.recordSummary", { value0: accounts.length, value1: periods.length })}
          chartReady={readiness?.accounting_readiness?.chart_of_accounts.ready === true}
          periodReady={readiness?.accounting_readiness?.open_fiscal_period.ready === true}
          completeLabel={i18n.catalog["enterpriseCore.setup.complete"]}
          isSaving={isSaving}
          onAccountCodeChange={setAccountCode}
          onAccountNameChange={setAccountName}
          onAccountTypeChange={setAccountType}
          onPeriodNameChange={setPeriodName}
          onPeriodStartChange={setPeriodStart}
          onPeriodEndChange={setPeriodEnd}
          onCreateAccount={() => void createAccount()}
          onCreatePeriod={() => void createPeriod()}
        />
      </> : null}
      {journeyStep === "operating_links" ? (
        <SetupOperatingScopeSection
          title={i18n.catalog["enterpriseCore.setup.scope.title"]}
          description={i18n.catalog["enterpriseCore.setup.scope.description"]}
          foundationComplete={foundationComplete}
          foundationRequiredLabel={i18n.catalog["enterpriseCore.setup.scope.foundationRequired"]}
          workingUnitLabel={i18n.catalog["enterpriseCore.setup.scope.workingUnit"]}
          workingUnitCodeLabel={i18n.catalog["enterpriseCore.setup.scope.workingUnitCode"]}
          workingUnitNameLabel={i18n.catalog["enterpriseCore.setup.scope.workingUnitName"]}
          saveWorkingUnitLabel={i18n.catalog["enterpriseCore.setup.scope.saveWorkingUnit"]}
          costCenterLabel={i18n.catalog["enterpriseCore.setup.scope.costCenter"]}
          pointOfSaleLabel={i18n.catalog["enterpriseCore.setup.scope.pointOfSale"]}
          contextHelper={i18n.catalog["enterpriseCore.setup.scope.contextHelper"]}
          saveLabel={i18n.catalog["enterpriseCore.setup.scope.save"]}
          workingUnit={workingUnit}
          workingUnitCode={workingUnitCode}
          workingUnitName={workingUnitName}
          costCenterId={costCenterId}
          posTerminalId={posTerminalId}
          nodeOptions={workingUnitOptions}
          costOptions={costOptions}
          posOptions={posOptions}
          isSaving={isSaving}
          onWorkingUnitChange={setWorkingUnit}
          onWorkingUnitCodeChange={setWorkingUnitCode}
          onWorkingUnitNameChange={setWorkingUnitName}
          onSaveWorkingUnit={() => void saveWorkingUnit()}
          onCostCenterChange={setCostCenterId}
          onPosTerminalChange={setPosTerminalId}
          onSave={() => void saveContext()}
        />
      ) : null}
      {journeyStep === "optional_capabilities" ? (
        <SetupModuleSelection
          locale={locale}
          modules={setupState?.modules ?? []}
          selectedModuleKeys={selectedModuleKeys}
          coreModuleKeys={onboarding?.starter_module_keys ?? []}
          canActivate={canConfigureModules}
          title={i18n.catalog["enterpriseCore.setup.modules.title"]}
          description={i18n.catalog["enterpriseCore.setup.modules.description"]}
          coreTitle={i18n.catalog["enterpriseCore.setup.modules.coreTitle"]}
          coreDescription={i18n.catalog["enterpriseCore.setup.modules.coreDescription"]}
          optionalTitle={i18n.catalog["enterpriseCore.setup.modules.optionalTitle"]}
          optionalDescription={i18n.catalog["enterpriseCore.setup.modules.optionalDescription"]}
          baselineRequiredLabel={i18n.catalog["enterpriseCore.setup.modules.baselineRequired"]}
          saveSelectionLabel={i18n.catalog["enterpriseCore.setup.modules.saveSelection"]}
          activateSelectedLabel={i18n.catalog["enterpriseCore.setup.modules.activateSelected"]}
          notSelectedLabel={i18n.catalog["enterpriseCore.setup.modules.notSelected"]}
          pendingReadinessLabel={i18n.catalog["enterpriseCore.setup.modules.pendingReadiness"]}
          activeLabel={i18n.catalog["enterpriseCore.setup.modules.active"]}
          selectionRequiredLabel={i18n.catalog["enterpriseCore.setup.modules.selectionRequired"]}
          noRecordsLabel={i18n.catalog["enterpriseCore.setup.noRecords"]}
          isSaving={isSaving}
          onToggle={toggleModule}
          onSave={() => void saveModuleSelection()}
          onActivate={() => void activateSelectedModules()}
        />
      ) : null}
    </div>
  );
}
