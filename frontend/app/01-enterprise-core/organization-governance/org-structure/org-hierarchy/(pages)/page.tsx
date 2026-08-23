'use client';

import { useI18n, catalogText } from "@/lib/i18n";
import { MainLayout } from '@/components/layout';
import {
  Button,
  Dialog,
  SearchableSelect,
  TabNavigation,
  type SelectOption,
  showAlert,
} from '@/components/ui';
import { fetchAPI } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/endpoints';
import { useOperatingContextStore } from '@/stores/useOperatingContextStore';
import { useEffect, useMemo, useState } from 'react';
import { OrganizationalStructure } from './OrganizationalStructure';

type OrgTab =
  | 'dashboard'
  | 'nodes'
  | 'meta_types'
  | 'topology_rules'
  | 'links'
  | 'hierarchy'
  | 'scope_context'
  | 'integrity'
  | 'change_history';

type SetupForm = {
  org_node_uuid: string | null;
  cost_center_id: number | null;
  pos_terminal_id: number | null;
};

const initialSetupForm: SetupForm = {
  org_node_uuid: null,
  cost_center_id: null,
  pos_terminal_id: null,
};

type ListResponse = { data?: unknown } | null | undefined;

type OrganizationNode = {
  node_uuid: string;
  node_type_id: string;
  code: string;
  status?: string;
};

type CostCenter = {
  id: number;
  code: string;
  name: string;
  name_en?: string;
  is_active?: boolean;
};

type PosTerminal = {
  id: number;
  code: string;
  name: string;
  name_en?: string;
  is_active?: boolean;
};

function listFromResponse<T>(response: ListResponse): T[] {
  const raw = response?.data;
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object" && "data" in raw) {
    const nested = (raw as { data?: unknown }).data;
    if (Array.isArray(nested)) return nested as T[];
  }
  return [];
}

