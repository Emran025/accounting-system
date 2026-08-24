"use client";

import { useEffect, useMemo, useState } from "react";
import { MainLayout, PageSubHeader } from "@/components/layout";
import { ActionButtons, Button, Column, Dialog, Table, showToast } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { canAccess, checkAuth, getStoredPermissions, getStoredUser, Permission, User } from "@/lib/auth";

type MarketplaceTab = "merchants" | "publications" | "offers" | "outbox";
type LocalizedValue = { ar?: string | null; en?: string | null };

type Merchant = {
    id: string;
    slug: string;
    display_name: LocalizedValue;
    status: string;
    verified_at?: string | null;
    revision: number;
};

type Publication = {
    id: string;
    merchant_id: string;
    product_id: number;
    public_slug: string;
    public_name: LocalizedValue;
    status: string;
    availability: string;
    public_price?: { amount: number; currency: string } | null;
    revision: number;
};

type Offer = {
    id: string;
    merchant_id: string;
    slug: string;
    title: LocalizedValue;
    status: string;
    starts_at?: string | null;
    ends_at?: string | null;
    revision: number;
};

type OutboxEvent = {
    id: string;
    event_type: string;
    aggregate_revision: number;
    status: string;
    attempts: number;
    available_at?: string | null;
    delivered_at?: string | null;
    last_error?: string | null;
};

const endpoint = API_ENDPOINTS.COMMERCIAL.MARKETPLACE;

