import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import "./Button.css";

// Shared cva-driven button: `variant` covers the colour/intent treatments already
// established across the app (plain `.btn`, `.btn-active` toggle, the solid-accent
// primary-action look PrintPreviewPanel's Print button used, and LayersPanel's
// danger-coloured delete). `size` covers the icon-only square shapes (two sizes,
// matching OverlayPanelHeader vs PrintPreviewPanel's deliberately different close-
// button sizing — docs/conventions/ui-patterns.md). Adding a new variant/size means
// adding one case here and one `.btn.btn--x` rule in Button.css — not a new
// one-off className at each call site.
//
// src/test/style/cascadeGuard.test.ts and componentStyleSnapshot.test.ts both
// static-scan JSX `className="…"` string literals — they can't see a class combo
// cva assembles at runtime, so they won't catch a future variant/size rule that
// loses the same-specificity fight cascadeGuard exists to prevent (the bug that
// made this component's `.btn.btn--x` double-class rule necessary in the first
// place — see Button.css). Keep every new Button.css rule double-classed with
// `.btn` by hand; the guard can't do it for you here.
const buttonVariants = cva("btn", {
  variants: {
    variant: {
      default: "",
      toggle: "btn--toggle",
      primary: "btn--primary",
      danger: "btn--danger",
    },
    size: {
      default: "",
      "icon-md": "btn--icon-md",
      "icon-sm": "btn--icon-sm",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, ...rest },
  ref,
) {
  const classes = [buttonVariants({ variant, size }), className].filter(Boolean).join(" ");
  return <button ref={ref} className={classes} {...rest} />;
});
