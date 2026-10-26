import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Accordion } from "@/components/ui/accordion";

/** رگرسیون باگ #212: <p> داخل <p> باعث بازنویسی درخت توسط مرورگر و شکستن hydration می‌شد. */
function render(content: ReactNode, extra: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    createElement(Accordion, {
      items: [{ id: "a", title: "عنوان", content }],
      ...extra,
    }),
  );
}

describe("Accordion HTML validity (issue #212)", () => {
  it("does not put a nested <p> answer inside a <p> wrapper", () => {
    const html = render(createElement("p", { className: "leading-7" }, "جواب بلوکی"));
    expect(html).not.toContain('<p class="px-4');
    expect(/<p\b[^>]*>(?:(?!<\/p>)[\s\S])*?<p\b/.test(html)).toBe(false);
  });

  it("does not put a list answer inside a <p> wrapper", () => {
    const html = render(createElement("ul", null, createElement("li", null, "مورد")));
    expect(/<p\b[^>]*>(?:(?!<\/p>)[\s\S])*?<ul\b/.test(html)).toBe(false);
    expect(html).toContain("<li>مورد</li>");
  });

  it("keeps the semantic <p> wrapper for plain text answers", () => {
    const html = render("جواب متنی");
    expect(html).toContain('<p class="px-4');
    expect(html).toContain("جواب متنی");
  });

  it("honours contentBlock=true even for plain text", () => {
    const html = render("جواب متنی", { contentBlock: true });
    expect(html).not.toContain('<p class="px-4');
    expect(html).toContain('<div class="px-4');
  });
});