export default function MarketplaceDashboardPage() {
    const { t: i18n, format } = useI18n();
    const [user, setUser] = useState<User | null>(null);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [activeTab, setActiveTab] = useState<MarketplaceTab>("merchants");
    const [isLoading, setIsLoading] = useState(true);
    const [merchants, setMerchants] = useState<Merchant[]>([]);
    const [publications, setPublications] = useState<Publication[]>([]);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [outbox, setOutbox] = useState<OutboxEvent[]>([]);
    const [dialog, setDialog] = useState<"merchant" | "publication" | "offer" | null>(null);
    const [merchantForm, setMerchantForm] = useState({ slug: "", display_name_ar: "", display_name_en: "" });
    const [publicationForm, setPublicationForm] = useState({ merchant_id: "", product_id: "", public_slug: "", public_name_ar: "", public_name_en: "", public_price: "", currency_code: "SAR", cover_media_url: "" });
    const [offerForm, setOfferForm] = useState({ merchant_id: "", slug: "", title_ar: "", title_en: "", benefit_type: "percentage", benefit_value: "", targets: "[]", starts_at: "", ends_at: "" });

    const canCreate = canAccess(permissions, "marketplace", "create");
    const canEdit = canAccess(permissions, "marketplace", "edit");

    const displayLocalized = (value: LocalizedValue) => value.ar || value.en || "—";
    const formatDate = (value?: string | null) => value ? format.date(value) : "—";

    const loadAll = async () => {
        setIsLoading(true);
        try {
            const [merchantResponse, publicationResponse, offerResponse, outboxResponse]: any[] = await Promise.all([
                fetchAPI(`${endpoint.MERCHANTS.BASE}?per_page=50`),
                fetchAPI(`${endpoint.PUBLICATIONS.BASE}?per_page=50`),
                fetchAPI(`${endpoint.OFFERS.BASE}?per_page=50`),
                fetchAPI(`${endpoint.OUTBOX.BASE}?per_page=50`),
            ]);
            setMerchants(merchantResponse.data ?? []);
            setPublications(publicationResponse.data ?? []);
            setOffers(offerResponse.data ?? []);
            setOutbox(outboxResponse.data ?? []);
        } catch (error) {
            console.error(error);
            showToast(i18n.catalog["marketplace.messages.loadFailed"], "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const initialize = async () => {
            if (!await checkAuth()) return;
            setUser(getStoredUser());
            setPermissions(getStoredPermissions());
            await loadAll();
        };
        void initialize();
    }, []);

    const requestAction = async (url: string, method: "POST" | "PUT" = "POST", body?: unknown) => {
        try {
            const response: any = await fetchAPI(url, {
                method,
                body: body ? JSON.stringify(body) : undefined,
            });
            if (response.success === false) throw new Error(response.message || "Request failed");
            await loadAll();
            return true;
        } catch (error: any) {
            showToast(error?.message || i18n.catalog["marketplace.messages.loadFailed"], "error");
            return false;
        }
    };

    const submitMerchant = async () => {
        if (!merchantForm.slug || !merchantForm.display_name_ar) return;
        if (await requestAction(endpoint.MERCHANTS.BASE, "POST", merchantForm)) {
            setDialog(null);
            setMerchantForm({ slug: "", display_name_ar: "", display_name_en: "" });
        }
    };

    const submitPublication = async () => {
        if (!publicationForm.merchant_id || !publicationForm.product_id || !publicationForm.public_slug) return;
        const payload = {
            ...publicationForm,
            product_id: Number(publicationForm.product_id),
            public_price: publicationForm.public_price ? Number(publicationForm.public_price) : null,
        };
        if (await requestAction(endpoint.PUBLICATIONS.BASE, "POST", payload)) {
            setDialog(null);
            setPublicationForm({ merchant_id: "", product_id: "", public_slug: "", public_name_ar: "", public_name_en: "", public_price: "", currency_code: "SAR", cover_media_url: "" });
        }
    };

    const submitOffer = async () => {
        try {
            const targets = JSON.parse(offerForm.targets);
            if (!offerForm.merchant_id || !offerForm.slug || !offerForm.title_ar || !Array.isArray(targets)) return;
            const payload = { ...offerForm, targets, benefit_value: Number(offerForm.benefit_value || 0) };
            if (await requestAction(endpoint.OFFERS.BASE, "POST", payload)) {
                setDialog(null);
                setOfferForm({ merchant_id: "", slug: "", title_ar: "", title_en: "", benefit_type: "percentage", benefit_value: "", targets: "[]", starts_at: "", ends_at: "" });
            }
        } catch {
            showToast(i18n.catalog["marketplace.messages.invalidTargets"], "error");
        }
    };

    const merchantColumns: Column<Merchant>[] = useMemo(() => [
        { key: "slug", header: i18n.catalog["marketplace.fields.slug"], dataLabel: i18n.catalog["marketplace.fields.slug"] },
        { key: "display_name", header: i18n.catalog["marketplace.fields.name"], dataLabel: i18n.catalog["marketplace.fields.name"], render: (item) => displayLocalized(item.display_name) },
        { key: "status", header: i18n.catalog["marketplace.fields.status"], dataLabel: i18n.catalog["marketplace.fields.status"], render: (item) => <span className="badge badge-info">{item.status}</span> },
        { key: "revision", header: i18n.catalog["marketplace.fields.revision"], dataLabel: i18n.catalog["marketplace.fields.revision"] },
        {
            key: "actions", header: i18n.catalog["common.general.actions"], dataLabel: i18n.catalog["common.general.actions"], render: (item) => (
                <ActionButtons actions={[
                    { icon: "check", title: i18n.catalog["marketplace.actions.verify"], variant: "edit", hidden: !canEdit || item.status === "verified", onClick: () => void requestAction(endpoint.MERCHANTS.verify(item.id)) },
                ]} />
            ),
        },
    ], [canEdit, i18n.catalog]);

    const publicationColumns: Column<Publication>[] = useMemo(() => [
        { key: "public_slug", header: i18n.catalog["marketplace.fields.slug"], dataLabel: i18n.catalog["marketplace.fields.slug"] },
        { key: "public_name", header: i18n.catalog["marketplace.fields.name"], dataLabel: i18n.catalog["marketplace.fields.name"], render: (item) => displayLocalized(item.public_name) },
        { key: "availability", header: i18n.catalog["marketplace.fields.availability"], dataLabel: i18n.catalog["marketplace.fields.availability"] },
        { key: "public_price", header: i18n.catalog["marketplace.fields.price"], dataLabel: i18n.catalog["marketplace.fields.price"], render: (item) => item.public_price ? format.currency(item.public_price.amount, item.public_price.currency) : "—" },
        { key: "status", header: i18n.catalog["marketplace.fields.status"], dataLabel: i18n.catalog["marketplace.fields.status"], render: (item) => <span className="badge badge-info">{item.status}</span> },
        {
            key: "actions", header: i18n.catalog["common.general.actions"], dataLabel: i18n.catalog["common.general.actions"], render: (item) => (
                <ActionButtons actions={[
                    { icon: "check", title: i18n.catalog["marketplace.actions.publish"], variant: "edit", hidden: !canEdit || item.status === "published", onClick: () => void requestAction(endpoint.PUBLICATIONS.publish(item.id)) },
                    { icon: "x", title: i18n.catalog["marketplace.actions.withdraw"], variant: "delete", hidden: !canEdit || item.status !== "published", onClick: () => void requestAction(endpoint.PUBLICATIONS.withdraw(item.id)) },
                ]} />
            ),
        },
    ], [canEdit, format, i18n.catalog]);

    const offerColumns: Column<Offer>[] = useMemo(() => [
        { key: "slug", header: i18n.catalog["marketplace.fields.slug"], dataLabel: i18n.catalog["marketplace.fields.slug"] },
        { key: "title", header: i18n.catalog["marketplace.fields.title"], dataLabel: i18n.catalog["marketplace.fields.title"], render: (item) => displayLocalized(item.title) },
        { key: "starts_at", header: i18n.catalog["marketplace.fields.window"], dataLabel: i18n.catalog["marketplace.fields.window"], render: (item) => `${formatDate(item.starts_at)} — ${formatDate(item.ends_at)}` },
        { key: "status", header: i18n.catalog["marketplace.fields.status"], dataLabel: i18n.catalog["marketplace.fields.status"], render: (item) => <span className="badge badge-info">{item.status}</span> },
        {
            key: "actions", header: i18n.catalog["common.general.actions"], dataLabel: i18n.catalog["common.general.actions"], render: (item) => (
                <ActionButtons actions={[
                    { icon: "check", title: i18n.catalog["marketplace.actions.publish"], variant: "edit", hidden: !canEdit || ["published", "scheduled"].includes(item.status), onClick: () => void requestAction(endpoint.OFFERS.publish(item.id)) },
                    { icon: "x", title: i18n.catalog["marketplace.actions.withdraw"], variant: "delete", hidden: !canEdit || !["published", "scheduled"].includes(item.status), onClick: () => void requestAction(endpoint.OFFERS.withdraw(item.id)) },
                ]} />
            ),
        },
    ], [canEdit, i18n.catalog]);

    const outboxColumns: Column<OutboxEvent>[] = useMemo(() => [
        { key: "event_type", header: i18n.catalog["marketplace.fields.event"], dataLabel: i18n.catalog["marketplace.fields.event"] },
        { key: "status", header: i18n.catalog["marketplace.fields.status"], dataLabel: i18n.catalog["marketplace.fields.status"], render: (item) => <span className="badge badge-info">{item.status}</span> },
        { key: "attempts", header: i18n.catalog["marketplace.fields.attempts"], dataLabel: i18n.catalog["marketplace.fields.attempts"] },
        { key: "available_at", header: i18n.catalog["marketplace.fields.available"], dataLabel: i18n.catalog["marketplace.fields.available"], render: (item) => formatDate(item.available_at) },
        { key: "delivered_at", header: i18n.catalog["marketplace.fields.delivered"], dataLabel: i18n.catalog["marketplace.fields.delivered"], render: (item) => formatDate(item.delivered_at) },
        { key: "last_error", header: i18n.catalog["marketplace.fields.lastError"], dataLabel: i18n.catalog["marketplace.fields.lastError"], render: (item) => item.last_error || "—" },
    ], [i18n.catalog]);

    const table = activeTab === "merchants" ? <Table columns={merchantColumns} data={merchants} keyExtractor={(item) => item.id} isLoading={isLoading} />
        : activeTab === "publications" ? <Table columns={publicationColumns} data={publications} keyExtractor={(item) => item.id} isLoading={isLoading} />
        : activeTab === "offers" ? <Table columns={offerColumns} data={offers} keyExtractor={(item) => item.id} isLoading={isLoading} />
        : <Table columns={outboxColumns} data={outbox} keyExtractor={(item) => item.id} isLoading={isLoading} />;

    return (
        <MainLayout>
            <div className="sales-card animate-fade">
                <PageSubHeader
                    user={user}
                    title={i18n.catalog["marketplace.title"]}
                    subTitle={i18n.catalog["marketplace.subtitle"]}
                    actions={<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {activeTab === "merchants" && canCreate && <Button variant="primary" icon="plus" onClick={() => setDialog("merchant")}>{i18n.catalog["marketplace.actions.createMerchant"]}</Button>}
                        {activeTab === "publications" && canCreate && <Button variant="primary" icon="plus" onClick={() => setDialog("publication")}>{i18n.catalog["marketplace.actions.createPublication"]}</Button>}
                        {activeTab === "offers" && canCreate && <Button variant="primary" icon="plus" onClick={() => setDialog("offer")}>{i18n.catalog["marketplace.actions.createOffer"]}</Button>}
                        {activeTab === "outbox" && canEdit && <Button variant="primary" icon="refresh-cw" onClick={async () => { if (await requestAction(endpoint.OUTBOX.dispatch)) showToast(i18n.catalog["marketplace.messages.dispatchComplete"], "success"); }}>{i18n.catalog["marketplace.actions.dispatch"]}</Button>}
                    </div>}
                />

                <div style={{ display: "flex", gap: "0.5rem", padding: "0 1rem 1rem", flexWrap: "wrap" }}>
                    {(["merchants", "publications", "offers", "outbox"] as MarketplaceTab[]).map((tab) => (
                        <Button key={tab} variant={activeTab === tab ? "primary" : "outline"} size="sm" onClick={() => setActiveTab(tab)}>
                            {i18n.catalog[`marketplace.tabs.${tab}` as keyof typeof i18n.catalog]}
                        </Button>
                    ))}
                </div>
                {table}
            </div>

            <Dialog isOpen={dialog === "merchant"} onClose={() => setDialog(null)} title={i18n.catalog["marketplace.actions.createMerchant"]} maxWidth="560px" footer={<><Button variant="secondary" onClick={() => setDialog(null)}>{i18n.catalog["common.general.cancel"]}</Button><Button variant="primary" onClick={() => void submitMerchant()}>{i18n.catalog["common.general.add"]}</Button></>}>
                <div className="form-group"><label>{i18n.catalog["marketplace.fields.slug"]}</label><input value={merchantForm.slug} onChange={(event) => setMerchantForm({ ...merchantForm, slug: event.target.value })} /></div>
                <div className="form-group"><label>{i18n.catalog["marketplace.fields.arabicName"]}</label><input value={merchantForm.display_name_ar} onChange={(event) => setMerchantForm({ ...merchantForm, display_name_ar: event.target.value })} /></div>
                <div className="form-group"><label>{i18n.catalog["marketplace.fields.englishName"]}</label><input value={merchantForm.display_name_en} onChange={(event) => setMerchantForm({ ...merchantForm, display_name_en: event.target.value })} /></div>
            </Dialog>

            <Dialog isOpen={dialog === "publication"} onClose={() => setDialog(null)} title={i18n.catalog["marketplace.actions.createPublication"]} maxWidth="680px" footer={<><Button variant="secondary" onClick={() => setDialog(null)}>{i18n.catalog["common.general.cancel"]}</Button><Button variant="primary" onClick={() => void submitPublication()}>{i18n.catalog["common.general.add"]}</Button></>}>
                <div className="form-row"><div className="form-group"><label>{i18n.catalog["marketplace.fields.merchantId"]}</label><input value={publicationForm.merchant_id} onChange={(event) => setPublicationForm({ ...publicationForm, merchant_id: event.target.value })} /></div><div className="form-group"><label>{i18n.catalog["marketplace.fields.productId"]}</label><input type="number" value={publicationForm.product_id} onChange={(event) => setPublicationForm({ ...publicationForm, product_id: event.target.value })} /></div></div>
                <div className="form-row"><div className="form-group"><label>{i18n.catalog["marketplace.fields.slug"]}</label><input value={publicationForm.public_slug} onChange={(event) => setPublicationForm({ ...publicationForm, public_slug: event.target.value })} /></div><div className="form-group"><label>{i18n.catalog["marketplace.fields.coverMediaUrl"]}</label><input type="url" value={publicationForm.cover_media_url} onChange={(event) => setPublicationForm({ ...publicationForm, cover_media_url: event.target.value })} /></div></div>
                <div className="form-row"><div className="form-group"><label>{i18n.catalog["marketplace.fields.arabicName"]}</label><input value={publicationForm.public_name_ar} onChange={(event) => setPublicationForm({ ...publicationForm, public_name_ar: event.target.value })} /></div><div className="form-group"><label>{i18n.catalog["marketplace.fields.englishName"]}</label><input value={publicationForm.public_name_en} onChange={(event) => setPublicationForm({ ...publicationForm, public_name_en: event.target.value })} /></div></div>
                <div className="form-row"><div className="form-group"><label>{i18n.catalog["marketplace.fields.price"]}</label><input type="number" min="0" value={publicationForm.public_price} onChange={(event) => setPublicationForm({ ...publicationForm, public_price: event.target.value })} /></div><div className="form-group"><label>{i18n.catalog["marketplace.fields.currency"]}</label><input maxLength={3} value={publicationForm.currency_code} onChange={(event) => setPublicationForm({ ...publicationForm, currency_code: event.target.value.toUpperCase() })} /></div></div>
            </Dialog>

            <Dialog isOpen={dialog === "offer"} onClose={() => setDialog(null)} title={i18n.catalog["marketplace.actions.createOffer"]} maxWidth="680px" footer={<><Button variant="secondary" onClick={() => setDialog(null)}>{i18n.catalog["common.general.cancel"]}</Button><Button variant="primary" onClick={() => void submitOffer()}>{i18n.catalog["common.general.add"]}</Button></>}>
                <div className="form-row"><div className="form-group"><label>{i18n.catalog["marketplace.fields.merchantId"]}</label><input value={offerForm.merchant_id} onChange={(event) => setOfferForm({ ...offerForm, merchant_id: event.target.value })} /></div><div className="form-group"><label>{i18n.catalog["marketplace.fields.slug"]}</label><input value={offerForm.slug} onChange={(event) => setOfferForm({ ...offerForm, slug: event.target.value })} /></div></div>
                <div className="form-row"><div className="form-group"><label>{i18n.catalog["marketplace.fields.arabicName"]}</label><input value={offerForm.title_ar} onChange={(event) => setOfferForm({ ...offerForm, title_ar: event.target.value })} /></div><div className="form-group"><label>{i18n.catalog["marketplace.fields.englishName"]}</label><input value={offerForm.title_en} onChange={(event) => setOfferForm({ ...offerForm, title_en: event.target.value })} /></div></div>
                <div className="form-row"><div className="form-group"><label>{i18n.catalog["marketplace.fields.benefitType"]}</label><select value={offerForm.benefit_type} onChange={(event) => setOfferForm({ ...offerForm, benefit_type: event.target.value })}><option value="percentage">{i18n.catalog["marketplace.options.percentage"]}</option><option value="fixed_amount">{i18n.catalog["marketplace.options.fixedAmount"]}</option><option value="fixed_price">{i18n.catalog["marketplace.options.fixedPrice"]}</option><option value="bundle">{i18n.catalog["marketplace.options.bundle"]}</option><option value="gift">{i18n.catalog["marketplace.options.gift"]}</option></select></div><div className="form-group"><label>{i18n.catalog["marketplace.fields.benefitValue"]}</label><input type="number" min="0" value={offerForm.benefit_value} onChange={(event) => setOfferForm({ ...offerForm, benefit_value: event.target.value })} /></div></div>
                <div className="form-group"><label>{i18n.catalog["marketplace.fields.targetsJson"]}</label><textarea rows={3} value={offerForm.targets} onChange={(event) => setOfferForm({ ...offerForm, targets: event.target.value })} placeholder={'[{"type":"publication","id":"uuid"}]'} /></div>
                <div className="form-row"><div className="form-group"><label>{i18n.catalog["marketplace.fields.startsAt"]}</label><input type="datetime-local" value={offerForm.starts_at} onChange={(event) => setOfferForm({ ...offerForm, starts_at: event.target.value })} /></div><div className="form-group"><label>{i18n.catalog["marketplace.fields.endsAt"]}</label><input type="datetime-local" value={offerForm.ends_at} onChange={(event) => setOfferForm({ ...offerForm, ends_at: event.target.value })} /></div></div>
            </Dialog>
        </MainLayout>
    );
}
