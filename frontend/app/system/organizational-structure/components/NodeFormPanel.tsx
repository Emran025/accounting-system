"use client";

import { useState, useMemo, ReactNode } from "react";
import { Button, Dialog } from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/select";
import { getIcon } from "@/lib/icons";
import { MetaGrid, MetaItem } from "./ui/MetaItem";
import { CheckItem } from "./ui/StatusWidgets";
import { DOMAIN_COLORS, DOMAIN_ICONS } from "./ui";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MetaType {
    id: string;
    display_name: string;
    display_name_ar?: string;
    level_domain: string;
    attributes?: { attribute_key: string; is_mandatory: boolean; attribute_type: string }[];
}

interface StructureNode {
    node_uuid: string;
    node_type_id: string;
    code: string;
    attributes_json?: Record<string, unknown>;
    status: string;
    valid_from?: string;
    valid_to?: string;
    meta_type?: MetaType;
    outgoing_links?: { id: number }[];
    incoming_links?: { id: number }[];
}

interface TopologyRule {
    id: number;
    source_node_type_id: string;
    target_node_type_id: string;
    cardinality: string;
}

export interface NodeFormData {
    node_type_id: string;
    code: string;
    status: string;
    target_node_uuid: string;
    validate_constraints: boolean;
    valid_from: string;
    valid_to: string;
}

/* ------------------------------------------------------------------ */
/*  Internal sub-components                                            */
/* ------------------------------------------------------------------ */

/** Section divider with icon + title */
function FormSection({ icon, title, subtitle, children }: {
    icon: string; title: string; subtitle?: string; children: ReactNode;
}) {
    return (
        <div style={{ marginBottom: "1.25rem" }}>
            <div style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                marginBottom: "0.6rem",
                paddingBottom: "0.4rem",
                borderBottom: "1px solid var(--border-color)",
            }}>
                <span style={{ color: "var(--primary)", fontSize: "1rem" }}>{getIcon(icon)}</span>
                <div>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>{title}</span>
                    {subtitle && (
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginInlineStart: "0.5rem" }}>
                            {subtitle}
                        </span>
                    )}
                </div>
            </div>
            {children}
        </div>
    );
}

