"use client";

import { DashboardTab } from "./components/DashboardTab";
import { HierarchyTab } from "./components/HierarchyTab";
import { NodesTab } from "./components/NodesTab";
import { LinksTab } from "./components/LinksTab";
import { MetaTypesTab } from "./components/MetaTypesTab";
import { TopologyRulesTab } from "./components/TopologyRulesTab";
import { ScopeContextTab } from "./components/ScopeContextTab";
import { IntegrityTab } from "./components/IntegrityTab";
import { ChangeHistoryTab } from "./components/ChangeHistoryTab";

type OrgTab = "dashboard" | "nodes" | "meta_types" | "topology_rules" | "links" | "hierarchy" | "scope_context" | "integrity" | "change_history";

interface Props {
  activeTab: OrgTab;
}

export function OrganizationalStructure({ activeTab }: Props) {
  switch (activeTab) {
    case "dashboard":
      return <DashboardTab />;
    case "hierarchy":
      return <HierarchyTab />;
    case "nodes":
      return <NodesTab />;
    case "links":
      return <LinksTab />;
    case "meta_types":
      return <MetaTypesTab />;
    case "topology_rules":
      return <TopologyRulesTab />;
    case "scope_context":
      return <ScopeContextTab />;
    case "integrity":
      return <IntegrityTab />;
    case "change_history":
      return <ChangeHistoryTab />;
    default:
      return <DashboardTab />;
  }
}
