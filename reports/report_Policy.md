# Report and Document Management Policy

This policy is built on the principle that reports and documents issued by the ERP system represent the official and legal interface of the organization. Consequently, their design and management are subject to strict engineering standards that ensure consistency, scalability, and security, regardless of the issuing module or the language used.

The system relies on a mandatory architectural separation between three independent layers: the **Template Layer**, the **Report Context Layer**, and the **Template Engine Layer**. Mixing these layers or bypassing the boundaries of responsibility between them is strictly prohibited and is considered an engineering violation.

## The Template Layer
A template is a presentation element only, consisting exclusively of HTML and CSS. Inclusion of JavaScript, conditional logic, executable code, or external calls is strictly forbidden. Templates do not interact with the database, APIs, or system modules; they only receive prepared data. The goal is to ensure the template remains static, secure, and reusable across any output context (view, print, PDF, email).

Semantic keys (Placeholders) are used within templates in a unified format, such as `{{employee.name}}` or `{{invoice.total}}`. These keys represent a fixed semantic contract between the template and the system and must not be linked directly to column names or queries. Any template containing unapproved or undocumented keys will be automatically rejected.

## The Report Context Layer
The Report Context is the sole source of data injected into the template. It is built within the service layer of each business module and contains clear logical objects (e.g., `employee`, `invoice`, `customer`). The context must be formally documented, structurally stable, and extensible by adding new properties without affecting existing templates.

When creating or activating any new reporting module, the engineering team is required to define its standard context and document all available keys. This definition serves as the official reference for designers and is subsequently used for automated template verification.

## Template Management and Governance
Templates are managed exclusively via the **Template Management Form**; direct entry or modification in the database is prohibited. This form is a component of engineering governance, not merely a user interface. The form consists of interconnected mandatory axes:

*   **Axis 1: Template Definition**: Includes the template name, associated module, report type, status (Draft/Approved), and **Language**. Language selection at this stage is mandatory; no template can be saved without specifying a single, clear language. A single template represents only one language; combining multiple languages within the same design is not allowed.
*   **Axis 2: Approved Keys Display**: Approved keys for the specific module are displayed based on the associated context. No key outside this list can be inserted. This constraint ensures the template remains logically compatible with its module, regardless of the language.
*   **Axis 3: Design Input (HTML + CSS)**: During design, the designer can insert keys manually or select them from the approved list. Upon saving, the system analyzes the template, extracts the used keys, and verifies their compatibility with the allowed keys—independent of the language, as language does not affect the semantic structure of the keys.

After structural verification, the template undergoes a pilot execution using dummy data, considering text direction (LTR or RTL) based on the chosen language. This test is mandatory and aims to ensure the design is visually and linguistically valid before approval.

## Language Management
Languages are managed according to the principle that **Language is a property of the template, not the data**. This means the same invoice can be displayed in several languages via different templates that share the same data context and keys but differ in text and formatting. Writing conditional text within a template based on language is not permitted.

The system supports multiple templates for the same module and purpose, each in a different language, with the ability to set a default template for each language. The system also retains all previous versions of each template and language, preventing the modification of previously approved versions.

## Versioning
The versioning system is mandatory. Any modification to an approved template creates a new version in the same language, while previous versions are preserved for use with historical documents. Changing the language of an existing template is not permitted; instead, a new template must be created for the new language.

When generating a document (invoice, certificate, report), the user selects the required language. The system then automatically selects the default template for that language within the module or allows the user to choose another approved template in the same language. If no template is available for the requested language, this is handled as a clear system state, not a silent exception.

From a security and engineering perspective, this policy prevents the insertion of unmonitored logic into templates, maintains data integrity, and ensures that multi-language support does not add programming complexity or duplication of business logic.

## Conclusion
This policy serves as a binding reference for everyone working on reports within the system. Any deviation must be based on a documented architectural decision. Compliance ensures that the reporting system remains scalable, organized, and compatible with the long-term requirements of multi-language organizations.

---

# Engineering Directives for Reporting Modules

When creating any new business module or activating an existing one that contains reports or documents, the engineering team is required to treat the reporting module as a **Cross-Cutting Component**, not as a local sub-part of the module. Every module (Invoices, Purchases, HR, Assets, Contracts) must adhere to the same lifecycle and mechanisms without exception.

