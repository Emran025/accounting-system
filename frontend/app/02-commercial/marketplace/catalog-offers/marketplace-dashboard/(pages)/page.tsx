"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MainLayout, PageSubHeader } from "@/components/layout";
import { ActionButtons, Button, Column, Dialog, FilterActions, FilterGroup, FilterSection, KPICardRow, SearchableSelect, Table, TextInput, showToast } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { canAccess, checkAuth, getStoredPermissions, getStoredUser, Permission, User } from "@/lib/auth";

type MarketplaceTab = "analytics" | "inquiries" | "merchants" | "publications" | "offers" | "outbox";
type LocalizedValue = { ar?: string | null; en?: string | null };
type Merchant = { id: string; slug: string; display_name: LocalizedValue; status: string; revision: number };
type ProductRef = { id: number; name?: string; catalog_code?: string; barcode?: string; item_type?: string; sellable?: boolean; unit_price?: number };
type Publication = { id: string; merchant_id: string; product_id: number; public_slug: string; public_name: LocalizedValue; status: string; availability: string; public_price?: { amount: number; currency: string } | null; revision: number };
type Offer = { id: string; merchant_id: string; slug: string; title: LocalizedValue; status: string; starts_at?: string | null; ends_at?: string | null; revision: number };
type OutboxEvent = { id: string; event_type: string; aggregate_revision: number; status: string; attempts: number; available_at?: string | null; delivered_at?: string | null; last_error?: string | null };
type CustomerRef = { id: number; name?: string; customer_name?: string; customer_code?: string };
type InquiryItem = { id: string; public_title?: string | null; item_kind: "product" | "service"; requested_quantity: number; product_id?: number | null };
type Inquiry = { id: string; status: string; source: string; channel?: string | null; customer: { name?: string | null; email?: string | null; phone?: string | null }; message?: string | null; requested_at?: string | null; assignment: { user_id?: number | null }; conversion: { type?: string | null; id?: string | null }; items: InquiryItem[] };
type Analytics = { overview: { impressions: number; detail_views: number; inquiries: number; conversions: number; conversion_rate: number; open_inquiries: number; published_products: number; published_offers: number; failed_sync_events: number }; funnel: Record<string, number>; series: Array<{ date: string; impressions: number; detail_views: number; inquiries: number; conversions: number }> };

const endpoint = API_ENDPOINTS.COMMERCIAL.MARKETPLACE;
const emptyAnalytics: Analytics = { overview: { impressions: 0, detail_views: 0, inquiries: 0, conversions: 0, conversion_rate: 0, open_inquiries: 0, published_products: 0, published_offers: 0, failed_sync_events: 0 }, funnel: {}, series: [] };

function unpackList(value: unknown): any[] {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object" && Array.isArray((value as { data?: unknown[] }).data)) return (value as { data: unknown[] }).data;
    return [];
}

function MarketplaceStatus({ value }: { value: string }) {
    return <span className={`marketplace-status marketplace-status--${value.replace(/[^a-z0-9_-]/gi, "")}`}>{value.replaceAll("_", " ")}</span>;
}

