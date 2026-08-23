# Enterprise setup UX principles

## Source-informed decisions

The setup experience should use one coherent responsive implementation across desktop, tablet, and mobile, while progressively reducing low-priority complexity on narrower screens. SAP Fiori recommends responsive controls and a mobile-first approach; it also recommends an adaptive reduction of complexity when a desktop workflow cannot be presented unchanged on smaller devices. [1]

The layout should use repeatable spacing, constrained reading width, predictable grouping, and responsive reflow. Fluent explains that consistent spacing establishes relationships and hierarchy, and that layouts should reposition, resize, reflow, or progressively disclose content according to viewport size. [2]

The setup should keep labels visible, provide concise helper text for format or business context, use selection controls rather than free-form entry where values are governed, and keep related controls aligned in a form grid. These decisions follow Carbon’s enterprise form guidance. [3]

## Applied rules

1. The guided setup will have a stable, single-column reading flow with a constrained maximum width and a single primary action per phase.
2. Template choice will be a concise overview with progressive detail; the advanced organization designer remains outside onboarding.
3. Profile fields will use visible labels and helper text, with responsive reflow from paired columns to one column.
4. Smart text direction is a component behavior: `dir="auto"` and content-aware alignment will follow the first strong character of a user-entered value. Technical fields retain a forced left-to-right direction.
5. The existing component library remains the first choice. Global selectors in `globals.css` are used only to compose those components into setup-specific layouts.
6. Status is shown as a layered progression: business profile, organization foundation, operating context, and enabled capabilities. A global final-ready state must not conceal a completed intermediate state.

## References

[1]: https://www.sap.com/design-system/fiori-design-web/v1-96/discover/sap-design-system/vision-and-mission/responsiveness-adaptiveness "SAP Fiori responsive and adaptive design"
[2]: https://fluent2.microsoft.design/layout "Fluent 2 layout guidance"
[3]: https://carbondesignsystem.com/components/form/usage/ "Carbon form usage guidance"
