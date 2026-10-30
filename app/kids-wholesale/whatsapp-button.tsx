"use client";

type Props = {
  placement: "hero" | "bottom";
};

const WHATSAPP_URL =
  "https://wa.me/971559319338?text=" +
  encodeURIComponent(
    "Hello Dubai Wholesale Hub, I'm interested in kids products wholesale. Please share available products and prices."
  );

export function WhatsAppButton({ placement }: Props) {
  function handleClick() {
    const analyticsWindow = window as typeof window & {
      gtag?: (...args: unknown[]) => void;
    };

    analyticsWindow.gtag?.("event", "whatsapp_click", {
      page_name: "kids_wholesale",
      button_placement: placement,
      product_category: "kids_products",
    });
  }

  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="inline-flex min-h-14 w-full max-w-sm items-center justify-center gap-3 rounded-xl bg-green-600 px-6 py-4 text-center text-base font-bold text-white shadow-lg transition hover:bg-green-700"
    >
      Chat With Us on WhatsApp
    </a>
  );
}
