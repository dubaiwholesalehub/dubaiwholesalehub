export const siteConfig = {
  name: "Dubai Wholesale Hub",

  companyName:
    "SANWAN ALSHAMS TRADING LLC",

  website:
    "https://dubaiwholesalehub.com",

  email:
    "info@dubaiwholesalehub.com",

  /*
   * IMPORTANT:
   * Replace this with your real UAE WhatsApp number.
   *
   * Format:
   * country code + number
   * no + sign
   * no spaces
   *
   * Example:
   * 971501234567
   */
  whatsappNumber:
    "971559319338",

  whatsappMessage:
    "Hello Dubai Wholesale Hub, I would like to enquire about wholesale products and sourcing from Dubai.",

  location:
    "Dubai, United Arab Emirates",

  description:
    "Wholesale, export and product sourcing from Dubai for international buyers.",
};

export function getWhatsAppUrl(
  message?: string,
) {
  const text =
    message ??
    siteConfig.whatsappMessage;

  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(
    text,
  )}`;
}