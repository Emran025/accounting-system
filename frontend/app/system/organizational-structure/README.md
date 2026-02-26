# Organizational Structure Configuration Engine
## Enterprise ERP Kernel Design (SAP SPRO-style)

**Version:** 1.0  
**Status:** Architecture Specification  
**Context:** Backbone for Finance, Logistics, Sales org structure (الهيكل التنظيمي)

---

## Core Philosophy

The system distinguishes between **Definition** (creating the nodes) and **Assignment** (linking the nodes).

---

## 1. Entity-Relationship Diagram Description

### Layer 1: The Entity Meta-Registry (The "DNA")

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Org_Meta_Types                                   │
├─────────────────────────────────────────────────────────────────────────┤
│ PK  id                  VARCHAR(32)   e.g. 'COMP_CODE', 'PLANT'         │
│     display_name        VARCHAR(100)  'Company Code', 'Plant'           │
│     level_domain        VARCHAR(32)   'Financial'|'Logistics'|'Sales'   │
│     description         TEXT          Human-readable description        │
│     is_assignable       BOOLEAN       Can this type be linked as target?│
│     sort_order          INT           Display ordering                  │
│     created_at, updated_at                                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1:N
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   Org_Meta_Type_Attributes                              │
├─────────────────────────────────────────────────────────────────────────┤
│ PK  id                  BIGINT AUTO_INCREMENT                           │
│ FK  org_meta_type_id    VARCHAR(32)  → Org_Meta_Types.id                │
│     attribute_key       VARCHAR(64)  e.g. 'currency_id', 'chart_of_acct'│
│     attribute_type      VARCHAR(20)  'string'|'uuid'|'integer'|'json'   │
│     is_mandatory        BOOLEAN      Must be provided on create         │
│     default_value       TEXT         Optional default                   │
│     validation_rule     JSON         e.g. {"min":1,"max":4}             │
│     reference_type_id   VARCHAR(32)  Optional FK to another meta type   │
│     sort_order          INT                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

**Example Meta-Registry Data:**

┌────────────────────────────────────────────────────────────────────────────────┐
| id        | level_domain | Mandatory Attributes (via Org_Meta_Type_Attributes) |
|-----------|--------------|-----------------------------------------------------|
| COMP_CODE | Financial    | currency_id, chart_of_accounts_id                   |
| PLANT     | Logistics    | factory_calendar_id, country_code                   |
| BUS_AREA  | Financial    | (none)                                              |
| PURCH_ORG | Logistics    | (optional: company_code_id or plant_id)             |
└────────────────────────────────────────────────────────────────────────────────┘

---

### Layer 2: The Topology Constraints Engine (The "Map Rules")

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Topology_Rules_Matrix                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ PK  id                      BIGINT AUTO_INCREMENT                           │
│     source_node_type_id     VARCHAR(32)  → Org_Meta_Types (e.g. 'PLANT')    │
│     target_node_type_id     VARCHAR(32)  → Org_Meta_Types (e.g. 'COMP_CODE')│
│     cardinality             ENUM('1:1','1:N','N:1','N:M')                   │
│     link_direction          ENUM('source_to_target','target_to_source')     │
│     constraint_logic        JSON         Validation rules (see below)       │
│     is_active               BOOLEAN      Rule can be disabled               │
│     description             TEXT         e.g. "Plant assigns to Company"    │
│     created_at, updated_at                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Cardinality Semantics:**
- `1:N` = One target can have many sources (e.g., 1 Company Code → many Plants)
- `N:1` = Many sources link to one target (e.g., many Plants → 1 Company Code)
- `1:1` = Strict 1:1 assignment
- `N:M` = Many-to-many (e.g., Purchase Org ↔ Plants/Company Codes)

**Constraint_Logic JSON Schema:**
```json
{
  "rules": [
    {
      "type": "attribute_match",
      "source_attr": "country_code",
      "target_attr": "country_code",
      "operator": "eq"
    },
    {
      "type": "ancestor_required",
      "path": ["COMP_CODE", "CONTROLLING_AREA"]
    }
  ]
}
```

---

### Layer 3: The Structural Data Layer (The "Instances")

```
┌───────────────────────────────────────────────────────────────────────────┐
│                        Structure_Nodes                                    │
├───────────────────────────────────────────────────────────────────────────┤
│ PK  node_uuid            UUID         Globally unique (polymorphic key)   │
│ FK  node_type_id         VARCHAR(32)  → Org_Meta_Types.id                 │
│     code                 VARCHAR(32)  Human-readable key (e.g. '1000')    │
│     attributes_json      JSONB        Type-specific attributes            │
│     status               ENUM('active','inactive','archived')             │
│     valid_from           DATE         Optional validity start             │
│     valid_to             DATE         Optional validity end               │
│     created_by, updated_by            Audit fields                        │
│     created_at, updated_at                                                │
├───────────────────────────────────────────────────────────────────────────┤
│ UNIQUE(node_type_id, code)  -- Ensures one '1000' per type                │
└───────────────────────────────────────────────────────────────────────────┘
```