export default function OrganizationalStructurePage() {
    const { t: i18n } = useI18n();
  const [activeTab, setActiveTab] = useState<OrgTab>('dashboard');
  const [setupOpen, setSetupOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [setupForm, setSetupForm] = useState<SetupForm>(initialSetupForm);
  const [nodes, setNodes] = useState<OrganizationNode[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [posTerminals, setPosTerminals] = useState<PosTerminal[]>([]);
  const { readiness, loadReadiness } = useOperatingContextStore();
  const readinessLabels: Record<string, string> = {
    warehouse: i18n.catalog["enterpriseCore.orgHierarchy.readinessWarehouse"],
    cost_center: i18n.catalog["enterpriseCore.orgHierarchy.readinessCostCenter"],
    pos_terminal: i18n.catalog["enterpriseCore.orgHierarchy.readinessPosTerminal"],
    organizational_structure: i18n.catalog["enterpriseCore.orgHierarchy.readinessOrganizationalStructure"],
  };
  const readinessActions: Record<string, string> = {
    warehouse: i18n.catalog["enterpriseCore.orgHierarchy.readinessActionWarehouse"],
    cost_center: i18n.catalog["enterpriseCore.orgHierarchy.readinessActionCostCenter"],
    pos_terminal: i18n.catalog["enterpriseCore.orgHierarchy.readinessActionPosTerminal"],
    organizational_structure: i18n.catalog["enterpriseCore.orgHierarchy.readinessActionOrganizationalStructure"],
  };

  useEffect(() => {
    const shouldOpenSetup =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('setup') === '1';
    if (shouldOpenSetup && readiness && !readiness.ready) {
      setSetupOpen(true);
    }
  }, [readiness]);

  useEffect(() => {
    const loadSetupData = async () => {
      const [nodeResponse, costResponse, posResponse] = await Promise.all([
        fetchAPI(API_ENDPOINTS.ENTERPRISE_CORE.ORG.NODES),
        fetchAPI(API_ENDPOINTS.FINANCE.COST_CENTERS.BASE),
        fetchAPI(API_ENDPOINTS.ENTERPRISE_CORE.OPERATING_CONTEXT.POS_TERMINALS),
      ]);
      setNodes(listFromResponse<OrganizationNode>(nodeResponse));
      setCostCenters(listFromResponse<CostCenter>(costResponse).filter((center) => center.is_active !== false));
      setPosTerminals(listFromResponse<PosTerminal>(posResponse).filter((terminal) => terminal.is_active !== false));
      await loadReadiness();
    };
    loadSetupData();
  }, [loadReadiness]);

  const nodeOptions = useMemo<SelectOption[]>(
    () =>
      nodes.filter((node) => node.node_type_id === 'COMP_CODE').map((node) => ({
        value: node.node_uuid,
        label: node.code || node.node_uuid,
        subtitle: node.status,
      })),
    [nodes]
  );
  const costCenterOptions = useMemo<SelectOption[]>(
    () =>
      costCenters.map((center) => ({
        value: center.id,
        label: catalogText(i18n, "common.general.notAvailable.alternative10", { value0: center.code, value1: center.name }),
        subtitle: center.name_en || '',
      })),
    [costCenters, i18n]
  );
  const posTerminalOptions = useMemo<SelectOption[]>(
    () =>
      posTerminals.map((terminal) => ({
        value: terminal.id,
        label: catalogText(i18n, "common.general.notAvailable.alternative10", { value0: terminal.code, value1: terminal.name }),
        subtitle: terminal.name_en || '',
      })),
    [posTerminals, i18n]
  );

  const updateSetupField = <K extends keyof SetupForm>(key: K, value: SetupForm[K]) => {
    setSetupForm((current) => ({ ...current, [key]: value }));
  };

  const configureStore = async () => {
    if (
      !setupForm.org_node_uuid ||
      !setupForm.cost_center_id ||
      !setupForm.pos_terminal_id
    ) {
      showAlert(
        'operating-context-alert',
        i18n.catalog["enterpriseCore.orgHierarchy.pleaseCompleteRequiredOperatingConfigurationFields"],
        'error'
      );
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetchAPI(API_ENDPOINTS.ENTERPRISE_CORE.OPERATING_CONTEXT.CONFIGURE, {
        method: 'POST',
        body: JSON.stringify({
          org_node_uuid: setupForm.org_node_uuid,
          cost_center_id: setupForm.cost_center_id,
          pos_terminal_id: setupForm.pos_terminal_id,
        }),
      });
      if (!response.success) {
        showAlert(
          'operating-context-alert',
          response.message || i18n.catalog["common.general.unableConfigureOperatingContext"],
          'error'
        );
        return;
      }
      await loadReadiness();
      setSetupOpen(false);
      showAlert('operating-context-alert', i18n.catalog["enterpriseCore.orgHierarchy.operatingContextConfiguredSuccessfully"], 'success');
    } catch (error) {
      console.error(i18n.catalog["common.general.unableConfigureOperatingContext"], error);
      showAlert('operating-context-alert', i18n.catalog["common.general.unableConfigureOperatingContext"], 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MainLayout>
      <div id="operating-context-alert" />
      <div className="settings-wrapper animate-fade">
        <div className="sales-card" style={{ marginBottom: '1rem' }}>
          <div className="card-header-flex">
            <div>
              <h3>{i18n.catalog["enterpriseCore.orgHierarchy.operationalStoreReadiness"]}</h3>
              {readiness?.ready ? (
                <p>{i18n.catalog["enterpriseCore.orgHierarchy.readyWarehouseDrivenSalesPurchasing"]}</p>
              ) : (
                <p>
                  {(readiness?.missing?.[0]?.key
                    ? readinessActions[readiness.missing[0].key]
                    : null) ||
                    i18n.catalog["enterpriseCore.orgHierarchy.configureWarehouseFinancialCentersPosTerminalBeginOperations"]}
                </p>
              )}
            </div>
            <Button
              variant={readiness?.ready ? 'secondary' : 'primary'}
              onClick={() => setSetupOpen(true)}
            >
              {readiness?.ready ? i18n.catalog["enterpriseCore.orgHierarchy.reviewOperatingContext"] : i18n.catalog["enterpriseCore.orgHierarchy.configureStore"]}
            </Button>
          </div>
          {readiness?.checks?.length ? (
            <div className="badge-container" style={{ marginTop: '0.75rem' }}>
              {readiness.checks.map((check) => (
                <span
                  key={check.key}
                  className={`badge ${check.complete ? 'badge-success' : 'badge-warning'}`}
                >
                  {readinessLabels[check.key] || i18n.catalog["common.general.readiness"]}: {check.complete
                    ? i18n.catalog["enterpriseCore.orgHierarchy.readinessReady"]
                    : i18n.catalog["common.general.required"]}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <TabNavigation
          tabs={[
            { key: 'dashboard', label: i18n.catalog["common.general.dashboard"], icon: 'dashboard' },
            { key: 'hierarchy', label: i18n.catalog["common.general.organizationalChart"], icon: 'tree' },
            { key: 'nodes', label: i18n.catalog["enterpriseCore.orgHierarchy.organizationalUnits"], icon: 'sitemap' },
            { key: 'links', label: i18n.catalog["common.general.links"], icon: 'link' },
            { key: 'meta_types', label: i18n.catalog["common.general.typesUnits"], icon: 'cube' },
            { key: 'topology_rules', label: i18n.catalog["common.general.linkingRules"], icon: 'route' },
            { key: 'scope_context', label: i18n.catalog["common.general.contextAnalysis"], icon: 'search' },
            { key: 'integrity', label: i18n.catalog["enterpriseCore.orgHierarchy.structuralSafety"], icon: 'check-shield' },
            { key: 'change_history', label: i18n.catalog["enterpriseCore.orgHierarchy.changeLog"], icon: 'history' },
          ]}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as OrgTab)}
        />
        <div>
          <OrganizationalStructure activeTab={activeTab} />
        </div>
      </div>

      <Dialog
        isOpen={setupOpen}
        onClose={() => !isSaving && setSetupOpen(false)}
        title={i18n.catalog["enterpriseCore.orgHierarchy.configureOperationalStore"]}
        maxWidth="760px"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSetupOpen(false)} disabled={isSaving}>
              {i18n.catalog["common.general.cancel"]}
            </Button>
            <Button onClick={configureStore} isLoading={isSaving}>
              {i18n.catalog["enterpriseCore.orgHierarchy.saveOperatingContext"]}</Button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label>{i18n.catalog["enterpriseCore.orgHierarchy.organizationalUnit"]}</label>
            <SearchableSelect
              options={nodeOptions}
              value={setupForm.org_node_uuid}
              onChange={(value) =>
                updateSetupField('org_node_uuid', typeof value === 'string' ? value : null)
              }
              placeholder={i18n.catalog["enterpriseCore.orgHierarchy.selectOperatingUnitOptional"]}
              required
            />
          </div>
          <div className="form-group">
            <label>{i18n.catalog["enterpriseCore.orgHierarchy.costCenter"]}</label>
            <SearchableSelect
              options={costCenterOptions}
              value={setupForm.cost_center_id}
              onChange={(value) =>
                updateSetupField('cost_center_id', typeof value === 'number' ? value : null)
              }
              placeholder={i18n.catalog["enterpriseCore.orgHierarchy.selectActiveCostCenter"]}
              required
            />
          </div>
          <div className="form-group">
            <label>{i18n.catalog["enterpriseCore.setup.scope.pointOfSale"]}</label>
            <SearchableSelect
              options={posTerminalOptions}
              value={setupForm.pos_terminal_id}
              onChange={(value) => updateSetupField('pos_terminal_id', typeof value === 'number' ? value : null)}
              placeholder={i18n.catalog["enterpriseCore.orgHierarchy.selectOperatingUnitOptional"]}
              required
            />
          </div>
        </div>
      </Dialog>
    </MainLayout>
  );
}
