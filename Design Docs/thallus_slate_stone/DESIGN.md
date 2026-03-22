# Design System Document: High-End Editorial Simulation & Reporting

## 1. Overview & Creative North Star

### Creative North Star: "The Intellectual Architect"
This design system moves away from the generic utility of "simulation apps" toward a high-end editorial experience. It is designed to feel like a premium digital publication—authoritative, calm, and meticulously organized. We achieve this by prioritizing **Tonal Depth** over structural lines and **Editorial Typography** over standard interface labels.

The "template" look is intentionally broken through:
*   **Intentional Asymmetry:** Using the Spacing Scale to create wide margins and "off-center" content blocks that guide the eye naturally.
*   **Layered Surfaces:** Replacing 1px borders with nested background tones to create a sense of physical weight and premium material.
*   **High-Contrast Scale:** Utilizing the massive gap between `display-lg` and `label-sm` to establish a clear information hierarchy that feels curated, not just displayed.

---

## 2. Colors & Surface Philosophy

The palette is anchored in deep navies (`primary: #12283c`) and sophisticated slates, providing a "charcoal" professional feel. The legacy orange is relegated to a surgical highlight (`tertiary_fixed_dim: #ffb783`) used only for critical interactions.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section content. Boundaries must be defined solely through background color shifts. 
*   *Example:* A list of simulation reports should not be separated by lines; instead, use `surface-container-low` for the list background and `surface-container-lowest` for the individual card items.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use the Material surface tiers to define importance:
*   **Base:** `surface` (#f8f9f9) – The canvas.
*   **Structural Sections:** `surface-container-low` (#f3f4f4) – Used for sidebars or background groupings.
*   **Content Cards:** `surface-container-lowest` (#ffffff) – The highest point of elevation for active content.

### The "Glass & Gradient" Rule
To avoid a flat, "SaaS-lite" appearance:
*   **Floating Elements:** Use Glassmorphism for tooltips and floating action menus. Apply `surface` with 80% opacity and a `24px` backdrop-blur.
*   **Signature Textures:** Main Call-to-Actions (CTAs) should use a subtle linear gradient from `primary` (#12283c) to `primary_container` (#293e53) at a 135-degree angle. This adds a "soul" to the button that flat color cannot replicate.

---

## 3. Typography

The system utilizes a dual-font strategy to balance character with readability.

*   **Display & Headlines (Manrope):** Chosen for its geometric modernism. Used for large data points and page titles. The wide apertures of Manrope feel "open" and "trustworthy."
*   **Body & Labels (Inter):** The workhorse. Inter provides maximum legibility for complex simulation reports and data-heavy tables.

**The Editorial Hierarchy:**
*   **Page Titles (`display-md`):** Deep navy (`on_surface`), low letter-spacing (-0.02em).
*   **Sub-headers (`title-lg`):** Slate (`secondary`), medium weight.
*   **Data Labels (`label-sm`):** All-caps with 0.05em tracking using `on_surface_variant` to denote metadata without cluttering the visual field.

---

## 4. Elevation & Depth

We reject the traditional "drop shadow" in favor of **Ambient Tonal Layering.**

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. The `4-bit` color difference provides a soft, natural lift that mimics fine paper on a desk.
*   **Ambient Shadows:** If a card must "float" (e.g., a modal or a primary simulation card), use an extra-diffused shadow:
    *   *Blur:* 40px | *Spread:* -10px | *Opacity:* 6% | *Color:* `on_surface` (#191c1c).
*   **The "Ghost Border" Fallback:** If accessibility requires a container boundary, use the `outline_variant` token at **15% opacity**. Never use a 100% opaque border.
*   **Backdrop Blurs:** For navigation overlays, use a `12px` blur. This allows the simulation data to "bleed through" the UI, making the experience feel integrated.

---

## 5. Components

### Buttons
*   **Primary:** Gradient (`primary` to `primary_container`), `lg` roundedness (0.5rem), Inter Semi-bold.
*   **Secondary:** `surface-container-high` background with `primary` text. No border.
*   **Tertiary (Accent):** Use `tertiary_fixed` (#ffdcc5) for the background and `on_tertiary_fixed` (#301400) for text. Use this *only* for "New Simulation" or "Run" actions.

### Cards & Simulation Lists
*   **Constraint:** Forbid divider lines. 
*   **Structure:** Use `spacing-6` (2rem) between cards. Content within the card should use `spacing-3` (1rem) padding. 
*   **Active State:** Instead of a border, an "active" simulation card should shift from `surface-container-lowest` to `surface-bright`.

### Input Fields
*   **Style:** `surface-container-low` fill, no border.
*   **Focus State:** A 2px "Ghost Border" using `primary` at 40% opacity.
*   **Typography:** Labels must use `label-md` in `secondary` color, positioned strictly above the field, never as placeholder text.

### Simulation Chips
*   **Status Indicators:** Use `error_container` for failures and a custom "Success" (tinted from secondary) for completions. Avoid bright green; keep it muted to maintain the sophisticated palette.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use white space as a structural element. If a section feels crowded, increase spacing to `spacing-10` rather than adding a divider.
*   **Do** use `manrope` for any number larger than 24px to emphasize simulation results.
*   **Do** utilize the "Surface Hierarchy" to nest reports inside simulation containers.

### Don’t:
*   **Don’t** use the orange (`tertiary`) for more than 5% of the screen real estate. It is a "spark," not a "flood."
*   **Don’t** use standard "drop shadows" with high opacity. If it looks like a 2010s web app, it’s too dark.
*   **Don’t** use pure black (#000000) for text. Always use `on_surface` (#191c1c) to maintain a premium, ink-on-paper feel.
*   **Don't** ever use a 1px solid border to separate list items. Use vertical breathing room.