**No separate tables** like T001 (Companies) or T001W (Plants). All org units live here.

---

### Layer 4: The Association Matrix (The "Wiring")

```
┌───────────────────────────────────────────────────────────────────────────┐
│                        Structure_Links                                    │
├───────────────────────────────────────────────────────────────────────────┤
│ PK  id                   BIGINT AUTO_INCREMENT                            │
│ FK  source_node_uuid     UUID         → Structure_Nodes.node_uuid         │
│ FK  target_node_uuid     UUID         → Structure_Nodes.node_uuid         │
│ FK  topology_rule_id     BIGINT       → Topology_Rules_Matrix.id (audit)  │
│     link_type            VARCHAR(32)  e.g. 'assignment','reporting'       │
│     priority             INT          For multiple links, resolution order│
│     valid_from, valid_to DATE         Link validity window                │
│     created_at, updated_at                                                │
├───────────────────────────────────────────────────────────────────────────┤
│ UNIQUE(source_node_uuid, target_node_uuid, link_type)                     │
│ CHECK (source_node_uuid != target_node_uuid)                              │
└───────────────────────────────────────────────────────────────────────────┘
```

---

### Layer 5: Context & Valuation Scope (Views/Logic)

```
┌──────────────────────────────────────────────────────────────────────────┐  
│              Scope_Context_Resolution (View / Stored Logic)              │
├──────────────────────────────────────────────────────────────────────────┤
│ Input:  anchor_node_uuid (e.g. Plant_X)                                  │
│ Output: Resolved context per node type in scope chain                    │
│                                                                          │
│ Resolved columns (examples):                                             │
│   - company_code_uuid, company_code, currency_id                         │
│   - controlling_area_uuid, controlling_area                              │
│   - plant_uuid, plant_code                                               │
│   - purchase_org_uuid                                                    │
│   - inherited_attributes_json (merged from ancestors)                    │
└──────────────────────────────────────────────────────────────────────────┘
```

**Resolution Algorithm:** Recursive CTE traversing `Structure_Links` from anchor upward, inheriting `attributes_json` from parent nodes.

---

## 2. Constraint Logic Pseudo-code

### Prevent Deleting Company Code with Assigned Plants

```pseudocode
FUNCTION CanDeleteNode(node_uuid UUID) RETURNS (allowed BOOLEAN, reason TEXT)

    node = SELECT * FROM Structure_Nodes WHERE node_uuid = node_uuid
    IF node IS NULL THEN
        RETURN (FALSE, "Node not found")
    END IF

    node_type = node.node_type_id

    -- Find topology rules where this node type is the TARGET (children depend on it)
    dependent_rules = SELECT *
        FROM Topology_Rules_Matrix
        WHERE target_node_type_id = node_type
          AND is_active = TRUE

    FOR EACH rule IN dependent_rules
        source_type = rule.source_node_type_id

        -- Count links: nodes of source_type that point TO our node
        child_count = SELECT COUNT(*)
            FROM Structure_Links sl
            JOIN Structure_Nodes sn ON sn.node_uuid = sl.source_node_uuid
            WHERE sl.target_node_uuid = node_uuid
              AND sn.node_type_id = source_type
              AND (sl.valid_to IS NULL OR sl.valid_to >= CURRENT_DATE)

        IF child_count > 0 THEN
            source_label = (SELECT display_name FROM Org_Meta_Types WHERE id = source_type)
            RETURN (FALSE, 
                "Cannot delete. " || child_count || " " || source_label || "(s) are still assigned.")
        END IF
    END FOR

    -- Also check: are we a SOURCE in any active links? (orphan prevention optional)
    -- For delete, we may allow: unlink first, then delete. Policy decision.

    RETURN (TRUE, NULL)

END FUNCTION
```

**Trigger / Application Hook:**

```pseudocode
BEFORE_DELETE ON Structure_Nodes:
    (allowed, reason) = CanDeleteNode(NEW.node_uuid)
    IF NOT allowed THEN
        RAISE EXCEPTION reason
    END IF
```

---

## 3. JSON Payload Example: Create Plant Linked to Company Code

### Request: `POST /api/structure/nodes`

