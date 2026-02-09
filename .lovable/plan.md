

## Fix: Product Thumbnail Overlapping Images

### Problem
Product card images and logo overlays are stacking on top of each other in the storefront product grid. This has persisted through multiple fix attempts because the root cause is a CSS layout issue with percentage-based positioning inside a `paddingTop: "100%"` container.

### Root Cause
The `paddingTop: "100%"` trick creates a square container by setting content height to 0 and using padding for visual height. Logo overlay images are positioned using percentage-based `top`/`left` values (e.g., `top: 20%`), but CSS resolves percentage `top` against the **content height**, which is 0. This causes all overlays to collapse to the same position, stacking on top of each other.

The product image itself works because it's inside an `absolute inset-0` inner div that has real dimensions. But the logo overlay is a sibling to that inner div, not inside it.

### Fix (1 file)

**`src/components/team-stores/StorefrontProductGrid.tsx`**

Move the primary logo overlay `<img>` tag **inside** the `absolute inset-0` wrapper div, so its percentage-based positioning resolves against the wrapper's actual pixel dimensions instead of the parent's zero-height content box.

Before (simplified):
```text
div.relative (paddingTop: 100%, content height = 0)
  +-- div.absolute.inset-0        <-- has real dimensions
  |     +-- product image
  +-- img.absolute (logo overlay) <-- % top resolves to 0!
```

After:
```text
div.relative (paddingTop: 100%)
  +-- div.absolute.inset-0        <-- has real dimensions
        +-- product image
        +-- img.absolute (logo)   <-- % top resolves correctly
```

This is a single structural change -- moving the logo overlay block from being a sibling of the inset-0 div to being a child of it. No other files need changes.

