"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { MainLayout, PageSubHeader } from "@/components/layout";
import { Button, Dialog, KPICardRow, SearchableSelect, TextInput, showToast } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { canAccess, checkAuth, getStoredPermissions, getStoredUser, Permission, User } from "@/lib/auth";

type Workspace = "overview" | "orders" | "catalog" | "campaigns" | "media" | "operations";
type LocalizedValue = { ar?: string | null; en?: string | null };
type Merchant = { id: string; slug: string; display_name: LocalizedValue; status: string };
type ProductRef = { id: number; name?: string; catalog_code?: string; barcode?: string; item_type?: string; sellable?: boolean };
type Publication = { id: string; merchant_id: string; product_id: number; public_slug: string; public_name: LocalizedValue; status: string; availability: string; cover_media_url?: string | null; public_price?: { amount: number; currency: string } | null; last_sync_error?: string | null };
type Offer = { id: string; merchant_id: string; slug: string; title: LocalizedValue; status: string; hero_media_url?: string | null; benefit_type?: string; benefit_value?: number | string; starts_at?: string | null; ends_at?: string | null; last_sync_error?: string | null };
type OutboxEvent = { id: string; event_type: string; status: string; attempts: number; delivered_at?: string | null; last_error?: string | null };
type CustomerRef = { id: number; name?: string; customer_name?: string; customer_code?: string };
type InquiryItem = { id: string; public_title?: string | null; item_kind: "product" | "service"; requested_quantity: number; product_id?: number | null };
type Inquiry = { id: string; status: string; source: string; channel?: string | null; customer: { name?: string | null; email?: string | null; phone?: string | null }; message?: string | null; requested_at?: string | null; assignment: { user_id?: number | null }; conversion: { type?: string | null; id?: string | null }; items: InquiryItem[] };
type MediaAsset = { id: string; merchant_id?: string | null; url: string; original_name: string; mime_type: string; size_bytes: number; width?: number | null; height?: number | null; alt_text: LocalizedValue; status: string };
type Analytics = { overview: { impressions: number; detail_views: number; inquiries: number; conversions: number; conversion_rate: number; open_inquiries: number; published_products: number; published_offers: number; failed_sync_events: number }; funnel: Record<string, number> };

const marketplace = API_ENDPOINTS.COMMERCIAL.MARKETPLACE;
const emptyAnalytics: Analytics = { overview: { impressions: 0, detail_views: 0, inquiries: 0, conversions: 0, conversion_rate: 0, open_inquiries: 0, published_products: 0, published_offers: 0, failed_sync_events: 0 }, funnel: {} };
const listFrom = (value: unknown): any[] => Array.isArray(value) ? value : (value && typeof value === "object" && Array.isArray((value as { data?: unknown[] }).data) ? (value as { data: unknown[] }).data : []);

function StatusBadge({ value }: { value: string }) {
    return <span className={`marketplace-status marketplace-status--${value.replace(/[^a-z0-9_-]/gi, "")}`}>{value.replaceAll("_", " ")}</span>;
}

function MediaTile({ url, label, type = "image" }: { url?: string | null; label: string; type?: "image" | "video" }) {
    if (!url) return <div className="marketplace-media-placeholder" aria-label={label}>{label.slice(0, 1)}</div>;
    return type === "video"
        ? <video className="marketplace-media-image" src={url} muted preload="metadata" aria-label={label} />
        : <img className="marketplace-media-image" src={url} alt={label} loading="lazy" />;
}

