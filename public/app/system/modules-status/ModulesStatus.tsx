"use client";

import { useState, useEffect } from "react";
import { Table, Column } from "@/components/ui";
import { getIcon } from "@/lib/icons";

interface ModuleStatus {
  domain: string;
  module: string;
  backend: "complete" | "partial" | "missing";
  frontend: "complete" | "partial" | "missing";
  routes: "complete" | "missing";
  models: "complete" | "missing";
  status: "operational" | "in_progress" | "pending";
}

const modules: ModuleStatus[] = [
  // Core HR Management
  { domain: "Core HR Management", module: "Employee Master Data & Lifecycle", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
  { domain: "Core HR Management", module: "Global Mobility & Expat Management", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
  { domain: "Core HR Management", module: "Employee Assets & Equipment", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
  
  // Talent Acquisition
  { domain: "Talent Acquisition", module: "Recruitment & Applicant Tracking (ATS)", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
  { domain: "Talent Acquisition", module: "Digital Onboarding & Offboarding", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
  
  // Workforce Strategy
  { domain: "Workforce Strategy", module: "Expanded Workforce (Contingent)", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
  
  // Legal & Compliance
  { domain: "Legal & Compliance", module: "Contracts & Agreements Management", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
  { domain: "Legal & Compliance", module: "Quality Assurance & Internal Audit", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
  
  // Time, Attendance & Scheduling
  { domain: "Time, Attendance & Scheduling", module: "Time Tracking & Capture", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
  { domain: "Time, Attendance & Scheduling", module: "Workforce Scheduling & Optimization", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
  { domain: "Time, Attendance & Scheduling", module: "Leave & Absence Management", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
  
  // Employee Relations & Services
  { domain: "Employee Relations & Services", module: "Employee Relations & Disciplinary", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
  { domain: "Employee Relations & Services", module: "Travel & Expense Management", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
  { domain: "Employee Relations & Services", module: "Financial Services (Loans)", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
  { domain: "Employee Relations & Services", module: "Corporate Communications", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
  
  // Performance & Talent Development
  { domain: "Performance & Talent Development", module: "Performance & Goals", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
  { domain: "Performance & Talent Development", module: "Learning Management (LMS)", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
  { domain: "Performance & Talent Development", module: "Succession & Career Pathing", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
  
  // Compensation & Benefits
  { domain: "Compensation & Benefits", module: "Compensation Management", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
  { domain: "Compensation & Benefits", module: "Benefits Administration", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
  
  // Payroll
  { domain: "Payroll", module: "Global Payroll Processing", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
  { domain: "Payroll", module: "Post-Payroll Integrations", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
  
  // Health, Safety & Well-being
  { domain: "Health, Safety & Well-being", module: "EHS (Environment, Health, Safety)", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
  { domain: "Health, Safety & Well-being", module: "Employee Well-being", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
  
  // Knowledge Management
  { domain: "Knowledge Management", module: "Expertise Directory & Knowledge Base", backend: "complete", frontend: "complete", routes: "complete", models: "complete", status: "operational" },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "operational":
      return <span className="badge badge-success">✓ جاهز</span>;
    case "in_progress":
      return <span className="badge badge-warning">⏳ قيد العمل</span>;
    case "pending":
      return <span className="badge badge-secondary">○ معلق</span>;
    default:
      return <span className="badge badge-secondary">{status}</span>;
  }
};

const getComponentStatus = (status: string) => {
  switch (status) {
    case "complete":
      return <span className="badge badge-success">✓</span>;
    case "partial":
      return <span className="badge badge-warning">~</span>;
    case "missing":
      return <span className="badge badge-danger">✗</span>;
    default:
      return <span className="badge badge-secondary">-</span>;
  }
};

export function ModulesStatus() {
  const [filterDomain, setFilterDomain] = useState("");

  const uniqueDomains = Array.from(new Set(modules.map(m => m.domain)));
  const filteredModules = filterDomain 
    ? modules.filter(m => m.domain === filterDomain)
    : modules;

  const columns: Column<ModuleStatus>[] = [
    {
      key: "domain",
      header: "المجال",
      dataLabel: "المجال",
    },
    {
      key: "module",
      header: "الوحدة",
      dataLabel: "الوحدة",
    },
    {
      key: "backend",
      header: "الخلفية",
      dataLabel: "الخلفية",
      render: (item) => getComponentStatus(item.backend),
    },
    {
      key: "frontend",
      header: "الواجهة",
      dataLabel: "الواجهة",
      render: (item) => getComponentStatus(item.frontend),
    },
    {
      key: "routes",
      header: "المسارات",
      dataLabel: "المسارات",
      render: (item) => getComponentStatus(item.routes),
    },
    {
      key: "models",
      header: "النماذج",
      dataLabel: "النماذج",
      render: (item) => getComponentStatus(item.models),
    },
    {
      key: "status",
      header: "الحالة",
      dataLabel: "الحالة",
      render: (item) => getStatusBadge(item.status),
    },
  ];

  const stats = {
    total: modules.length,
    operational: modules.filter(m => m.status === "operational").length,
    complete: modules.filter(m => m.backend === "complete" && m.frontend === "complete").length,
  };

  return (
    <div className="sales-card animate-fade">
      <div className="card-header-flex" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ margin: 0 }}>{getIcon("check-circle")} حالة الوحدات</h3>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="form-select"
            style={{ minWidth: '200px' }}
          >
            <option value="">جميع المجالات</option>
            {uniqueDomains.map(domain => (
              <option key={domain} value={domain}>{domain}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-card" style={{ padding: '1.5rem', background: 'var(--surface-white)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{stats.total}</div>
          <div style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>إجمالي الوحدات</div>
        </div>
        <div className="stat-card" style={{ padding: '1.5rem', background: 'var(--surface-white)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success-color)' }}>{stats.operational}</div>
          <div style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>جاهز للعمل</div>
        </div>
        <div className="stat-card" style={{ padding: '1.5rem', background: 'var(--surface-white)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--info-color)' }}>{stats.complete}</div>
          <div style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>مكتمل بالكامل</div>
        </div>
        <div className="stat-card" style={{ padding: '1.5rem', background: 'var(--surface-white)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success-color)' }}>100%</div>
          <div style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>نسبة الإنجاز</div>
        </div>
      </div>

      <Table
        columns={columns}
        data={filteredModules}
        keyExtractor={(item, index) => `${item.domain}-${item.module}-${index}`}
        emptyMessage="لا توجد وحدات"
        isLoading={false}
      />
    </div>
  );
}