```json
{
  "action": "create_with_link",
  "node": {
    "node_type_id": "PLANT",
    "code": "PLANT_RIYADH",
    "attributes": {
      "name": "Riyadh Manufacturing Plant",
      "country_code": "SA",
      "factory_calendar_id": "SA-TH",
      "language": "AR",
      "address": {
        "street": "Industrial Area 1",
        "city": "Riyadh",
        "postal_code": "12345"
      }
    },
    "status": "active"
  },
  "link": {
    "target_node_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "target_node_type_id": "COMP_CODE",
    "target_node_code": "1000",
    "link_type": "assignment",
    "validate_constraints": true
  }
}
```

### Backend Validation Flow (Pseudo-code)

```pseudocode
1. Validate node payload against Org_Meta_Type_Attributes for PLANT:
   - factory_calendar_id: mandatory ✓
   - country_code: mandatory ✓

2. Fetch target node (Company Code 1000) by UUID; verify type = COMP_CODE

3. Query Topology_Rules_Matrix:
   - source_node_type_id = 'PLANT', target_node_type_id = 'COMP_CODE'
   - Cardinality = N:1 (many plants → one company) ✓

4. Evaluate constraint_logic:
   - If rule: "Parent and Child must share same Country"
   - Compare node.attributes.country_code with target.attributes_json->>'country_code'
   - If not equal → REJECT 400

5. INSERT Structure_Nodes (new plant)
6. INSERT Structure_Links (source=new_plant_uuid, target=company_code_uuid)
7. RETURN 201 with created node + link
```

### Response: `201 Created`

```json
{
  "node": {
    "node_uuid": "f9e8d7c6-b5a4-3210-fedc-ba9876543210",
    "node_type_id": "PLANT",
    "code": "PLANT_RIYADH",
    "attributes": {
      "name": "Riyadh Manufacturing Plant",
      "country_code": "SA",
      "factory_calendar_id": "SA-TH",
      "language": "AR",
      "address": { "street": "Industrial Area 1", "city": "Riyadh", "postal_code": "12345" }
    },
    "status": "active"
  },
  "link": {
    "id": 42,
    "source_node_uuid": "f9e8d7c6-b5a4-3210-fedc-ba9876543210",
    "target_node_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "link_type": "assignment"
  }
}
```

---

## 4. Scope Context Resolution: Recursive CTE Example

**Query:** "If I am in Plant_X, what is my Company Code, Controlling Area, and Currency?"

```sql
WITH RECURSIVE scope_chain AS (
    -- Anchor: start from the given plant
    SELECT
        sn.node_uuid,
        sn.node_type_id,
        sn.code,
        sn.attributes_json,
        0 AS depth
    FROM Structure_Nodes sn
    WHERE sn.node_uuid = :anchor_node_uuid
      AND sn.status = 'active'

    UNION ALL

    -- Recursive: walk up via links (plant → company code → controlling area)
    SELECT
        parent.node_uuid,
        parent.node_type_id,
        parent.code,
        parent.attributes_json,
        sc.depth + 1
    FROM scope_chain sc
    JOIN Structure_Links sl ON sl.source_node_uuid = sc.node_uuid
    JOIN Structure_Nodes parent ON parent.node_uuid = sl.target_node_uuid
    WHERE parent.status = 'active'
      AND (sl.valid_to IS NULL OR sl.valid_to >= CURRENT_DATE)
      AND sc.depth < 10  -- Prevent infinite loop
)
SELECT
    MAX(CASE WHEN node_type_id = 'COMP_CODE' THEN code END) AS company_code,
    MAX(CASE WHEN node_type_id = 'COMP_CODE' THEN attributes_json->>'currency_id' END) AS currency_id,
    MAX(CASE WHEN node_type_id = 'CONTROLLING_AREA' THEN code END) AS controlling_area
FROM scope_chain;
```

---

## 5. Summary ER Overview (All Layers)

```
Org_Meta_Types ──┬── Org_Meta_Type_Attributes
                 │
                 └── Topology_Rules_Matrix (source_type_id, target_type_id)
                            │
Structure_Nodes ◄───────────┼──────────► Structure_Links
(polymorphic)               │            (enforces topology)
                            │
Scope_Context_Resolution (CTE / View over Structure_Nodes + Structure_Links)
```

---

## Next Steps for Implementation

1. Create Laravel migrations for the 5 core tables.
2. Implement `OrgStructureService` with validation hooks.
3. Add API controllers for CRUD on nodes and links.
4. Build frontend UI at `/system/organizational-structure` (update nav link from row 33).
5. Seed `Org_Meta_Types` and `Topology_Rules_Matrix` with initial Finance/Logistics types.