export default function MarketplaceDashboardPage() {
    const { t: i18n, format } = useI18n();
    const [user, setUser] = useState<User | null>(null);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [workspace, setWorkspace] = useState<Workspace>("overview");
    const [loading, setLoading] = useState(true);
    const [merchants, setMerchants] = useState<Merchant[]>([]);
    const [products, setProducts] = useState<ProductRef[]>([]);
    const [customers, setCustomers] = useState<CustomerRef[]>([]);
    const [publications, setPublications] = useState<Publication[]>([]);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [outbox, setOutbox] = useState<OutboxEvent[]>([]);
    const [media, setMedia] = useState<MediaAsset[]>([]);
    const [analytics, setAnalytics] = useState<Analytics>(emptyAnalytics);
    const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
    const [dialog, setDialog] = useState<"merchant" | "publication" | "offer" | "inquiry" | "convert" | "media-upload" | "media-assign" | null>(null);
    const [selectedMedia, setSelectedMedia] = useState<MediaAsset | null>(null);
    const [search, setSearch] = useState("");
    const [inquiryStatus, setInquiryStatus] = useState("");
    const [analyticsDays, setAnalyticsDays] = useState("30");
    const [merchantForm, setMerchantForm] = useState({ slug: "", display_name_ar: "", display_name_en: "" });
    const [publicationForm, setPublicationForm] = useState({ merchant_id: "", product_id: "", public_slug: "", public_name_ar: "", public_name_en: "", public_price: "", currency_code: "SAR" });
    const [offerForm, setOfferForm] = useState({ merchant_id: "", publication_id: "", slug: "", title_ar: "", title_en: "", benefit_type: "percentage", benefit_value: "", starts_at: "", ends_at: "" });
    const [inquiryForm, setInquiryForm] = useState({ merchant_id: "", product_id: "", customer_name: "", customer_email: "", customer_phone: "", message: "", quantity: "1" });
    const [conversionForm, setConversionForm] = useState({ target: "quotation", customer_id: "", payment_type: "credit" });
    const [mediaForm, setMediaForm] = useState<{ merchant_id: string; alt_text_ar: string; alt_text_en: string; file: File | null }>({ merchant_id: "", alt_text_ar: "", alt_text_en: "", file: null });
    const [assignmentForm, setAssignmentForm] = useState({ target_type: "publication", target_id: "", role: "cover" });

    const canCreate = canAccess(permissions, "marketplace", "create");
    const canEdit = canAccess(permissions, "marketplace", "edit");
    const display = (value: LocalizedValue) => value.ar || value.en || "—";
    const formattedDate = (value?: string | null) => value ? format.date(value) : "—";
    const selectedInquiry = inquiries.find((item) => item.id === selectedInquiryId) || inquiries[0] || null;

    const loadWorkspace = useCallback(async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({ per_page: "100" });
            if (search) query.set("search", search);
            if (inquiryStatus) query.set("status", inquiryStatus);
            const responses: any[] = await Promise.all([
                fetchAPI(`${marketplace.MERCHANTS.BASE}?per_page=100`),
                fetchAPI(`${API_ENDPOINTS.SUPPLY_CHAIN.PRODUCTS}?per_page=200`),
                fetchAPI(`${API_ENDPOINTS.COMMERCIAL.CRM.CUSTOMERS}?per_page=200`),
                fetchAPI(`${marketplace.PUBLICATIONS.BASE}?per_page=100`),
                fetchAPI(`${marketplace.OFFERS.BASE}?per_page=100`),
                fetchAPI(`${marketplace.INQUIRIES.BASE}?${query.toString()}`),
                fetchAPI(`${marketplace.OUTBOX.BASE}?per_page=100`),
                fetchAPI(`${marketplace.MEDIA.BASE}?per_page=100`),
                fetchAPI(`${marketplace.ANALYTICS.OVERVIEW}?days=${analyticsDays}`),
            ]);
            setMerchants(listFrom(responses[0].data) as Merchant[]);
            setProducts(listFrom(responses[1].data) as ProductRef[]);
            setCustomers(listFrom(responses[2].data) as CustomerRef[]);
            setPublications(listFrom(responses[3].data) as Publication[]);
            setOffers(listFrom(responses[4].data) as Offer[]);
            setInquiries(listFrom(responses[5].data) as Inquiry[]);
            setOutbox(listFrom(responses[6].data) as OutboxEvent[]);
            setMedia(listFrom(responses[7].data) as MediaAsset[]);
            setAnalytics((responses[8].data as Analytics) || emptyAnalytics);
        } catch (error) {
            console.error(error);
            showToast(i18n.catalog["marketplace.messages.loadFailed"], "error");
        } finally {
            setLoading(false);
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
        const response: any = await fetchAPI(url, { method, body: body ? JSON.stringify(body) : undefined });
        if (response.success === false) {
            showToast(response.message || i18n.catalog["marketplace.messages.loadFailed"], "error");
            return null;
        }
        await loadWorkspace();
        return response;
    };

    const merchantOptions = merchants.map((item) => ({ value: item.id, label: display(item.display_name), subtitle: item.slug }));
    const productOptions = products.filter((item) => item.sellable !== false).map((item) => ({ value: item.id, label: item.name || item.catalog_code || String(item.id), subtitle: item.catalog_code || item.barcode }));
    const publicationOptions = publications.filter((item) => item.status !== "withdrawn").map((item) => ({ value: item.id, label: display(item.public_name), subtitle: item.public_slug }));
    const customerOptions = customers.map((item) => ({ value: item.id, label: item.name || item.customer_name || String(item.id), subtitle: item.customer_code }));

    const submitMerchant = async () => {
        if (!merchantForm.slug || !merchantForm.display_name_ar) return;
        if (await requestAction(marketplace.MERCHANTS.BASE, "POST", merchantForm)) { setMerchantForm({ slug: "", display_name_ar: "", display_name_en: "" }); setDialog(null); }
    };
    const submitPublication = async () => {
        if (!publicationForm.merchant_id || !publicationForm.product_id || !publicationForm.public_slug) return;
        const payload = { ...publicationForm, product_id: Number(publicationForm.product_id), public_price: publicationForm.public_price ? Number(publicationForm.public_price) : null };
        if (await requestAction(marketplace.PUBLICATIONS.BASE, "POST", payload)) { setPublicationForm({ merchant_id: "", product_id: "", public_slug: "", public_name_ar: "", public_name_en: "", public_price: "", currency_code: "SAR" }); setDialog(null); }
    };
    const submitOffer = async () => {
        if (!offerForm.merchant_id || !offerForm.publication_id || !offerForm.slug || !offerForm.title_ar || !offerForm.starts_at || !offerForm.ends_at) return;
        const payload: any = { ...offerForm, benefit_value: Number(offerForm.benefit_value || 0), targets: [{ type: "publication", id: offerForm.publication_id }] };
        delete payload.publication_id;
        if (await requestAction(marketplace.OFFERS.BASE, "POST", payload)) { setOfferForm({ merchant_id: "", publication_id: "", slug: "", title_ar: "", title_en: "", benefit_type: "percentage", benefit_value: "", starts_at: "", ends_at: "" }); setDialog(null); }
    };
    const submitInquiry = async () => {
        if (!inquiryForm.product_id) return;
        const product = products.find((item) => String(item.id) === inquiryForm.product_id);
        const payload = { merchant_id: inquiryForm.merchant_id || null, customer_name: inquiryForm.customer_name || null, customer_email: inquiryForm.customer_email || null, customer_phone: inquiryForm.customer_phone || null, message: inquiryForm.message || null, items: [{ product_id: Number(inquiryForm.product_id), item_kind: product?.item_type === "service" ? "service" : "product", requested_quantity: Number(inquiryForm.quantity || 1) }] };
        if (await requestAction(marketplace.INQUIRIES.BASE, "POST", payload)) { setInquiryForm({ merchant_id: "", product_id: "", customer_name: "", customer_email: "", customer_phone: "", message: "", quantity: "1" }); setDialog(null); }
    };
    const submitConversion = async () => {
        if (!selectedInquiry) return;
        const payload = conversionForm.target === "service_sale" ? { target: "service_sale", customer_id: Number(conversionForm.customer_id), payment_type: conversionForm.payment_type } : { target: "quotation" };
        if (await requestAction(marketplace.INQUIRIES.convert(selectedInquiry.id), "POST", payload)) setDialog(null);
    };
    const uploadMedia = async () => {
        if (!mediaForm.file) return;
        const formData = new FormData();
        formData.append("file", mediaForm.file);
        if (mediaForm.merchant_id) formData.append("merchant_id", mediaForm.merchant_id);
        if (mediaForm.alt_text_ar) formData.append("alt_text_ar", mediaForm.alt_text_ar);
        if (mediaForm.alt_text_en) formData.append("alt_text_en", mediaForm.alt_text_en);
        const response: any = await fetchAPI(marketplace.MEDIA.BASE, { method: "POST", body: formData });
        if (response.success === false) return showToast(response.message || i18n.catalog["marketplace.messages.loadFailed"], "error");
        setMediaForm({ merchant_id: "", alt_text_ar: "", alt_text_en: "", file: null });
        setDialog(null);
        await loadWorkspace();
    };
    const assignMedia = async () => {
        if (!selectedMedia || !assignmentForm.target_id) return;
        if (await requestAction(marketplace.MEDIA.assign(selectedMedia.id), "POST", assignmentForm)) { setSelectedMedia(null); setAssignmentForm({ target_type: "publication", target_id: "", role: "cover" }); setDialog(null); }
    };

    const workspaces: Array<{ id: Workspace; label: string; icon: string }> = [
        { id: "overview", label: i18n.catalog["marketplace.studios.overview"], icon: "layout-dashboard" },
        { id: "orders", label: i18n.catalog["marketplace.studios.orderDesk"], icon: "inbox" },
        { id: "catalog", label: i18n.catalog["marketplace.studios.catalog"], icon: "package" },
        { id: "campaigns", label: i18n.catalog["marketplace.studios.campaign"], icon: "sparkles" },
        { id: "media", label: i18n.catalog["marketplace.studios.media"], icon: "image" },
        { id: "operations", label: i18n.catalog["marketplace.studios.operations"], icon: "activity" },
    ];
    const attention: Array<{ type: "sync"; value: number } | { type: "inquiry"; value: Inquiry }> = [
        ...(analytics.overview.failed_sync_events ? [{ type: "sync" as const, value: analytics.overview.failed_sync_events }] : []),
        ...inquiries.filter((item) => ["new", "assigned"].includes(item.status)).slice(0, 4).map((item) => ({ type: "inquiry" as const, value: item })),
    ];
    const kpis = [
        { icon: "eye" as any, label: i18n.catalog["marketplace.analytics.impressions"], value: analytics.overview.impressions, subtitle: format.number(Number(analyticsDays)) },
        { icon: "package" as any, label: i18n.catalog["marketplace.analytics.publishedProducts"], value: analytics.overview.published_products, subtitle: [format.number(analytics.overview.published_offers), i18n.catalog["marketplace.analytics.publishedOffers"]].join(" ") },
        { icon: "inbox" as any, label: i18n.catalog["marketplace.analytics.openInquiries"], value: analytics.overview.open_inquiries, subtitle: [format.number(analytics.overview.inquiries), i18n.catalog["marketplace.analytics.inquiries"]].join(" ") },
        { icon: "trending-up" as any, label: i18n.catalog["marketplace.analytics.conversions"], value: analytics.overview.conversions, subtitle: [format.number(analytics.overview.conversion_rate), i18n.catalog["marketplace.analytics.conversionRate"]].join(" ") },
    ];

    const overview = <section className="marketplace-overview"><div className="marketplace-overview-bar"><div><span className="marketplace-eyebrow">{i18n.catalog["marketplace.studios.overview"]}</span><h2>{i18n.catalog["marketplace.general.title"]}</h2></div><div className="marketplace-period"><select className="form-control" value={analyticsDays} onChange={(event) => setAnalyticsDays(event.target.value)}><option value="7">7</option><option value="30">30</option><option value="90">90</option></select><Button variant="outline" size="sm" icon="refresh-cw" onClick={() => void loadWorkspace()}>{i18n.catalog["marketplace.actions.refresh"]}</Button></div></div><KPICardRow KPICards={kpis} /><div className="marketplace-overview-grid"><section className="marketplace-surface"><div className="marketplace-section-heading"><div><span className="marketplace-eyebrow">{i18n.catalog["marketplace.overview.funnel"]}</span><h3>{i18n.catalog["marketplace.tabs.inquiries"]}</h3></div><Button size="sm" variant="outline" onClick={() => setWorkspace("orders")}>{i18n.catalog["marketplace.actions.openStudio"]}</Button></div><div className="marketplace-funnel-flow">{["new", "assigned", "qualified", "quoted", "converted"].map((status) => <div key={status}><span>{status.replaceAll("_", " ")}</span><strong>{analytics.funnel[status] || 0}</strong></div>)}</div></section><section className="marketplace-surface"><div className="marketplace-section-heading"><div><span className="marketplace-eyebrow">{i18n.catalog["marketplace.overview.attention"]}</span><h3>{i18n.catalog["marketplace.studios.operations"]}</h3></div><Button size="sm" variant="outline" onClick={() => setWorkspace("operations")}>{i18n.catalog["marketplace.actions.openStudio"]}</Button></div>{attention.length ? <div className="marketplace-attention-list">{attention.map((item, index) => item.type === "sync" ? <button key={`sync-${index}`} className="marketplace-attention-item" onClick={() => setWorkspace("operations")}><StatusBadge value="failed" /><span>{item.value}</span></button> : <button key={(item.value as Inquiry).id} className="marketplace-attention-item" onClick={() => { setSelectedInquiryId((item.value as Inquiry).id); setWorkspace("orders"); }}><StatusBadge value={(item.value as Inquiry).status} /><span>{(item.value as Inquiry).customer.name || (item.value as Inquiry).customer.email || "—"}</span></button>)}</div> : <p className="marketplace-empty-copy">{i18n.catalog["marketplace.overview.noAttention"]}</p>}</section></div></section>;

    const orderDesk = <section className="marketplace-desk"><div className="marketplace-studio-heading"><div><span className="marketplace-eyebrow">{i18n.catalog["marketplace.studios.orderDesk"]}</span><h2>{i18n.catalog["marketplace.tabs.inquiries"]}</h2></div>{canCreate && <Button variant="primary" icon="plus" onClick={() => setDialog("inquiry")}>{i18n.catalog["marketplace.actions.createInquiry"]}</Button>}</div><div className="marketplace-filter-row"><input className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={i18n.catalog["common.general.search"]} /><select className="form-control" value={inquiryStatus} onChange={(event) => setInquiryStatus(event.target.value)}><option value="">{i18n.catalog["common.general.all"]}</option>{["new", "assigned", "qualified", "quoted", "converted", "lost", "cancelled"].map((status) => <option key={status}>{status}</option>)}</select></div><div className="marketplace-order-layout"><div className="marketplace-order-list">{loading ? <div className="marketplace-empty-copy">…</div> : inquiries.map((item) => <button key={item.id} className={`marketplace-order-row ${selectedInquiry?.id === item.id ? "is-selected" : ""}`} onClick={() => setSelectedInquiryId(item.id)}><div><strong>{item.customer.name || item.customer.email || item.customer.phone || "—"}</strong><span>{item.items[0]?.public_title || "—"}</span></div><div><StatusBadge value={item.status} /><time>{formattedDate(item.requested_at)}</time></div></button>)}</div><aside className="marketplace-order-detail">{selectedInquiry ? <><div className="marketplace-detail-top"><div><StatusBadge value={selectedInquiry.status} /><h3>{selectedInquiry.customer.name || selectedInquiry.customer.email || "—"}</h3></div><span>{formattedDate(selectedInquiry.requested_at)}</span></div><div className="marketplace-detail-block"><span>{i18n.catalog["marketplace.fields.customer"]}</span><strong>{selectedInquiry.customer.email || selectedInquiry.customer.phone || "—"}</strong></div><div className="marketplace-detail-block"><span>{i18n.catalog["marketplace.fields.item"]}</span>{selectedInquiry.items.map((item) => <div key={item.id} className="marketplace-line-item"><strong>{item.public_title || "—"}</strong><span>× {item.requested_quantity}</span></div>)}</div>{selectedInquiry.message && <div className="marketplace-detail-block"><span>{i18n.catalog["marketplace.fields.message"]}</span><p>{selectedInquiry.message}</p></div>}<div className="marketplace-detail-actions">{canEdit && user && ["new", "assigned"].includes(selectedInquiry.status) && <Button size="sm" variant="outline" onClick={() => void requestAction(marketplace.INQUIRIES.assign(selectedInquiry.id), "POST", { assignee_id: user.id })}>{i18n.catalog["marketplace.actions.assign"]}</Button>}{canEdit && ["new", "assigned"].includes(selectedInquiry.status) && <Button size="sm" variant="outline" onClick={() => void requestAction(marketplace.INQUIRIES.qualify(selectedInquiry.id))}>{i18n.catalog["common.general.approved"]}</Button>}{canEdit && ["qualified", "quoted"].includes(selectedInquiry.status) && <Button size="sm" variant="primary" onClick={() => setDialog("convert")}>{i18n.catalog["marketplace.actions.convertToQuotation"]}</Button>}</div></> : <p className="marketplace-empty-copy">{i18n.catalog["common.general.noResults"]}</p>}</aside></div></section>;

    const catalogStudio = <section className="marketplace-studio"><div className="marketplace-studio-heading"><div><span className="marketplace-eyebrow">{i18n.catalog["marketplace.studios.catalog"]}</span><h2>{i18n.catalog["marketplace.tabs.publications"]}</h2></div><div className="marketplace-heading-actions">{canCreate && <Button variant="outline" icon="image" onClick={() => setDialog("media-upload")}>{i18n.catalog["marketplace.actions.addMedia"]}</Button>}{canCreate && <Button variant="primary" icon="plus" onClick={() => setDialog("publication")}>{i18n.catalog["marketplace.actions.createPublication"]}</Button>}</div></div><div className="marketplace-readiness-strip"><div><strong>{publications.filter((item) => item.status === "published").length}</strong><span>{i18n.catalog["marketplace.analytics.publishedProducts"]}</span></div><div><strong>{publications.filter((item) => !item.cover_media_url).length}</strong><span>{i18n.catalog["marketplace.fields.media"]}</span></div><div><strong>{publications.filter((item) => item.last_sync_error).length}</strong><span>{i18n.catalog["marketplace.analytics.failedSync"]}</span></div></div><div className="marketplace-product-grid">{publications.map((item) => <article key={item.id} className="marketplace-product-card"><MediaTile url={item.cover_media_url} label={display(item.public_name)} /><div className="marketplace-card-body"><div className="marketplace-card-meta"><StatusBadge value={item.status} /><span>{item.availability}</span></div><h3>{display(item.public_name)}</h3><p>{item.public_price ? format.currency(item.public_price.amount, item.public_price.currency) : "—"}</p><div className="marketplace-card-actions">{canEdit && item.status !== "published" && <Button size="sm" variant="primary" onClick={() => void requestAction(marketplace.PUBLICATIONS.publish(item.id))}>{i18n.catalog["marketplace.actions.publish"]}</Button>}{canEdit && item.status === "published" && <Button size="sm" variant="outline" onClick={() => void requestAction(marketplace.PUBLICATIONS.withdraw(item.id))}>{i18n.catalog["marketplace.actions.withdraw"]}</Button>}<Button size="sm" variant="outline" onClick={() => { setWorkspace("media"); }}>{i18n.catalog["marketplace.fields.media"]}</Button></div></div></article>)}</div></section>;

    const campaignStudio = <section className="marketplace-studio"><div className="marketplace-studio-heading"><div><span className="marketplace-eyebrow">{i18n.catalog["marketplace.studios.campaign"]}</span><h2>{i18n.catalog["marketplace.tabs.offers"]}</h2></div>{canCreate && <Button variant="primary" icon="plus" onClick={() => setDialog("offer")}>{i18n.catalog["marketplace.actions.createOffer"]}</Button>}</div><div className="marketplace-campaign-intro"><div><span className="marketplace-eyebrow">{i18n.catalog["marketplace.general.campaignSteps"]}</span><h3>{i18n.catalog["marketplace.actions.createOffer"]}</h3><p>{i18n.catalog["marketplace.fields.benefitType"]} · {i18n.catalog["marketplace.fields.item"]} · {i18n.catalog["marketplace.fields.media"]} · {i18n.catalog["marketplace.fields.window"]}</p></div><Button variant="outline" icon="sparkles" onClick={() => setDialog("offer")}>{i18n.catalog["marketplace.actions.openStudio"]}</Button></div><div className="marketplace-campaign-grid">{offers.map((item) => <article key={item.id} className="marketplace-campaign-card"><MediaTile url={item.hero_media_url} label={display(item.title)} /><div className="marketplace-card-body"><div className="marketplace-card-meta"><StatusBadge value={item.status} /><span>{item.benefit_value ?? "—"} {item.benefit_type || ""}</span></div><h3>{display(item.title)}</h3><p>{formattedDate(item.starts_at)} — {formattedDate(item.ends_at)}</p><div className="marketplace-card-actions">{canEdit && !["published", "scheduled"].includes(item.status) && <Button size="sm" variant="primary" onClick={() => void requestAction(marketplace.OFFERS.publish(item.id))}>{i18n.catalog["marketplace.actions.publish"]}</Button>}{canEdit && ["published", "scheduled"].includes(item.status) && <Button size="sm" variant="outline" onClick={() => void requestAction(marketplace.OFFERS.withdraw(item.id))}>{i18n.catalog["marketplace.actions.withdraw"]}</Button>}<Button size="sm" variant="outline" onClick={() => setWorkspace("media")}>{i18n.catalog["marketplace.fields.media"]}</Button></div></div></article>)}</div></section>;

    const mediaLibrary = <section className="marketplace-studio"><div className="marketplace-studio-heading"><div><span className="marketplace-eyebrow">{i18n.catalog["marketplace.studios.media"]}</span><h2>{i18n.catalog["marketplace.fields.media"]}</h2></div>{canCreate && <Button variant="primary" icon="upload" onClick={() => setDialog("media-upload")}>{i18n.catalog["marketplace.actions.addMedia"]}</Button>}</div><div className="marketplace-media-library">{media.map((asset) => <button key={asset.id} className="marketplace-media-card" onClick={() => { setSelectedMedia(asset); setAssignmentForm({ target_type: "publication", target_id: "", role: "cover" }); setDialog("media-assign"); }}><MediaTile url={asset.url} label={asset.original_name} type={asset.mime_type.startsWith("video/") ? "video" : "image"} /><div><strong>{asset.original_name}</strong><span>{asset.width && asset.height ? <>{format.number(asset.width)} {i18n.catalog["marketplace.general.dimensionSeparator"]} {format.number(asset.height)}</> : asset.mime_type}</span></div></button>)}</div></section>;

    const operations = <section className="marketplace-studio"><div className="marketplace-studio-heading"><div><span className="marketplace-eyebrow">{i18n.catalog["marketplace.studios.operations"]}</span><h2>{i18n.catalog["marketplace.tabs.outbox"]}</h2></div>{canEdit && <Button variant="outline" icon="refresh-cw" onClick={() => void requestAction(marketplace.OUTBOX.dispatch)}>{i18n.catalog["marketplace.actions.dispatch"]}</Button>}</div><div className="marketplace-operations-list">{outbox.map((event) => <article key={event.id} className="marketplace-operation-row"><div><StatusBadge value={event.status} /><strong>{event.event_type}</strong><span>{event.attempts} · {formattedDate(event.delivered_at)}</span></div>{event.last_error ? <p>{event.last_error}</p> : <span>—</span>}</article>)}</div></section>;

    const activeContent = workspace === "overview" ? overview : workspace === "orders" ? orderDesk : workspace === "catalog" ? catalogStudio : workspace === "campaigns" ? campaignStudio : workspace === "media" ? mediaLibrary : operations;

    return <MainLayout><main className="marketplace-ops"><PageSubHeader user={user} title={i18n.catalog["marketplace.general.title"]} subTitle={i18n.catalog["marketplace.general.subtitle"]} actions={workspace === "catalog" && canCreate ? <Button variant="primary" icon="plus" onClick={() => setDialog("publication")}>{i18n.catalog["marketplace.actions.createPublication"]}</Button> : workspace === "campaigns" && canCreate ? <Button variant="primary" icon="plus" onClick={() => setDialog("offer")}>{i18n.catalog["marketplace.actions.createOffer"]}</Button> : undefined} /><nav className="marketplace-workspace-nav" aria-label={i18n.catalog["marketplace.general.title"]}>{workspaces.map((item) => <button key={item.id} className={workspace === item.id ? "is-active" : ""} onClick={() => setWorkspace(item.id)}><span className="marketplace-nav-icon">{item.icon.slice(0, 1)}</span><span>{item.label}</span></button>)}</nav>{activeContent}

    <Dialog isOpen={dialog === "merchant"} onClose={() => setDialog(null)} title={i18n.catalog["marketplace.actions.createMerchant"]} maxWidth="560px" footer={<><Button variant="secondary" onClick={() => setDialog(null)}>{i18n.catalog["common.general.cancel"]}</Button><Button variant="primary" onClick={() => void submitMerchant()}>{i18n.catalog["common.general.add"]}</Button></>}><TextInput label={i18n.catalog["marketplace.fields.slug"]} value={merchantForm.slug} onChange={(event) => setMerchantForm({ ...merchantForm, slug: event.target.value })} /><TextInput label={i18n.catalog["marketplace.fields.arabicName"]} value={merchantForm.display_name_ar} onChange={(event) => setMerchantForm({ ...merchantForm, display_name_ar: event.target.value })} /><TextInput label={i18n.catalog["marketplace.fields.englishName"]} value={merchantForm.display_name_en} onChange={(event) => setMerchantForm({ ...merchantForm, display_name_en: event.target.value })} /></Dialog>
    <Dialog isOpen={dialog === "publication"} onClose={() => setDialog(null)} title={i18n.catalog["marketplace.actions.createPublication"]} maxWidth="720px" footer={<><Button variant="secondary" onClick={() => setDialog(null)}>{i18n.catalog["common.general.cancel"]}</Button><Button variant="primary" onClick={() => void submitPublication()}>{i18n.catalog["common.general.add"]}</Button></>}><div className="marketplace-form-grid"><div className="form-group"><label>{i18n.catalog["marketplace.fields.merchant"]}</label><SearchableSelect options={merchantOptions} value={publicationForm.merchant_id || null} onChange={(value) => setPublicationForm({ ...publicationForm, merchant_id: value ? String(value) : "" })} /></div><div className="form-group"><label>{i18n.catalog["marketplace.fields.productId"]}</label><SearchableSelect options={productOptions} value={publicationForm.product_id ? Number(publicationForm.product_id) : null} onChange={(value) => setPublicationForm({ ...publicationForm, product_id: value ? String(value) : "" })} /></div></div><div className="marketplace-form-grid"><TextInput label={i18n.catalog["marketplace.fields.slug"]} value={publicationForm.public_slug} onChange={(event) => setPublicationForm({ ...publicationForm, public_slug: event.target.value })} /><TextInput label={i18n.catalog["marketplace.fields.price"]} type="number" min="0" value={publicationForm.public_price} onChange={(event) => setPublicationForm({ ...publicationForm, public_price: event.target.value })} /></div><div className="marketplace-form-grid"><TextInput label={i18n.catalog["marketplace.fields.arabicName"]} value={publicationForm.public_name_ar} onChange={(event) => setPublicationForm({ ...publicationForm, public_name_ar: event.target.value })} /><TextInput label={i18n.catalog["marketplace.fields.englishName"]} value={publicationForm.public_name_en} onChange={(event) => setPublicationForm({ ...publicationForm, public_name_en: event.target.value })} /></div></Dialog>
    <Dialog isOpen={dialog === "offer"} onClose={() => setDialog(null)} title={i18n.catalog["marketplace.studios.campaign"]} maxWidth="720px" footer={<><Button variant="secondary" onClick={() => setDialog(null)}>{i18n.catalog["common.general.cancel"]}</Button><Button variant="primary" onClick={() => void submitOffer()}>{i18n.catalog["common.general.add"]}</Button></>}><div className="marketplace-form-grid"><div className="form-group"><label>{i18n.catalog["marketplace.fields.merchant"]}</label><SearchableSelect options={merchantOptions} value={offerForm.merchant_id || null} onChange={(value) => setOfferForm({ ...offerForm, merchant_id: value ? String(value) : "" })} /></div><div className="form-group"><label>{i18n.catalog["marketplace.fields.item"]}</label><SearchableSelect options={publicationOptions} value={offerForm.publication_id || null} onChange={(value) => setOfferForm({ ...offerForm, publication_id: value ? String(value) : "" })} /></div></div><div className="marketplace-form-grid"><TextInput label={i18n.catalog["marketplace.fields.slug"]} value={offerForm.slug} onChange={(event) => setOfferForm({ ...offerForm, slug: event.target.value })} /><TextInput label={i18n.catalog["marketplace.fields.arabicName"]} value={offerForm.title_ar} onChange={(event) => setOfferForm({ ...offerForm, title_ar: event.target.value })} /></div><div className="marketplace-form-grid"><div className="form-group"><label>{i18n.catalog["marketplace.fields.benefitType"]}</label><select className="form-control" value={offerForm.benefit_type} onChange={(event) => setOfferForm({ ...offerForm, benefit_type: event.target.value })}>{["percentage", "fixed_amount", "fixed_price", "bundle", "gift"].map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></div><TextInput label={i18n.catalog["marketplace.fields.benefitValue"]} type="number" min="0" value={offerForm.benefit_value} onChange={(event) => setOfferForm({ ...offerForm, benefit_value: event.target.value })} /></div><div className="marketplace-form-grid"><TextInput label={i18n.catalog["marketplace.fields.startsAt"]} type="datetime-local" value={offerForm.starts_at} onChange={(event) => setOfferForm({ ...offerForm, starts_at: event.target.value })} /><TextInput label={i18n.catalog["marketplace.fields.endsAt"]} type="datetime-local" value={offerForm.ends_at} onChange={(event) => setOfferForm({ ...offerForm, ends_at: event.target.value })} /></div></Dialog>
    <Dialog isOpen={dialog === "inquiry"} onClose={() => setDialog(null)} title={i18n.catalog["marketplace.actions.createInquiry"]} maxWidth="720px" footer={<><Button variant="secondary" onClick={() => setDialog(null)}>{i18n.catalog["common.general.cancel"]}</Button><Button variant="primary" onClick={() => void submitInquiry()}>{i18n.catalog["common.general.add"]}</Button></>}><div className="marketplace-form-grid"><div className="form-group"><label>{i18n.catalog["marketplace.fields.merchant"]}</label><SearchableSelect options={merchantOptions} value={inquiryForm.merchant_id || null} onChange={(value) => setInquiryForm({ ...inquiryForm, merchant_id: value ? String(value) : "" })} /></div><div className="form-group"><label>{i18n.catalog["marketplace.fields.item"]}</label><SearchableSelect options={productOptions} value={inquiryForm.product_id ? Number(inquiryForm.product_id) : null} onChange={(value) => setInquiryForm({ ...inquiryForm, product_id: value ? String(value) : "" })} /></div></div><div className="marketplace-form-grid"><TextInput label={i18n.catalog["marketplace.fields.customer"]} value={inquiryForm.customer_name} onChange={(event) => setInquiryForm({ ...inquiryForm, customer_name: event.target.value })} /><TextInput label={i18n.catalog["marketplace.fields.customerEmail"]} type="email" value={inquiryForm.customer_email} onChange={(event) => setInquiryForm({ ...inquiryForm, customer_email: event.target.value })} /></div><div className="marketplace-form-grid"><TextInput label={i18n.catalog["marketplace.fields.customerPhone"]} value={inquiryForm.customer_phone} onChange={(event) => setInquiryForm({ ...inquiryForm, customer_phone: event.target.value })} /><TextInput label={i18n.catalog["marketplace.fields.quantity"]} type="number" min="1" value={inquiryForm.quantity} onChange={(event) => setInquiryForm({ ...inquiryForm, quantity: event.target.value })} /></div><div className="form-group"><label>{i18n.catalog["marketplace.fields.message"]}</label><textarea className="form-control" rows={3} value={inquiryForm.message} onChange={(event) => setInquiryForm({ ...inquiryForm, message: event.target.value })} /></div></Dialog>
    <Dialog isOpen={dialog === "convert"} onClose={() => setDialog(null)} title={i18n.catalog["marketplace.actions.convertToQuotation"]} maxWidth="560px" footer={<><Button variant="secondary" onClick={() => setDialog(null)}>{i18n.catalog["common.general.cancel"]}</Button><Button variant="primary" onClick={() => void submitConversion()}>{i18n.catalog["common.general.confirm"]}</Button></>}><div className="form-group"><label>{i18n.catalog["common.general.type"]}</label><select className="form-control" value={conversionForm.target} onChange={(event) => setConversionForm({ ...conversionForm, target: event.target.value })}><option value="quotation">{i18n.catalog["marketplace.actions.convertToQuotation"]}</option><option value="service_sale">{i18n.catalog["marketplace.actions.convertToServiceSale"]}</option></select></div>{conversionForm.target === "service_sale" && <><div className="form-group"><label>{i18n.catalog["marketplace.fields.customer"]}</label><SearchableSelect options={customerOptions} value={conversionForm.customer_id ? Number(conversionForm.customer_id) : null} onChange={(value) => setConversionForm({ ...conversionForm, customer_id: value ? String(value) : "" })} /></div><div className="form-group"><label>{i18n.catalog["common.general.paymentMethod"]}</label><select className="form-control" value={conversionForm.payment_type} onChange={(event) => setConversionForm({ ...conversionForm, payment_type: event.target.value })}><option value="cash">{i18n.catalog["common.general.cash"]}</option><option value="credit">{i18n.catalog["common.general.deferred"]}</option></select></div></>}</Dialog>
    <Dialog isOpen={dialog === "media-upload"} onClose={() => setDialog(null)} title={i18n.catalog["marketplace.actions.addMedia"]} maxWidth="640px" footer={<><Button variant="secondary" onClick={() => setDialog(null)}>{i18n.catalog["common.general.cancel"]}</Button><Button variant="primary" onClick={() => void uploadMedia()}>{i18n.catalog["common.general.add"]}</Button></>}><div className="form-group"><label>{i18n.catalog["marketplace.fields.merchant"]}</label><SearchableSelect options={merchantOptions} value={mediaForm.merchant_id || null} onChange={(value) => setMediaForm({ ...mediaForm, merchant_id: value ? String(value) : "" })} /></div><label className="marketplace-upload-zone"><input type="file" accept={i18n.catalog["marketplace.general.acceptedMediaTypes"]} onChange={(event: ChangeEvent<HTMLInputElement>) => setMediaForm({ ...mediaForm, file: event.target.files?.[0] || null })} /><span>{mediaForm.file?.name || i18n.catalog["marketplace.actions.addMedia"]}</span></label><div className="marketplace-form-grid"><TextInput label={i18n.catalog["marketplace.fields.altTextArabic"]} value={mediaForm.alt_text_ar} onChange={(event) => setMediaForm({ ...mediaForm, alt_text_ar: event.target.value })} /><TextInput label={i18n.catalog["marketplace.fields.altTextEnglish"]} value={mediaForm.alt_text_en} onChange={(event) => setMediaForm({ ...mediaForm, alt_text_en: event.target.value })} /></div></Dialog>
    <Dialog isOpen={dialog === "media-assign"} onClose={() => setDialog(null)} title={i18n.catalog["marketplace.fields.mediaRole"]} maxWidth="640px" footer={<><Button variant="secondary" onClick={() => setDialog(null)}>{i18n.catalog["common.general.cancel"]}</Button><Button variant="primary" onClick={() => void assignMedia()}>{i18n.catalog["common.general.confirm"]}</Button></>}>{selectedMedia && <div className="marketplace-media-assignment"><MediaTile url={selectedMedia.url} label={selectedMedia.original_name} type={selectedMedia.mime_type.startsWith("video/") ? "video" : "image"} /><div className="form-group"><label>{i18n.catalog["common.general.type"]}</label><select className="form-control" value={assignmentForm.target_type} onChange={(event) => setAssignmentForm({ target_type: event.target.value, target_id: "", role: event.target.value === "offer" ? "campaign" : "cover" })}><option value="publication">{i18n.catalog["marketplace.tabs.publications"]}</option><option value="offer">{i18n.catalog["marketplace.tabs.offers"]}</option></select></div><div className="form-group"><label>{i18n.catalog["marketplace.fields.item"]}</label><SearchableSelect options={assignmentForm.target_type === "publication" ? publicationOptions : offers.map((item) => ({ value: item.id, label: display(item.title), subtitle: item.slug }))} value={assignmentForm.target_id || null} onChange={(value) => setAssignmentForm({ ...assignmentForm, target_id: value ? String(value) : "" })} /></div><div className="form-group"><label>{i18n.catalog["marketplace.fields.mediaRole"]}</label><select className="form-control" value={assignmentForm.role} onChange={(event) => setAssignmentForm({ ...assignmentForm, role: event.target.value })}>{(assignmentForm.target_type === "publication" ? ["cover", "gallery", "thumbnail"] : ["campaign", "gallery"]).map((role) => <option key={role}>{role}</option>)}</select></div></div>}</Dialog>
    </main></MainLayout>;
}