1.  **Directives start with Context, not Template**: Design does not begin with the template; it begins with the **Report Context Definition**. Before writing any HTML or CSS, the team must determine: What logical entity do the reports in this module represent? What are the primary objects the report will need? Which properties are stable and long-term, and which are secondary? This definition must be written and reviewed, as it will become the reference upon which all current and future templates are built.
2.  **Stable Context Interface**: The data context must be designed as a **Stable Contract**, not as a direct reflection of the database structure. Keys must not be linked to column names or ORM relationships. Internal database changes must not affect the context; any such impact is considered an architectural failure. The goal is for templates to remain valid even as the system's internal structure evolves.
3.  **Engineer Responsibility for Keys**: Defining available keys is the responsibility of the engineering team, not the designer. The designer consumes the keys but does not create them. When a new reporting module is activated, designers must be provided with an official, documented list of keys, including a semantic description of each key, the expected data type, and its purpose.
4.  **No Context, No Templates**: Any module that does not have a documented context is not permitted to have templates. "Temporary" solutions or "quick" templates are not accepted. Pre-documentation is a prerequisite for activation, not a later step.
5.  **Governance via Management Form**: The template management form is part of governance, not just an input tool. When designing or activating this form within a module, ensure it enforces all constraints automatically: language selection, module linking, displaying only approved keys, preventing saves on errors, and forcing pilot execution. Manual bypasses (e.g., direct database entries) are explicit violations.
6.  **Language Defined at Creation**: Language is determined when the template is created and is not inferred later. The module must not rely on the user's language or system settings to automatically determine the template language without an approved template for that language existing. This separation prevents overlap between localization logic and reporting logic.
7.  **Support Multiple Templates by Design**: The module must support multiple templates as a standard state, not an exception. It should not be assumed that "only one template" exists. From the outset, the module must be designed to allow multiple templates, multiple languages, and multiple versions, with a clear default template.
8.  **Integrity of Versions**: Previous versions are not just archives; they are part of system integrity. When activating a module or updating a template, ensure that historical documents remain linked to the template version they were created with. The appearance of a previous document must not be changed retroactively without an explicit and logged administrative action.
9.  **Pilot Testing as a Prerequisite**: Visual and linguistic testing is part of activation, not a later stage. When activating a new reporting module, templates must be tested across their different languages, text directions, and data conditions (long data, null values, large numbers). A template that only succeeds in "ideal cases" is considered engineered poorly.
10. **Centralized Substitution Engine**: The substitution engine must be used exclusively via a central interface. No module is allowed to perform manual or partial substitution. This unification ensures that any security or performance improvements in the engine are reflected across all modules without further modification.

Finally, engineering teams must treat this policy as the **dividing line between a system capable of growth and one that will erode over time**. Small "shortcuts" today will turn into significant operational burdens later, especially in multi-language and multi-module environments.

These directives are not optional guidelines; they are a practical extension of engineering policy and must be used as an **Engineering Checklist** when:
*   Creating a new module.
*   Activating reports in an existing module.
*   Reviewing implementation quality.
*   Handing over the system to a new team.

---

# Engineering Specification for the Template Editor

The Template Editor is an **Assistive Interface**, not an independent logical component. Its primary function is to **enable designers to produce structurally correct and architecturally compliant templates**, minimizing errors before the template reaches the final validation layer on the server. Consequently, the editor holds no final decision-making authority and is not a **Source of Truth**; it operates strictly within the boundaries of pre-defined system contracts.

From an architectural perspective, the editor resides within the **Presentation Layer** and interacts only with pre-defined outputs: module definitions, approved key lists, selected languages, and mock data. The editor does not create keys, modify context, or perform actual substitution using real production data. Any attempt to extend the editor beyond these boundaries is a direct violation of engineering policy.

The editor's architecture is built upon three parallel workflows: **Design Editing, Real-time Validation, and Live Preview**. These workflows collaborate to enhance the designer's experience while remaining subject to the same engineering constraints.

1.  **Design Editing**: The editor provides a dedicated environment for HTML and CSS only. It supports syntax highlighting, line numbering, and basic structural error detection. This support is not intended to transform the editor into a full IDE, but rather to ensure the production of clean, readable templates. The insertion of JavaScript, executable expressions, or unauthorized tags is strictly prohibited and must be blocked immediately at the interface level.
2.  **Real-time Validation**: The editor analyzes template content during composition to extract all semantic keys in the `{{...}}` format. These keys are compared directly against the **Approved Key List** loaded for the selected module. Each key is immediately classified as valid or invalid and visually flagged. This validation is interactive and advisory; it does not replace the final server-side validation. Architecturally, the editor does not "understand" the meaning of a key; it only verifies its existence within the permitted contract. Deeper semantic logic (such as data type compatibility or mandatory fields) remains the responsibility of the server layer.
3.  **Live Preview**: This is the most sensitive component regarding design integrity. Previews never rely on real data; they use a pre-defined **Mock Context** for each module. Upon modification or temporary save, the template is sent to an internal API that processes it through the substitution engine using mock data. The result is returned to the editor and rendered within a **Sandbox** environment. This isolation is a fundamental security requirement to prevent unexpected interactions with the system or the browser.

**Language Selection** is a mandatory property from the start of the design process. Language is not a cosmetic choice but an architectural variable affecting text direction, mock data, and rendering standards. A single template represents a single language. The live preview must accurately reflect this language, including text direction (LTR or RTL) and potential text lengths. The editor is not permitted to perform automated translation; it renders the design exactly as written using language-appropriate mock data.

From a User Experience (UX) standpoint, the editor must clearly distinguish between "permitted" and "rejected" actions. Any key errors, unauthorized elements, or missing language definitions must be flagged immediately with simplified engineering explanations rather than ambiguous messages. This guidance reduces developer dependency for correcting design errors and allows designers to work confidently within system boundaries.

Regarding **System Integration**, the editor interacts with specific, well-defined APIs:
*   An API to fetch module definitions and approved keys.
*   An API to execute mock previews.
*   An API to save the template as a draft or request approval.

The editor is not permitted to save approved templates directly or bypass the formal approval lifecycle.

In conclusion, this editor is not a free-form tool but an **Engineering Control Layer with a Visual Interface**. Its success is measured not by the number of features, but by its adherence to engineering policy and its ability to prevent deviations before they reach the system core. When implemented correctly, it facilitates the designer's work while protecting the system from long-term visual and logical entropy.

This specification is a complementary part of the Engineering Policy and must be referenced when:
*   Designing the editor interface.
*   Reviewing its implementation.
*   Expanding it to support new modules or languages.
