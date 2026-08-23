# Profile-driven setup templates

## Decision

The guided setup must collect business intent before it exposes any organizational objects. A selected template creates the smallest safe technical structure using the existing organization metadata and topology services. The advanced organization designer remains available for every defined organizational type; templates never constrain the system to a fixed catalogue.

## Profile inputs

- **Industry:** retail, wholesale, services, manufacturing, technology, professional-services, enterprise.
- **Scale:** micro, small, medium, enterprise.
- **Operational choices:** inventory, point of sale, purchasing, online sales, branches.
- **Organization inputs:** legal company name/code, country, currency, primary site name/code, factory calendar where inventory is enabled.

## Initial templates

| Template | Intended organization | Generated minimum structure |
|---|---|---|
| `single_store_retail` | Grocery, pharmacy, small store | Company Code, Controlling Area, Cost Center, Profit Center, Store Site (`PLANT`), Store Inventory (`STORAGE_LOC`), Retail Purchasing Org, Retail Sales Org |
| `single_store_service` | Service shop or small office | Company Code, Controlling Area, Cost Center, Profit Center, Service Sales Org |
| `multi_site_retail` | Chain or regional retailer | Same core structure, named as a primary site and ready for additional site templates |
| `professional_services` | Consulting and professional services | Company Code, Controlling Area, Cost Center, Profit Center, Service Sales Org |
| `manufacturing` | Manufacturing business | Company Code, Controlling Area, Cost Center, Profit Center, Plant, Storage Location, Purchasing Org, Sales Org |
| `enterprise_blueprint` | Large organization / Microsoft-scale rollout | Company Code, Controlling Area, Cost Center, Profit Center; leaves advanced dimensions and separate legal entities to governed expansion flows |

## Rules

1. The primary general ledger remains the seeded default template. The setup only validates its availability; it does not create a second chart-of-accounts concept.
2. A template applies only when no active foundational organization nodes exist. This prevents accidental overwrite of an existing institution.
3. The template service uses `OrgStructureService::createNodeWithLinks()` inside a single database transaction, so all metadata validation, topology rules, change history, and cost/profit integrations remain authoritative.
4. A plant is named **site/store** in the business UI. It is not described as a factory unless the chosen template is manufacturing.
5. Sales office, sales group, distribution channel, division, purchasing group, HR, and project units are extension flows. They must never be required for the initial template.
6. The setup header is refreshed immediately after a successful profile save or template application. The returned setup state and readiness data are stored together, avoiding stale completion badges.

## Extension model

The profile service provides a template catalogue, not a list of all possible organizational types. Existing metadata and the advanced designer remain the path for all other structures. A future metadata-managed template registry can move this catalogue to the database without changing the UI contract.

## UI principles

- Use `SetupSection`, `SetupField`, `SearchableSelect`, `SegmentedToggle`, and `Button` before creating a new component.
- Global setup classes live only in `frontend/app/globals.css`.
- The guided setup shows business choices and a human-readable preview. It does not show raw `PLANT`, `SALES_GROUP`, or topology codes.
- The advanced designer keeps the raw organizational graph for administrators and consultants after initial setup.