/** Wizard step indicator */
function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
    return (
        <div style={{
            display: "flex", justifyContent: "center", gap: "0.5rem",
            marginBottom: "1.5rem", padding: "0.75rem 0",
        }}>
            {steps.map((label, idx) => {
                const isActive = idx === current;
                const isDone = idx < current;
                return (
                    <div key={idx} style={{
                        display: "flex", alignItems: "center", gap: "0.35rem",
                    }}>
                        {idx > 0 && (
                            <div style={{
                                width: "28px", height: "2px",
                                background: isDone ? "var(--primary)" : "var(--border-color)",
                                transition: "background 0.3s",
                            }} />
                        )}
                        <div style={{
                            display: "flex", alignItems: "center", gap: "0.35rem",
                            padding: "4px 10px", borderRadius: "20px",
                            background: isActive ? "var(--primary)" : isDone ? "var(--primary)" + "18" : "var(--bg-secondary)",
                            color: isActive ? "white" : isDone ? "var(--primary)" : "var(--text-muted)",
                            fontSize: "0.72rem", fontWeight: isActive ? 700 : 500,
                            transition: "all 0.3s",
                            whiteSpace: "nowrap",
                        }}>
                            {isDone ? getIcon("check") : (
                                <span style={{
                                    width: "16px", height: "16px", borderRadius: "50%",
                                    background: isActive ? "rgba(255,255,255,0.25)" : "var(--border-color)",
                                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "0.65rem", fontWeight: 700,
                                    color: isActive ? "white" : "var(--text-muted)",
                                }}>{idx + 1}</span>
                            )}
                            {label}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  NodeFormContent — the actual form (used in both dialog & inline)   */
/* ------------------------------------------------------------------ */

interface NodeFormContentProps {
    formData: NodeFormData;
    setFormData: (data: NodeFormData) => void;
    dynamicAttrs: Record<string, string>;
    setDynamicAttrs: (attrs: Record<string, string>) => void;
    metaTypes: MetaType[];
    nodes: StructureNode[];
    topologyRules: TopologyRule[];
    selectedNode: StructureNode | null;
    getTypeLabel: (id: string) => string;
}

export function NodeFormContent({
    formData, setFormData, dynamicAttrs, setDynamicAttrs,
    metaTypes, nodes, topologyRules, selectedNode, getTypeLabel,
}: NodeFormContentProps) {
    const currentType = metaTypes.find(t => t.id === formData.node_type_id);
    const currentAttrs = currentType?.attributes || [];
    const domain = currentType?.level_domain || "";
    const domainColor = DOMAIN_COLORS[domain] || "#6b7280";

    const linkableNodes = useMemo(() => {
        if (selectedNode) return [];
        return nodes.filter(n =>
            topologyRules.some(r =>
                r.source_node_type_id === formData.node_type_id &&
                r.target_node_type_id === n.node_type_id
            )
        );
    }, [nodes, topologyRules, formData.node_type_id, selectedNode]);

    // grouped meta types by domain
    const domainGroups = useMemo(() => {
        const map = new Map<string, MetaType[]>();
        metaTypes.forEach(t => {
            const list = map.get(t.level_domain) || [];
            list.push(t);
            map.set(t.level_domain, list);
        });
        return map;
    }, [metaTypes]);

    return (
        <div style={{ animation: "fadeIn 0.25s ease" }}>
            {/* ── Section 1: Node Type ── */}
            <FormSection icon="cube" title="نوع الوحدة" subtitle="Unit Type">
                {/* Domain indicator */}
                {domain && (
                    <div style={{
                        display: "inline-flex", alignItems: "center", gap: "0.4rem",
                        marginBottom: "0.75rem", padding: "4px 10px",
                        borderRadius: "6px", background: domainColor + "12",
                        fontSize: "0.75rem", fontWeight: 600, color: domainColor,
                    }}>
                        {getIcon(DOMAIN_ICONS[domain] || "folder")} {domain}
                    </div>
                )}
                <div className="form-row">
                    <div className="form-group">
                        <Select
                            label="نوع الوحدة *"
                            value={formData.node_type_id}
                            onChange={(e) => {
                                setFormData({ ...formData, node_type_id: e.target.value });
                                setDynamicAttrs({});
                            }}
                            disabled={!!selectedNode}
                        >
                            <option value="" disabled>— اختر النوع —</option>
                            {Array.from(domainGroups.entries()).map(([groupDomain, types]) => (
                                <optgroup key={groupDomain} label={groupDomain}>
                                    {types.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.display_name_ar || t.display_name}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </Select>
                    </div>
                    <div className="form-group">
                        <TextInput
                            label="الرمز *"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            placeholder="مثال: CC01, PLANT_01"
                        />
                    </div>
                </div>
            </FormSection>

            {/* ── Section 2: Dynamic Attributes ── */}
            {currentAttrs.length > 0 && (
                <FormSection
                    icon="clipboard-list"
                    title="السمات"
                    subtitle={`Attributes — ${currentAttrs.filter(a => a.is_mandatory).length} إلزامية`}
                >
                    <div className="form-row" style={{ flexWrap: "wrap" }}>
                        {currentAttrs.map(attr => (
                            <div className="form-group" key={attr.attribute_key} style={{ minWidth: "200px" }}>
                                <TextInput
                                    label={`${attr.attribute_key}${attr.is_mandatory ? " *" : ""}`}
                                    value={dynamicAttrs[attr.attribute_key] || ""}
                                    onChange={(e) => setDynamicAttrs({
                                        ...dynamicAttrs,
                                        [attr.attribute_key]: e.target.value,
                                    })}
                                    placeholder={attr.is_mandatory ? "مطلوب" : "اختياري"}
                                />
                            </div>
                        ))}
                    </div>
                </FormSection>
            )}

            {/* ── Section 3: Effective Dating ── */}
            <FormSection icon="calendar" title="فترة الصلاحية" subtitle="Effective Dating">
                <div className="form-row">
                    <div className="form-group">
                        <TextInput
                            label="صالح من"
                            type="date"
                            value={formData.valid_from}
                            onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <TextInput
                            label="صالح حتى"
                            type="date"
                            value={formData.valid_to}
                            onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                        />
                    </div>
                </div>
            </FormSection>

            {/* ── Section 4: Link ── */}
            {!selectedNode && linkableNodes.length > 0 && (
                <FormSection icon="link" title="الربط الهيكلي" subtitle="Structure Link">
                    <Select
                        label="ربط بـ (اختياري)"
                        value={formData.target_node_uuid}
                        onChange={(e) => setFormData({ ...formData, target_node_uuid: e.target.value })}
                    >
                        <option value="">بدون ربط</option>
                        {linkableNodes.map(n => (
                            <option key={n.node_uuid} value={n.node_uuid}>
                                {n.code} — {getTypeLabel(n.node_type_id)}
                                {(n.attributes_json as Record<string, unknown>)?.name
                                    ? ` (${(n.attributes_json as Record<string, unknown>).name})`
                                    : ""}
                            </option>
                        ))}
                    </Select>
                </FormSection>
            )}

            {/* ── Section 5: Status ── */}
            <FormSection icon="toggle-on" title="الحالة" subtitle="Status">
                <Select
                    label="الحالة"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    options={[
                        { value: "active", label: "نشط (Active)" },
                        { value: "inactive", label: "غير نشط (Inactive)" },
                        { value: "archived", label: "مؤرشف (Archived)" },
                    ]}
                />
            </FormSection>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  NodeFormDialog — wrapper Dialog (for subsequent adds / edits)      */
/* ------------------------------------------------------------------ */

interface NodeFormDialogProps extends NodeFormContentProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void;
}

export function NodeFormDialog({
    isOpen, onClose, onSubmit, selectedNode, ...formProps
}: NodeFormDialogProps) {
    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={selectedNode ? "تعديل الوحدة" : "إضافة وحدة تنظيمية"}
            maxWidth="680px"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>إلغاء</Button>
                    <Button variant="primary" icon="check" onClick={onSubmit}>
                        {selectedNode ? "تحديث" : "إضافة"}
                    </Button>
                </>
            }
        >
            <NodeFormContent selectedNode={selectedNode} {...formProps} />
        </Dialog>
    );
}

/* ------------------------------------------------------------------ */
/*  InitialNodeSetup — inline wizard for first-time node creation     */
/* ------------------------------------------------------------------ */

interface InitialNodeSetupProps extends NodeFormContentProps {
    onSubmit: () => void;
    isSubmitting?: boolean;
}

export function InitialNodeSetup({
    onSubmit, isSubmitting,
    formData, setFormData, dynamicAttrs, setDynamicAttrs,
    metaTypes, nodes, topologyRules, selectedNode, getTypeLabel,
}: InitialNodeSetupProps) {
    const [step, setStep] = useState(0);
    const STEPS = ["اختيار المجال", "تعبئة البيانات", "المراجعة"];

    const currentType = metaTypes.find(t => t.id === formData.node_type_id);
    const domain = currentType?.level_domain || "";
    const domainColor = DOMAIN_COLORS[domain] || "#6b7280";
    const currentAttrs = currentType?.attributes || [];

    // grouped meta types by domain for step 0
    const domainGroups = useMemo(() => {
        const map = new Map<string, MetaType[]>();
        metaTypes.forEach(t => {
            const list = map.get(t.level_domain) || [];
            list.push(t);
            map.set(t.level_domain, list);
        });
        return map;
    }, [metaTypes]);

    const canProceedStep0 = !!formData.node_type_id;
    const canProceedStep1 = formData.code.trim().length > 0 && currentAttrs
        .filter(a => a.is_mandatory)
        .every(a => (dynamicAttrs[a.attribute_key] || "").trim().length > 0);

    /* ── Step 0: Choose Domain & Type ── */
    const renderStep0 = () => (
        <div style={{ animation: "fadeIn 0.3s ease" }}>
            {/* Welcome header */}
            <div style={{
                textAlign: "center", marginBottom: "2rem",
                padding: "1.5rem", borderRadius: "12px",
                background: "linear-gradient(135deg, var(--primary)08, var(--primary)15)",
                border: "1px solid var(--primary)20",
            }}>
                <div style={{ fontSize: "3rem", marginBottom: "0.75rem", opacity: 0.8 }}>
                    {getIcon("sitemap")}
                </div>
                <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem" }}>
                    ابدأ ببناء الهيكل التنظيمي
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
                    اختر مجال الأعمال ونوع الوحدة التنظيمية الأولى التي تريد إنشاءها
                </p>
            </div>

            {/* Domain cards grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "0.75rem", marginBottom: "1.5rem",
            }}>
                {Array.from(domainGroups.entries()).map(([groupDomain, types]) => {
                    const isSelected = domain === groupDomain;
                    const color = DOMAIN_COLORS[groupDomain] || "#6b7280";
                    const icon = DOMAIN_ICONS[groupDomain] || "folder";
                    return (
                        <div
                            key={groupDomain}
                            onClick={() => {
                                const firstType = types[0];
                                if (firstType) {
                                    setFormData({ ...formData, node_type_id: firstType.id });
                                    setDynamicAttrs({});
                                }
                            }}
                            style={{
                                padding: "1rem",
                                borderRadius: "10px",
                                border: `2px solid ${isSelected ? color : "var(--border-color)"}`,
                                background: isSelected ? color + "10" : "var(--bg-primary)",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                textAlign: "center",
                            }}
                            onMouseEnter={e => {
                                if (!isSelected) e.currentTarget.style.borderColor = color + "60";
                            }}
                            onMouseLeave={e => {
                                if (!isSelected) e.currentTarget.style.borderColor = "var(--border-color)";
                            }}
                        >
                            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem", color }}>{getIcon(icon)}</div>
                            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: isSelected ? color : "var(--text-primary)" }}>
                                {groupDomain}
                            </div>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                {types.length} {types.length === 1 ? "نوع" : "أنواع"}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Type selector within chosen domain */}
            {domain && (
                <div style={{
                    padding: "1rem", borderRadius: "10px",
                    border: `1px solid ${domainColor}30`,
                    background: domainColor + "06",
                    animation: "fadeIn 0.25s ease",
                }}>
                    <div style={{
                        fontSize: "0.78rem", fontWeight: 600, marginBottom: "0.6rem",
                        color: domainColor, display: "flex", alignItems: "center", gap: "0.35rem",
                    }}>
                        {getIcon(DOMAIN_ICONS[domain] || "folder")} أنواع الوحدات في {domain}
                    </div>
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                        {(domainGroups.get(domain) || []).map(t => {
                            const isActive = formData.node_type_id === t.id;
                            return (
                                <div
                                    key={t.id}
                                    onClick={() => {
                                        setFormData({ ...formData, node_type_id: t.id });
                                        setDynamicAttrs({});
                                    }}
                                    style={{
                                        display: "flex", alignItems: "center", gap: "0.6rem",
                                        padding: "0.55rem 0.75rem",
                                        borderRadius: "8px",
                                        border: `1.5px solid ${isActive ? domainColor : "transparent"}`,
                                        background: isActive ? domainColor + "15" : "var(--bg-primary)",
                                        cursor: "pointer",
                                        transition: "all 0.15s",
                                    }}
                                >
                                    <span style={{
                                        width: "8px", height: "8px", borderRadius: "50%",
                                        background: isActive ? domainColor : "var(--border-color)",
                                        flexShrink: 0, transition: "background 0.2s",
                                    }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: "0.82rem", fontWeight: isActive ? 600 : 400,
                                            color: isActive ? domainColor : "var(--text-primary)",
                                        }}>
                                            {t.display_name_ar || t.display_name}
                                        </div>
                                        {t.display_name_ar && (
                                            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                                                {t.display_name}
                                            </div>
                                        )}
                                    </div>
                                    {t.attributes && t.attributes.length > 0 && (
                                        <span style={{
                                            fontSize: "0.65rem", color: "var(--text-muted)",
                                            background: "var(--bg-secondary)", padding: "1px 6px",
                                            borderRadius: "4px",
                                        }}>
                                            {t.attributes.length} سمات
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );

    /* ── Step 1: Fill Details ── */
    const renderStep1 = () => (
        <div style={{ animation: "fadeIn 0.3s ease" }}>
            {/* Type badge summary */}
            {currentType && (
                <div style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    marginBottom: "1.25rem", padding: "0.75rem 1rem",
                    borderRadius: "10px", background: domainColor + "08",
                    borderRight: `4px solid ${domainColor}`,
                }}>
                    <span style={{ fontSize: "1.5rem", color: domainColor }}>{getIcon(DOMAIN_ICONS[domain] || "folder")}</span>
                    <div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: domainColor }}>
                            {currentType.display_name_ar || currentType.display_name}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            {domain} • {currentAttrs.length} سمات
                        </div>
                    </div>
                </div>
            )}

            <NodeFormContent
                formData={formData}
                setFormData={setFormData}
                dynamicAttrs={dynamicAttrs}
                setDynamicAttrs={setDynamicAttrs}
                metaTypes={metaTypes}
                nodes={nodes}
                topologyRules={topologyRules}
                selectedNode={selectedNode}
                getTypeLabel={getTypeLabel}
            />
        </div>
    );

    /* ── Step 2: Review & Confirm ── */
    const renderStep2 = () => (
        <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{
                textAlign: "center", marginBottom: "1.5rem",
                padding: "1.25rem", borderRadius: "12px",
                background: "linear-gradient(135deg, var(--success)08, var(--success)18)",
                border: "1px solid var(--success)25",
            }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem", color: "var(--success)" }}>
                    {getIcon("check-circle")}
                </div>
                <h4 style={{ margin: "0 0 0.4rem" }}>مراجعة قبل الإنشاء</h4>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
                    تأكد من صحة البيانات قبل إضافة الوحدة التنظيمية
                </p>
            </div>

            {/* Review card */}
            <div className="sales-card" style={{ padding: "1.25rem" }}>
                <MetaGrid items={[
                    { label: "النوع", value: currentType?.display_name_ar || currentType?.display_name || "-" },
                    { label: "المجال", value: domain || "-" },
                    { label: "الرمز", value: formData.code || "-" },
                    { label: "الحالة", value: formData.status === "active" ? "نشط" : formData.status === "inactive" ? "غير نشط" : "مؤرشف" },
                    ...(formData.valid_from ? [{ label: "صالح من", value: formData.valid_from }] : []),
                    ...(formData.valid_to ? [{ label: "صالح حتى", value: formData.valid_to }] : []),
                ]} />

                {/* Dynamic attrs review */}
                {Object.keys(dynamicAttrs).filter(k => dynamicAttrs[k]).length > 0 && (
                    <div style={{ marginTop: "1rem" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                            {getIcon("clipboard-list")} السمات
                        </div>
                        <MetaGrid
                            items={Object.entries(dynamicAttrs)
                                .filter(([, v]) => v)
                                .map(([k, v]) => ({ label: k, value: v }))}
                            minItemWidth="140px"
                        />
                    </div>
                )}

                {/* Link review */}
                {formData.target_node_uuid && (
                    <div style={{ marginTop: "1rem" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                            {getIcon("link")} الربط الهيكلي
                        </div>
                        <MetaItem
                            label="مرتبطة بـ"
                            value={(() => {
                                const target = nodes.find(n => n.node_uuid === formData.target_node_uuid);
                                return target
                                    ? `${target.code} — ${getTypeLabel(target.node_type_id)}`
                                    : formData.target_node_uuid;
                            })()}
                        />
                    </div>
                )}
            </div>

            {/* Validation checks */}
            <div style={{
                display: "flex", flexWrap: "wrap", gap: "0.5rem",
                marginTop: "1rem", justifyContent: "center",
            }}>
                <CheckItem label="النوع محدد" icon={formData.node_type_id ? "check" : "times"} color={formData.node_type_id ? "var(--success)" : "var(--danger)"} />
                <CheckItem label="الرمز معبأ" icon={formData.code ? "check" : "times"} color={formData.code ? "var(--success)" : "var(--danger)"} />
                {currentAttrs.filter(a => a.is_mandatory).map(a => (
                    <CheckItem
                        key={a.attribute_key}
                        label={a.attribute_key}
                        icon={(dynamicAttrs[a.attribute_key] || "").trim() ? "check" : "times"}
                        color={(dynamicAttrs[a.attribute_key] || "").trim() ? "var(--success)" : "var(--danger)"}
                    />
                ))}
            </div>
        </div>
    );

    return (
        <div className="sales-card animate-fade" style={{ padding: "2rem" }}>
            <StepIndicator steps={STEPS} current={step} />

            {/* Step content */}
            {step === 0 && renderStep0()}
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}

            {/* Navigation */}
            <div style={{
                display: "flex", justifyContent: "space-between",
                marginTop: "1.5rem",
                paddingTop: "1rem",
                borderTop: "1px solid var(--border-color)",
            }}>
                <div>
                    {step > 0 && (
                        <Button variant="secondary" icon="chevron-right" onClick={() => setStep(s => s - 1)}>
                            السابق
                        </Button>
                    )}
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                    {step < STEPS.length - 1 ? (
                        <Button
                            variant="primary"
                            icon="chevron-left"
                            iconPosition="right"
                            onClick={() => setStep(s => s + 1)}
                            disabled={step === 0 ? !canProceedStep0 : !canProceedStep1}
                        >
                            التالي
                        </Button>
                    ) : (
                        <Button
                            variant="success"
                            icon="check"
                            onClick={onSubmit}
                            isLoading={isSubmitting}
                            disabled={!canProceedStep1}
                        >
                            إنشاء الوحدة التنظيمية
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
