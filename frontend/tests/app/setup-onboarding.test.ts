import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");
const source = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("profile-driven setup onboarding", () => {
  it("keeps setup outside the operational MainLayout and protects it with its own authenticated shell", () => {
    const page = source("app/setup/page.tsx");
    const layout = source("app/setup/layout.tsx");

    expect(page).not.toContain("MainLayout");
    expect(layout).not.toContain("SideNavigationBar");
    expect(layout).toContain("verifySetupAccess");
    expect(layout).toContain("setup_required");
  });

  it("renders one guarded journey before optional capability activation", () => {
    const page = source("app/setup/page.tsx");
    const moduleSelection = source("app/setup/components/SetupModuleSelection.tsx");
    const journey = source("app/setup/components/SetupJourneyStepper.tsx");

    expect(page.indexOf("<SetupJourneyStepper")).toBeLessThan(page.indexOf("<SetupModuleSelection"));
    expect(page).toContain("journeyStep");
    expect(page).toContain("optional_capabilities");
    expect(journey).toContain("onPrevious");
    expect(journey).toContain("onNext");
    expect(moduleSelection).toContain("coreModuleKeys");
    expect(moduleSelection).toContain("canActivate");
  });

  it("starts from a business profile and safely applies a generated organization template", () => {
    const page = source("app/setup/page.tsx");
    const profile = source("app/setup/components/SetupOrganizationProfileSection.tsx");
    const endpoints = source("lib/endpoints/enterprise-core.ts");

    expect(page).toContain("<SetupOrganizationProfileSection");
    expect(page).toContain("SETUP.ORGANIZATION_PROFILE");
    expect(page).toContain("SETUP.APPLY_ORGANIZATION_TEMPLATE");
    expect(page).not.toContain("<OrganizationArchitectureWorkspace");
    expect(profile).toContain("SegmentedToggle");
    expect(profile).toContain("setup-template-card");
    expect(profile).toContain("primary_site_name");
    expect(profile).toContain("factory_calendar_id");
    expect(endpoints).toContain("ORGANIZATION_TEMPLATES");
    expect(endpoints).toContain("APPLY_ORGANIZATION_TEMPLATE");
  });

  it("refreshes readiness after every successful save and exposes foundation/template state in the header", () => {
    const page = source("app/setup/page.tsx");
    const summary = source("app/setup/components/SetupReadinessSummary.tsx");
    const scope = source("app/setup/components/SetupOperatingScopeSection.tsx");

    expect(page).toContain("await load();");
    expect(page).toContain("templateApplied={templateApplied}");
    expect(page).toContain("onboarding={onboarding}");
    expect(summary).toContain("foundationReady");
    expect(summary).toContain("templateApplied");
    expect(scope).toContain("posTerminalId");
    expect(scope).not.toContain("warehouseCode");
    expect(scope).not.toContain("profitCenterId");
  });

  it("uses controlled reference data for organization profile currency and calendar", () => {
    const page = source("app/setup/page.tsx");
    const profile = source("app/setup/components/SetupOrganizationProfileSection.tsx");

    expect(page).toContain("FINANCE.FOREIGN_EXCHANGE.CURRENCIES.BASE");
    expect(page).toContain("ORG.FACTORY_CALENDARS");
    expect(page).toContain("currencyOptions");
    expect(page).toContain("calendarOptions");
    expect(profile).toContain("SearchableSelect");
    expect(profile).toContain("setup-profile-currency");
    expect(profile).toContain("setup-profile-calendar");
  });

  it("keeps the raw organizational graph in the advanced designer instead of onboarding", () => {
    const page = source("app/setup/page.tsx");
    const workspace = source("app/01-enterprise-core/organization-governance/org-structure/org-hierarchy/components/NodeFormPanel.tsx");

    expect(page).not.toContain("OrganizationArchitectureWorkspace");
    expect(workspace).toContain("topologyRules");
    expect(workspace).toContain("dynamicAttrs");
    expect(workspace).toContain("target_node_uuid");
  });

  it("retains controlled accounting and operating-context components", () => {
    const page = source("app/setup/page.tsx");
    const accounting = source("app/setup/components/SetupAccountingSection.tsx");

    expect(page).toContain("<SetupAccountingSection");
    expect(page).toContain("<SetupOperatingScopeSection");
    expect(accounting).toContain("chartReady");
    expect(accounting).toContain("periodReady");
  });

  it("exposes interface-language settings from the setup shell", () => {
    const layout = source("app/setup/layout.tsx");

    expect(layout).toContain("setup-top-utility");
    expect(layout).toContain("ApplicationLanguageSettingsTab");
  });

  it("emits setup in the static catch-all parameter set", () => {
    const virtualRoute = source("app/[...virtual]/page.tsx");

    expect(virtualRoute).toMatch(/paths\.set\(["']setup["'], \{ virtual: \[["']setup["']\] \}\)/);
  });
});