export default function MarketplaceDashboardPage() {
    const { t: i18n, format } = useI18n();
    const [user, setUser] = useState<User | null>(null);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [activeTab, setActiveTab] = useState<MarketplaceTab>("analytics");
    const [isLoading, setIsLoading] = useState(true);
    const [merchants, setMerchants] = useState<Merchant[]>([]);
    const [products, setProducts] = useState<ProductRef[]>([]);
    const [customers, setCustomers] = useState<CustomerRef[]>([]);
    const [publications, setPublications] = useState<Publication[]>([]);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [outbox, setOutbox] = useState<OutboxEvent[]>([]);
    const [analytics, setAnalytics] = useState<Analytics>(emptyAnalytics);
    const [dialog, setDialog] = useState<"merchant" | "publication" | "offer" | "inquiry" | "convert" | null>(null);
    const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
    const [search, setSearch] = useState("");
    const [inquiryStatus, setInquiryStatus] = useState("");
    const [analyticsDays, setAnalyticsDays] = useState("30");
    const [merchantForm, setMerchantForm] = useState({ slug: "", display_name_ar: "", display_name_en: "" });
    const [publicationForm, setPublicationForm] = useState({ merchant_id: "", product_id: "", public_slug: "", public_name_ar: "", public_name_en: "", public_price: "", currency_code: "SAR", cover_media_url: "" });
    const [offerForm, setOfferForm] = useState({ merchant_id: "", publication_id: "", slug: "", title_ar: "", title_en: "", benefit_type: "percentage", benefit_value: "", starts_at: "", ends_at: "" });
    const [inquiryForm, setInquiryForm] = useState({ merchant_id: "", product_id: "", customer_name: "", customer_email: "", customer_phone: "", message: "", quantity: "1" });
    const [conversionForm, setConversionForm] = useState({ target: "quotation", customer_id: "", payment_type: "credit" });

    const canCreate = canAccess(permissions, "marketplace", "create");
    const canEdit = canAccess(permissions, "marketplace", "edit");
    const displayLocalized = (value: LocalizedValue) => value.ar || value.en || "—";
    const formatDate = (value?: string | null) => value ? format.date(value) : "—";

    const loadWorkspace = useCallback(async () => {
        setIsLoading(true);
        try {
            const inquiryQuery = new URLSearchParams({ per_page: "100" });
            if (search) inquiryQuery.set("search", search);
            if (inquiryStatus) inquiryQuery.set("status", inquiryStatus);
            const [merchantResponse, productResponse, customerResponse, publicationResponse, offerResponse, inquiryResponse, outboxResponse, analyticsResponse]: any[] = await Promise.all([
                fetchAPI(`${endpoint.MERCHANTS.BASE}?per_page=100`),
                fetchAPI(`${API_ENDPOINTS.SUPPLY_CHAIN.PRODUCTS}?per_page=200`),
                fetchAPI(`${API_ENDPOINTS.COMMERCIAL.CRM.CUSTOMERS}?per_page=200`),
                fetchAPI(`${endpoint.PUBLICATIONS.BASE}?per_page=100`),
                fetchAPI(`${endpoint.OFFERS.BASE}?per_page=100`),
                fetchAPI(`${endpoint.INQUIRIES.BASE}?${inquiryQuery.toString()}`),
                fetchAPI(`${endpoint.OUTBOX.BASE}?per_page=100`),
                fetchAPI(`${endpoint.ANALYTICS.OVERVIEW}?days=${analyticsDays}`),
            ]);
            setMerchants(unpackList(merchantResponse.data) as Merchant[]);
            setProducts(unpackList(productResponse.data) as ProductRef[]);
            setCustomers(unpackList(customerResponse.data) as CustomerRef[]);
            setPublications(unpackList(publicationResponse.data) as Publication[]);
            setOffers(unpackList(offerResponse.data) as Offer[]);
            setInquiries(unpackList(inquiryResponse.data) as Inquiry[]);
            setOutbox(unpackList(outboxResponse.data) as OutboxEvent[]);
            setAnalytics((analyticsResponse.data as Analytics) || emptyAnalytics);
        } catch (error) {
            console.error(error);
            showToast(i18n.catalog["marketplace.messages.loadFailed"], "error");
        } finally {
            setIsLoading(false);
        }
    }, [analyticsDays, inquiryStatus, search, i18n.catalog]);

    useEffect(() => {
        const initialize = async () => {
            if (!await checkAuth()) return;
            setUser(getStoredUser());
            setPermissions(getStoredPermissions());
            await loadWorkspace();
        };
        void initialize();
    }, [loadWorkspace]);

    const requestAction = async (url: string, method: "POST" | "PUT" = "POST", body?: unknown) => {
        try {
            const response: any = await fetchAPI(url, { method, body: body ? JSON.stringify(body) : undefined });
            if (response.success === false) throw new Error(response.message || "Request failed");
            await loadWorkspace();
            return response;
        } catch (error: any) {
            showToast(error?.message || i18n.catalog["marketplace.messages.loadFailed"], "error");
            return null;
        }
    };

    const submitMerchant = async () => {
        if (!merchantForm.slug || !merchantForm.display_name_ar) return;
        if (await requestAction(endpoint.MERCHANTS.BASE, "POST", merchantForm)) { setDialog(null); setMerchantForm({ slug: "", display_name_ar: "", display_name_en: "" }); }
    };
    const submitPublication = async () => {
        if (!publicationForm.merchant_id || !publicationForm.product_id || !publicationForm.public_slug || !publicationForm.cover_media_url) return;
        const payload = { ...publicationForm, product_id: Number(publicationForm.product_id), public_price: publicationForm.public_price ? Number(publicationForm.public_price) : null };
        if (await requestAction(endpoint.PUBLICATIONS.BASE, "POST", payload)) { setDialog(null); setPublicationForm({ merchant_id: "", product_id: "", public_slug: "", public_name_ar: "", public_name_en: "", public_price: "", currency_code: "SAR", cover_media_url: "" }); }
    };
    const submitOffer = async () => {
        if (!offerForm.merchant_id || !offerForm.publication_id || !offerForm.slug || !offerForm.title_ar || !offerForm.starts_at || !offerForm.ends_at) return;
        const payload = { ...offerForm, benefit_value: Number(offerForm.benefit_value || 0), targets: [{ type: "publication", id: offerForm.publication_id }] };
        delete (payload as Partial<typeof payload>).publication_id;
        if (await requestAction(endpoint.OFFERS.BASE, "POST", payload)) { setDialog(null); setOfferForm({ merchant_id: "", publication_id: "", slug: "", title_ar: "", title_en: "", benefit_type: "percentage", benefit_value: "", starts_at: "", ends_at: "" }); }
    };
    const submitInquiry = async () => {
        if (!inquiryForm.product_id) return;
        const product = products.find((entry) => String(entry.id) === inquiryForm.product_id);
        const payload = { merchant_id: inquiryForm.merchant_id || null, customer_name: inquiryForm.customer_name || null, customer_email: inquiryForm.customer_email || null, customer_phone: inquiryForm.customer_phone || null, message: inquiryForm.message || null, items: [{ product_id: Number(inquiryForm.product_id), item_kind: product?.item_type === "service" ? "service" : "product", requested_quantity: Number(inquiryForm.quantity || 1) }] };
        if (await requestAction(endpoint.INQUIRIES.BASE, "POST", payload)) { setDialog(null); setInquiryForm({ merchant_id: "", product_id: "", customer_name: "", customer_email: "", customer_phone: "", message: "", quantity: "1" }); showToast(i18n.catalog["marketplace.messages.inquiryCreated"], "success"); }
    };
    const submitConversion = async () => {
        if (!selectedInquiry) return;
        const payload = conversionForm.target === "service_sale" ? { target: "service_sale", customer_id: Number(conversionForm.customer_id), payment_type: conversionForm.payment_type } : { target: "quotation" };
        if (await requestAction(endpoint.INQUIRIES.convert(selectedInquiry.id), "POST", payload)) { setDialog(null); setSelectedInquiry(null); showToast(i18n.catalog["marketplace.messages.converted"], "success"); }
    };

    const merchantOptions = merchants.map((item) => ({ value: item.id, label: displayLocalized(item.display_name), subtitle: item.slug }));
    const productOptions = products.filter((item) => item.sellable !== false).map((item) => ({ value: item.id, label: item.name || item.catalog_code || String(item.id), subtitle: item.catalog_code || item.barcode || undefined }));
    const publicationOptions = publications.filter((item) => item.status !== "withdrawn").map((item) => ({ value: item.id, label: displayLocalized(item.public_name), subtitle: item.public_slug }));
    const customerOptions = customers.map((item) => ({ value: item.id, label: item.name || item.customer_name || String(item.id), subtitle: item.customer_code }));

    const inquiryColumns: Column<Inquiry>[] = useMemo(() => [
        { key: "customer", header: i18n.catalog["marketplace.fields.customer"], dataLabel: i18n.catalog["marketplace.fields.customer"], render: (item) => item.customer.name || item.customer.email || item.customer.phone || "—" },
        { key: "items", header: i18n.catalog["marketplace.fields.item"], dataLabel: i18n.catalog["marketplace.fields.item"], render: (item) => `${item.items.length} · ${item.items[0]?.public_title || "—"}` },
        { key: "status", header: i18n.catalog["marketplace.fields.status"], dataLabel: i18n.catalog["marketplace.fields.status"], render: (item) => <MarketplaceStatus value={item.status} /> },
        { key: "requested_at", header: i18n.catalog["marketplace.fields.requestedAt"], dataLabel: i18n.catalog["marketplace.fields.requestedAt"], render: (item) => formatDate(item.requested_at) },
        { key: "actions", header: i18n.catalog["common.general.actions"], dataLabel: i18n.catalog["common.general.actions"], render: (item) => <ActionButtons actions={[
            { icon: "check", title: i18n.catalog["marketplace.actions.assign"], variant: "edit", hidden: !canEdit || !user || !["new", "assigned"].includes(item.status), onClick: () => user && void requestAction(endpoint.INQUIRIES.assign(item.id), "POST", { assignee_id: user.id }) },
            { icon: "check", title: i18n.catalog["common.general.approved"], variant: "edit", hidden: !canEdit || !["new", "assigned"].includes(item.status), onClick: () => void requestAction(endpoint.INQUIRIES.qualify(item.id)) },
            { icon: "arrow-left", title: i18n.catalog["marketplace.actions.convertToQuotation"], variant: "edit", hidden: !canEdit || !["qualified", "quoted"].includes(item.status), onClick: () => { setSelectedInquiry(item); setConversionForm({ target: "quotation", customer_id: "", payment_type: "credit" }); setDialog("convert"); } },
        ]} /> },
    ], [canEdit, formatDate, i18n.catalog, user]);

    const merchantColumns: Column<Merchant>[] = useMemo(() => [
        { key: "display_name", header: i18n.catalog["marketplace.fields.name"], dataLabel: i18n.catalog["marketplace.fields.name"], render: (item) => displayLocalized(item.display_name) },
        { key: "slug", header: i18n.catalog["marketplace.fields.slug"], dataLabel: i18n.catalog["marketplace.fields.slug"] },
        { key: "status", header: i18n.catalog["marketplace.fields.status"], dataLabel: i18n.catalog["marketplace.fields.status"], render: (item) => <MarketplaceStatus value={item.status} /> },
        { key: "actions", header: i18n.catalog["common.general.actions"], dataLabel: i18n.catalog["common.general.actions"], render: (item) => <ActionButtons actions={[{ icon: "check", title: i18n.catalog["marketplace.actions.verify"], variant: "edit", hidden: !canEdit || item.status === "verified", onClick: () => void requestAction(endpoint.MERCHANTS.verify(item.id)) }]} /> },
    ], [canEdit, i18n.catalog]);
    const publicationColumns: Column<Publication>[] = useMemo(() => [
        { key: "public_name", header: i18n.catalog["marketplace.fields.name"], dataLabel: i18n.catalog["marketplace.fields.name"], render: (item) => displayLocalized(item.public_name) },
        { key: "availability", header: i18n.catalog["marketplace.fields.availability"], dataLabel: i18n.catalog["marketplace.fields.availability"] },
        { key: "public_price", header: i18n.catalog["marketplace.fields.price"], dataLabel: i18n.catalog["marketplace.fields.price"], render: (item) => item.public_price ? format.currency(item.public_price.amount, item.public_price.currency) : "—" },
        { key: "status", header: i18n.catalog["marketplace.fields.status"], dataLabel: i18n.catalog["marketplace.fields.status"], render: (item) => <MarketplaceStatus value={item.status} /> },
        { key: "actions", header: i18n.catalog["common.general.actions"], dataLabel: i18n.catalog["common.general.actions"], render: (item) => <ActionButtons actions={[{ icon: "check", title: i18n.catalog["marketplace.actions.publish"], variant: "edit", hidden: !canEdit || item.status === "published", onClick: () => void requestAction(endpoint.PUBLICATIONS.publish(item.id)) }, { icon: "x", title: i18n.catalog["marketplace.actions.withdraw"], variant: "delete", hidden: !canEdit || item.status !== "published", onClick: () => void requestAction(endpoint.PUBLICATIONS.withdraw(item.id)) }]} /> },
    ], [canEdit, format, i18n.catalog]);
    const offerColumns: Column<Offer>[] = useMemo(() => [
        { key: "title", header: i18n.catalog["marketplace.fields.title"], dataLabel: i18n.catalog["marketplace.fields.title"], render: (item) => displayLocalized(item.title) },
        { key: "starts_at", header: i18n.catalog["marketplace.fields.window"], dataLabel: i18n.catalog["marketplace.fields.window"], render: (item) => `${formatDate(item.starts_at)} — ${formatDate(item.ends_at)}` },
        { key: "status", header: i18n.catalog["marketplace.fields.status"], dataLabel: i18n.catalog["marketplace.fields.status"], render: (item) => <MarketplaceStatus value={item.status} /> },
        { key: "actions", header: i18n.catalog["common.general.actions"], dataLabel: i18n.catalog["common.general.actions"], render: (item) => <ActionButtons actions={[{ icon: "check", title: i18n.catalog["marketplace.actions.publish"], variant: "edit", hidden: !canEdit || ["published", "scheduled"].includes(item.status), onClick: () => void requestAction(endpoint.OFFERS.publish(item.id)) }, { icon: "x", title: i18n.catalog["marketplace.actions.withdraw"], variant: "delete", hidden: !canEdit || !["published", "scheduled"].includes(item.status), onClick: () => void requestAction(endpoint.OFFERS.withdraw(item.id)) }]} /> },
    ], [canEdit, formatDate, i18n.catalog]);
    const outboxColumns: Column<OutboxEvent>[] = useMemo(() => [
        { key: "event_type", header: i18n.catalog["marketplace.fields.event"], dataLabel: i18n.catalog["marketplace.fields.event"] },
        { key: "status", header: i18n.catalog["marketplace.fields.status"], dataLabel: i18n.catalog["marketplace.fields.status"], render: (item) => <MarketplaceStatus value={item.status} /> },
        { key: "attempts", header: i18n.catalog["marketplace.fields.attempts"], dataLabel: i18n.catalog["marketplace.fields.attempts"] },
        { key: "delivered_at", header: i18n.catalog["marketplace.fields.delivered"], dataLabel: i18n.catalog["marketplace.fields.delivered"], render: (item) => formatDate(item.delivered_at) },
        { key: "last_error", header: i18n.catalog["marketplace.fields.lastError"], dataLabel: i18n.catalog["marketplace.fields.lastError"], render: (item) => item.last_error || "—" },
    ], [formatDate, i18n.catalog]);

    const kpis = [
        { icon: "eye" as any, label: i18n.catalog["marketplace.analytics.impressions"], value: analytics.overview.impressions, subtitle: `${analyticsDays}d` },
        { icon: "bar-chart" as any, label: i18n.catalog["marketplace.analytics.detailViews"], value: analytics.overview.detail_views, subtitle: i18n.catalog["marketplace.analytics.inquiries"] },
        { icon: "cart" as any, label: i18n.catalog["marketplace.analytics.openInquiries"], value: analytics.overview.open_inquiries, subtitle: `${analytics.overview.inquiries} ${i18n.catalog["marketplace.analytics.inquiries"]}` },
        { icon: "trending-up" as any, label: i18n.catalog["marketplace.analytics.conversions"], value: analytics.overview.conversions, subtitle: `${analytics.overview.conversion_rate}% ${i18n.catalog["marketplace.analytics.conversionRate"]}` },
        { icon: "alert-circle" as any, label: i18n.catalog["marketplace.analytics.failedSync"], value: analytics.overview.failed_sync_events, subtitle: i18n.catalog["marketplace.fields.sync"] },
    ];

    const content = activeTab === "analytics" ? <div className="marketplace-analytics"><KPICardRow KPICards={kpis} /><div className="marketplace-funnel"><div><strong>{i18n.catalog["marketplace.tabs.inquiries"]}</strong><span>{analytics.funnel.new || 0}</span></div><div><strong>{i18n.catalog["marketplace.fields.assignee"]}</strong><span>{analytics.funnel.assigned || 0}</span></div><div><strong>{i18n.catalog["common.general.approved"]}</strong><span>{analytics.funnel.qualified || 0}</span></div><div><strong>{i18n.catalog["marketplace.actions.convertToQuotation"]}</strong><span>{analytics.funnel.quoted || 0}</span></div><div><strong>{i18n.catalog["marketplace.analytics.conversions"]}</strong><span>{analytics.funnel.converted || 0}</span></div></div></div>
        : activeTab === "inquiries" ? <Table columns={inquiryColumns} data={inquiries} keyExtractor={(item) => item.id} isLoading={isLoading} />
        : activeTab === "merchants" ? <Table columns={merchantColumns} data={merchants} keyExtractor={(item) => item.id} isLoading={isLoading} />
        : activeTab === "publications" ? <Table columns={publicationColumns} data={publications} keyExtractor={(item) => item.id} isLoading={isLoading} />
        : activeTab === "offers" ? <Table columns={offerColumns} data={offers} keyExtractor={(item) => item.id} isLoading={isLoading} />
        : <Table columns={outboxColumns} data={outbox} keyExtractor={(item) => item.id} isLoading={isLoading} />;

    return <MainLayout><div className="marketplace-workspace animate-fade"><PageSubHeader user={user} title={i18n.catalog["marketplace.title"]} subTitle={i18n.catalog["marketplace.subtitle"]} actions={<div className="marketplace-header-actions">{activeTab === "inquiries" && canCreate && <Button variant="primary" icon="plus" onClick={() => setDialog("inquiry")}>{i18n.catalog["marketplace.actions.createInquiry"]}</Button>}{activeTab === "merchants" && canCreate && <Button variant="primary" icon="plus" onClick={() => setDialog("merchant")}>{i18n.catalog["marketplace.actions.createMerchant"]}</Button>}{activeTab === "publications" && canCreate && <Button variant="primary" icon="plus" onClick={() => setDialog("publication")}>{i18n.catalog["marketplace.actions.createPublication"]}</Button>}{activeTab === "offers" && canCreate && <Button variant="primary" icon="plus" onClick={() => setDialog("offer")}>{i18n.catalog["marketplace.actions.createOffer"]}</Button>}{activeTab === "outbox" && canEdit && <Button variant="outline" icon="refresh-cw" onClick={() => void requestAction(endpoint.OUTBOX.dispatch)}>{i18n.catalog["marketplace.actions.dispatch"]}</Button>}</div>} />
        <div className="marketplace-tabs" role="tablist" aria-label={i18n.catalog["marketplace.title"]}>{(["analytics", "inquiries", "merchants", "publications", "offers", "outbox"] as MarketplaceTab[]).map((tab) => <Button key={tab} variant={activeTab === tab ? "primary" : "outline"} size="sm" onClick={() => setActiveTab(tab)}>{i18n.catalog[`marketplace.tabs.${tab}` as keyof typeof i18n.catalog]}</Button>)}</div>
        <FilterSection className="marketplace-controls"><FilterGroup label={i18n.catalog["common.general.search"]}><input className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={i18n.catalog["common.general.search"]} /></FilterGroup>{activeTab === "inquiries" && <FilterGroup label={i18n.catalog["marketplace.fields.status"]}><select className="form-control" value={inquiryStatus} onChange={(event) => setInquiryStatus(event.target.value)}><option value="">{i18n.catalog["common.general.all"]}</option>{["new", "assigned", "qualified", "quoted", "converted", "lost", "cancelled"].map((status) => <option key={status} value={status}>{status}</option>)}</select></FilterGroup>}{activeTab === "analytics" && <FilterGroup label={i18n.catalog["common.general.period"]}><select className="form-control" value={analyticsDays} onChange={(event) => setAnalyticsDays(event.target.value)}><option value="7">7</option><option value="30">30</option><option value="90">90</option></select></FilterGroup>}<FilterActions><Button variant="outline" icon="refresh-cw" onClick={() => void loadWorkspace()}>{i18n.catalog["marketplace.actions.refresh"]}</Button></FilterActions></FilterSection>{content}
        <Dialog isOpen={dialog === "merchant"} onClose={() => setDialog(null)} title={i18n.catalog["marketplace.actions.createMerchant"]} maxWidth="560px" footer={<><Button variant="secondary" onClick={() => setDialog(null)}>{i18n.catalog["common.general.cancel"]}</Button><Button variant="primary" onClick={() => void submitMerchant()}>{i18n.catalog["common.general.add"]}</Button></>}><TextInput label={i18n.catalog["marketplace.fields.slug"]} value={merchantForm.slug} onChange={(event) => setMerchantForm({ ...merchantForm, slug: event.target.value })} /><TextInput label={i18n.catalog["marketplace.fields.arabicName"]} value={merchantForm.display_name_ar} onChange={(event) => setMerchantForm({ ...merchantForm, display_name_ar: event.target.value })} /><TextInput label={i18n.catalog["marketplace.fields.englishName"]} value={merchantForm.display_name_en} onChange={(event) => setMerchantForm({ ...merchantForm, display_name_en: event.target.value })} /></Dialog>
        <Dialog isOpen={dialog === "publication"} onClose={() => setDialog(null)} title={i18n.catalog["marketplace.actions.createPublication"]} maxWidth="680px" footer={<><Button variant="secondary" onClick={() => setDialog(null)}>{i18n.catalog["common.general.cancel"]}</Button><Button variant="primary" onClick={() => void submitPublication()}>{i18n.catalog["common.general.add"]}</Button></>}><div className="marketplace-form-grid"><div className="form-group"><label>{i18n.catalog["marketplace.fields.merchant"]}</label><SearchableSelect options={merchantOptions} value={publicationForm.merchant_id || null} onChange={(value) => setPublicationForm({ ...publicationForm, merchant_id: value ? String(value) : "" })} /></div><div className="form-group"><label>{i18n.catalog["marketplace.fields.productId"]}</label><SearchableSelect options={productOptions} value={publicationForm.product_id ? Number(publicationForm.product_id) : null} onChange={(value) => setPublicationForm({ ...publicationForm, product_id: value ? String(value) : "" })} /></div></div><div className="marketplace-form-grid"><TextInput label={i18n.catalog["marketplace.fields.slug"]} value={publicationForm.public_slug} onChange={(event) => setPublicationForm({ ...publicationForm, public_slug: event.target.value })} /><TextInput label={i18n.catalog["marketplace.fields.coverMediaUrl"]} type="url" value={publicationForm.cover_media_url} onChange={(event) => setPublicationForm({ ...publicationForm, cover_media_url: event.target.value })} /></div><div className="marketplace-form-grid"><TextInput label={i18n.catalog["marketplace.fields.arabicName"]} value={publicationForm.public_name_ar} onChange={(event) => setPublicationForm({ ...publicationForm, public_name_ar: event.target.value })} /><TextInput label={i18n.catalog["marketplace.fields.englishName"]} value={publicationForm.public_name_en} onChange={(event) => setPublicationForm({ ...publicationForm, public_name_en: event.target.value })} /></div><div className="marketplace-form-grid"><TextInput label={i18n.catalog["marketplace.fields.price"]} type="number" min="0" value={publicationForm.public_price} onChange={(event) => setPublicationForm({ ...publicationForm, public_price: event.target.value })} /><TextInput label={i18n.catalog["marketplace.fields.currency"]} maxLength={3} value={publicationForm.currency_code} onChange={(event) => setPublicationForm({ ...publicationForm, currency_code: event.target.value.toUpperCase() })} /></div></Dialog>
        <Dialog isOpen={dialog === "offer"} onClose={() => setDialog(null)} title={i18n.catalog["marketplace.actions.createOffer"]} maxWidth="680px" footer={<><Button variant="secondary" onClick={() => setDialog(null)}>{i18n.catalog["common.general.cancel"]}</Button><Button variant="primary" onClick={() => void submitOffer()}>{i18n.catalog["common.general.add"]}</Button></>}><div className="marketplace-form-grid"><div className="form-group"><label>{i18n.catalog["marketplace.fields.merchant"]}</label><SearchableSelect options={merchantOptions} value={offerForm.merchant_id || null} onChange={(value) => setOfferForm({ ...offerForm, merchant_id: value ? String(value) : "" })} /></div><div className="form-group"><label>{i18n.catalog["marketplace.fields.item"]}</label><SearchableSelect options={publicationOptions} value={offerForm.publication_id || null} onChange={(value) => setOfferForm({ ...offerForm, publication_id: value ? String(value) : "" })} /></div></div><div className="marketplace-form-grid"><TextInput label={i18n.catalog["marketplace.fields.slug"]} value={offerForm.slug} onChange={(event) => setOfferForm({ ...offerForm, slug: event.target.value })} /><TextInput label={i18n.catalog["marketplace.fields.arabicName"]} value={offerForm.title_ar} onChange={(event) => setOfferForm({ ...offerForm, title_ar: event.target.value })} /></div><div className="marketplace-form-grid"><div className="form-group"><label>{i18n.catalog["marketplace.fields.benefitType"]}</label><select className="form-control" value={offerForm.benefit_type} onChange={(event) => setOfferForm({ ...offerForm, benefit_type: event.target.value })}>{["percentage", "fixed_amount", "fixed_price", "bundle", "gift"].map((type) => <option key={type} value={type}>{i18n.catalog[`marketplace.options.${type === "fixed_amount" ? "fixedAmount" : type === "fixed_price" ? "fixedPrice" : type}` as keyof typeof i18n.catalog]}</option>)}</select></div><TextInput label={i18n.catalog["marketplace.fields.benefitValue"]} type="number" min="0" value={offerForm.benefit_value} onChange={(event) => setOfferForm({ ...offerForm, benefit_value: event.target.value })} /></div><div className="marketplace-form-grid"><TextInput label={i18n.catalog["marketplace.fields.startsAt"]} type="datetime-local" value={offerForm.starts_at} onChange={(event) => setOfferForm({ ...offerForm, starts_at: event.target.value })} /><TextInput label={i18n.catalog["marketplace.fields.endsAt"]} type="datetime-local" value={offerForm.ends_at} onChange={(event) => setOfferForm({ ...offerForm, ends_at: event.target.value })} /></div></Dialog>
        <Dialog isOpen={dialog === "inquiry"} onClose={() => setDialog(null)} title={i18n.catalog["marketplace.actions.createInquiry"]} maxWidth="680px" footer={<><Button variant="secondary" onClick={() => setDialog(null)}>{i18n.catalog["common.general.cancel"]}</Button><Button variant="primary" onClick={() => void submitInquiry()}>{i18n.catalog["common.general.add"]}</Button></>}><div className="marketplace-form-grid"><div className="form-group"><label>{i18n.catalog["marketplace.fields.merchant"]}</label><SearchableSelect options={merchantOptions} value={inquiryForm.merchant_id || null} onChange={(value) => setInquiryForm({ ...inquiryForm, merchant_id: value ? String(value) : "" })} /></div><div className="form-group"><label>{i18n.catalog["marketplace.fields.item"]}</label><SearchableSelect options={productOptions} value={inquiryForm.product_id ? Number(inquiryForm.product_id) : null} onChange={(value) => setInquiryForm({ ...inquiryForm, product_id: value ? String(value) : "" })} /></div></div><div className="marketplace-form-grid"><TextInput label={i18n.catalog["marketplace.fields.customer"]} value={inquiryForm.customer_name} onChange={(event) => setInquiryForm({ ...inquiryForm, customer_name: event.target.value })} /><TextInput label={i18n.catalog["marketplace.fields.customerEmail"]} type="email" value={inquiryForm.customer_email} onChange={(event) => setInquiryForm({ ...inquiryForm, customer_email: event.target.value })} /></div><div className="marketplace-form-grid"><TextInput label={i18n.catalog["marketplace.fields.customerPhone"]} value={inquiryForm.customer_phone} onChange={(event) => setInquiryForm({ ...inquiryForm, customer_phone: event.target.value })} /><TextInput label={i18n.catalog["marketplace.fields.quantity"]} type="number" min="1" value={inquiryForm.quantity} onChange={(event) => setInquiryForm({ ...inquiryForm, quantity: event.target.value })} /></div><div className="form-group"><label>{i18n.catalog["marketplace.fields.message"]}</label><textarea className="form-control" rows={3} value={inquiryForm.message} onChange={(event) => setInquiryForm({ ...inquiryForm, message: event.target.value })} /></div></Dialog>
        <Dialog isOpen={dialog === "convert"} onClose={() => setDialog(null)} title={i18n.catalog["marketplace.actions.convertToQuotation"]} maxWidth="560px" footer={<><Button variant="secondary" onClick={() => setDialog(null)}>{i18n.catalog["common.general.cancel"]}</Button><Button variant="primary" onClick={() => void submitConversion()}>{i18n.catalog["common.general.confirm"]}</Button></>}><div className="form-group"><label>{i18n.catalog["common.general.type"]}</label><select className="form-control" value={conversionForm.target} onChange={(event) => setConversionForm({ ...conversionForm, target: event.target.value })}><option value="quotation">{i18n.catalog["marketplace.actions.convertToQuotation"]}</option><option value="service_sale">{i18n.catalog["marketplace.actions.convertToServiceSale"]}</option></select></div>{conversionForm.target === "service_sale" && <><div className="form-group"><label>{i18n.catalog["marketplace.fields.customer"]}</label><SearchableSelect options={customerOptions} value={conversionForm.customer_id ? Number(conversionForm.customer_id) : null} onChange={(value) => setConversionForm({ ...conversionForm, customer_id: value ? String(value) : "" })} /></div><div className="form-group"><label>{i18n.catalog["common.general.paymentMethod"]}</label><select className="form-control" value={conversionForm.payment_type} onChange={(event) => setConversionForm({ ...conversionForm, payment_type: event.target.value })}><option value="cash">{i18n.catalog["common.general.cash"]}</option><option value="credit">{i18n.catalog["common.general.deferred"]}</option></select></div></>}</Dialog></div></MainLayout>;
}
