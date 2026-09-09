export type ClientPageAiResult = {
  reply: string;
  configPatch: Record<string, unknown>;
  brandPatch: Record<string, unknown>;
  selectSection?: string;
};

const SECTION_IDS = new Set([
  "hero", "intro", "services", "featured", "about", "offers", "gallery", "video",
  "testimonials", "social", "faq", "contact", "map", "cta", "booking", "loyalty",
  "rewards", "membership", "referrals", "reviews", "hours", "footer",
]);

const COLOR_ALIASES: Array<[RegExp, string]> = [
  [/\b(navy|midnight|dark\s*blue|neela|nila)\b/i, "#0F172A"],
  [/\b(blue|blu)\b/i, "#1D4ED8"],
  [/\b(red|lal|maroon)\b/i, "#B42318"],
  [/\b(green|hara|emerald)\b/i, "#047857"],
  [/\b(gold|golden|sona)\b/i, "#B45309"],
  [/\b(orange|narangi)\b/i, "#C2410C"],
  [/\b(pink|gulabi|rose)\b/i, "#BE185D"],
  [/\b(purple|violet|baingani)\b/i, "#6D28D9"],
  [/\b(black|kala|charcoal)\b/i, "#111827"],
  [/\b(brown|coffee)\b/i, "#7C2D12"],
  [/\b(teal|mint)\b/i, "#0F766E"],
  [/\b(white|safed)\b/i, "#FFFFFF"],
];

function clip(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const next = value.trim();
  return next ? next.slice(0, max) : null;
}

function isHindi(text: string) {
  return /[\u0900-\u097F]/.test(text);
}

function quotedText(message: string) {
  const match = message.match(/[“"']([^“"']{2,120})[”"']/);
  return match?.[1]?.trim() || null;
}

function looksLikeQuestion(message: string) {
  const text = message.trim();
  if (!text) return false;
  if (/\b(change|update|make|set|rewrite|hide|show|add|remove|karo|kardo|banao|badlo|likho|hatao|dikhao|lagao)\b/i.test(text)) {
    return false;
  }
  return /^(what|why|how|which|can you|do you|kya|kaise|kyun|kyu)\b/i.test(text) || /\?\s*$/.test(text);
}

function pickColor(message: string) {
  const hex = message.match(/#([0-9a-fA-F]{6})\b/);
  if (hex) return `#${hex[1]}`;
  for (const [pattern, color] of COLOR_ALIASES) {
    if (pattern.test(message)) return color;
  }
  return null;
}

function resolveSection(message: string, selected: string) {
  const lower = message.toLowerCase();
  const hits: Array<[RegExp, string]> = [
    [/\b(hero|banner|headline|heading|title|शीर्षक)\b/i, "hero"],
    [/\b(intro|welcome|about story)\b/i, "intro"],
    [/\b(service|menu|catalog|treatment)\b/i, "services"],
    [/\b(featured|highlight|popular)\b/i, "featured"],
    [/\b(about|story|hamare)\b/i, "about"],
    [/\b(offer|promo|discount)\b/i, "offers"],
    [/\b(gallery|photo|pics)\b/i, "gallery"],
    [/\b(video)\b/i, "video"],
    [/\b(testimonial|review quote)\b/i, "testimonials"],
    [/\b(faq|question)\b/i, "faq"],
    [/\b(contact|phone|email)\b/i, "contact"],
    [/\b(map|location|address)\b/i, "map"],
    [/\b(cta|book now)\b/i, "cta"],
    [/\b(footer)\b/i, "footer"],
  ];
  for (const [pattern, id] of hits) {
    if (pattern.test(lower) && SECTION_IDS.has(id)) return id;
  }
  return SECTION_IDS.has(selected) ? selected : "hero";
}

function premiumCopy(name: string, category: string | null, hindi: boolean) {
  const kind = String(category || "").toLowerCase();
  if (hindi) {
    if (kind.includes("salon") || kind.includes("beauty")) {
      return {
        heroHeading: `${name}`,
        heroDescription: "Sahi cut, colour, aur care — appointment pe, bina wait ke.",
        heroButtonLabel: "Appointment book karein",
        secondaryCta: "Services dekhein",
        ctaHeading: "Aaj hi time lock karein",
        ctaBody: "Jo look chahiye, uske liye slot abhi save karein.",
      };
    }
    return {
      heroHeading: name,
      heroDescription: "Clear offer, easy booking, aur aapke business jaisa look.",
      heroButtonLabel: "Shuru karein",
      secondaryCta: "Aur dekhein",
      ctaHeading: "Next step simple rakhein",
      ctaBody: "Call, WhatsApp, ya online book — jo aapke customer ko easy lage.",
    };
  }
  if (kind.includes("gym")) {
    return {
      heroHeading: `Train at ${name}`,
      heroDescription: "Programs that fit real schedules. Start with a session, not a speech.",
      heroButtonLabel: "Join now",
      secondaryCta: "See programs",
      ctaHeading: "Start this week",
      ctaBody: "Pick a time, walk in, and get a plan that actually sticks.",
    };
  }
  if (kind.includes("cafe") || kind.includes("restaurant")) {
    return {
      heroHeading: name,
      heroDescription: "A table that feels looked after — menu, mood, and a booking that just works.",
      heroButtonLabel: "Reserve a table",
      secondaryCta: "View the menu",
      ctaHeading: "Come in tonight",
      ctaBody: "Reserve your table or walk in when the room is open.",
    };
  }
  if (kind.includes("salon") || kind.includes("spa") || kind.includes("beauty")) {
    return {
      heroHeading: name,
      heroDescription: "Quiet rooms, precise work, and a booking flow that respects your time.",
      heroButtonLabel: "Book appointment",
      secondaryCta: "View services",
      ctaHeading: "Save your next visit",
      ctaBody: "Choose the service, pick a time, and we will have the chair ready.",
    };
  }
  return {
    heroHeading: name,
    heroDescription: "What you offer, why it is trusted, and the next step — all on one calm page.",
    heroButtonLabel: "Get started",
    secondaryCta: "Explore",
    ctaHeading: "Ready when you are",
    ctaBody: "Book, call, or message. The page should make the next step obvious.",
  };
}

export function clientPageSnapshot(config: Record<string, unknown>, selectedSection?: string) {
  const sections = Array.isArray(config.sections)
    ? (config.sections as Array<Record<string, unknown>>).slice(0, 30).map((item) => ({
        id: item.id,
        hidden: Boolean(item.hidden),
        enabled: item.enabled !== false,
        title: clip(item.title, 80),
      }))
    : [];
  const sectionUi = config.sectionUi && typeof config.sectionUi === "object" && !Array.isArray(config.sectionUi)
    ? config.sectionUi
    : {};
  return {
    selectedSection: selectedSection || "hero",
    sections,
    sectionUi,
    heroHeading: config.heroHeading ?? null,
    heroDescription: config.heroDescription ?? null,
    heroBadge: config.heroBadge ?? null,
    heroButtonLabel: config.heroButtonLabel ?? null,
    bookingButtonLabel: config.bookingButtonLabel ?? null,
    featuredTitle: config.featuredTitle ?? null,
    introHeading: config.introHeading ?? null,
    introBody: config.introBody ?? null,
    ctaHeading: config.ctaHeading ?? null,
    ctaBody: config.ctaBody ?? null,
    offerTitle: config.offerTitle ?? null,
    offerBody: config.offerBody ?? null,
    offerCta: config.offerCta ?? null,
    secondaryCta: config.secondaryCta ?? null,
    marqueeText: config.marqueeText ?? null,
    videoUrl: config.videoUrl ?? null,
    heroVideoSrc: config.heroVideoSrc ?? null,
    businessType: config.businessType ?? "custom",
    heroMode: config.heroMode ?? "image",
    heroAlign: config.heroAlign ?? "left",
    heroHeight: config.heroHeight ?? "default",
    navStyle: config.navStyle ?? "blur",
    heroOverlay: config.heroOverlay ?? 46,
    showSearch: Boolean(config.showSearch),
    pinChrome: config.pinChrome !== false,
    marqueeEnabled: Boolean(config.marqueeEnabled),
    animations: config.animations !== false,
    hoverEffects: config.hoverEffects !== false,
    autoSlide: config.autoSlide !== false,
    serviceColumns: config.serviceColumns ?? 3,
    faqs: Array.isArray(config.faqs) ? config.faqs.slice(0, 12) : [],
    testimonials: Array.isArray(config.testimonials) ? config.testimonials.slice(0, 8) : [],
    galleryUrls: Array.isArray(config.galleryUrls) ? config.galleryUrls.slice(0, 12) : [],
  };
}

export function clientPageDesignerSystemPrompt() {
  return `You are a senior web developer and conversion-focused website designer editing a live Client Page.

Understand the user in ANY language (Hindi, Hinglish, English, or mixed). Infer intent. Do not ask them to rephrase unless the request is truly impossible.

Act like a real developer: apply the change on the page now. Vague requests such as "make it premium", "better banao", or "thoda classy" mean improve hero copy, hierarchy, CTA labels, alignment, overlay, and brand color together — not a chatbot reply.

Return JSON only, no markdown:
{"reply":"short confirmation in the user's language","configPatch":{},"brandPatch":{},"selectSection":"hero"}

configPatch keys: heroHeading, heroDescription, heroBadge, heroButtonLabel, bookingButtonLabel, featuredTitle, introHeading, introBody, ctaHeading, ctaBody, offerTitle, offerBody, offerCta, secondaryCta, marqueeText, videoUrl, heroVideoSrc, businessType, heroMode, heroAlign, heroHeight, navStyle, heroOverlay, showSearch, pinChrome, marqueeEnabled, animations, hoverEffects, autoSlide, slideMs, serviceColumns, faqs, testimonials, galleryUrls, sectionUi, sections.
sections items: {"id":"hero","enabled":true,"hidden":false,"title":"Hero"}.
sectionUi is keyed by section id with overlayText, eyebrow, body, cta, layout, columns, showPrice, showCta, etc.
brandPatch keys: brandColor, secondaryColor, backgroundColor, textColor, tagline, description, brandName. Colors must be #RRGGBB.

Rules:
- If they asked to change the website, configPatch or brandPatch MUST be non-empty.
- Edit the selected section unless they named another.
- Never invent phone numbers, URLs, prices, or services.
- Never return knowledgeWall.
- Keep copy short, specific, and on-brand.`;
}

export function patchesAreEmpty(configPatch: Record<string, unknown>, brandPatch: Record<string, unknown>) {
  return Object.keys(configPatch).length === 0 && Object.keys(brandPatch).length === 0;
}

export function designClientPageLocally(input: {
  message: string;
  selectedSection?: string;
  business: { name?: string; category?: string | null; tagline?: string | null };
  snapshot: ReturnType<typeof clientPageSnapshot>;
}): ClientPageAiResult {
  const message = input.message.trim();
  const hindi = isHindi(message);
  const name = input.business.name || "Your business";
  const selected = resolveSection(message, input.selectedSection || "hero");
  const configPatch: Record<string, unknown> = {};
  const brandPatch: Record<string, unknown> = {};
  const quoted = quotedText(message);

  if (looksLikeQuestion(message)) {
    return {
      reply: hindi
        ? "Haan — jo section select hai usi ko edit karunga. Likho kya change chahiye: heading, color, hide, ya premium look."
        : "I can edit this page directly. Tell me what to change: headline, color, hide a section, or make it more premium.",
      configPatch,
      brandPatch,
      selectSection: selected,
    };
  }

  const color = pickColor(message);
  if (color) brandPatch.brandColor = color;

  const hide = /\b(hide|hidden|remove section|hatao|chhupa|chupa|band)\b/i.test(message);
  const show = /\b(show|unhide|visible|dikhao|dikha)\b/i.test(message);
  if (hide && selected !== "hero") {
    configPatch.sections = [{ id: selected, enabled: true, hidden: true }];
  } else if (show) {
    configPatch.sections = [{ id: selected, enabled: true, hidden: false }];
  }

  if (/\b(center|centre|beech|middle)\b/i.test(message)) configPatch.heroAlign = "center";
  if (/\b(left|baayen)\b/i.test(message)) configPatch.heroAlign = "left";
  if (/\b(tall|fullscreen|full\s*screen|bada hero)\b/i.test(message)) configPatch.heroHeight = "tall";
  if (/\b(compact|chhota|short hero)\b/i.test(message)) configPatch.heroHeight = "compact";
  if (/\b(glass|blur)\b/i.test(message)) configPatch.navStyle = "blur";
  if (/\b(solid nav|solid navbar)\b/i.test(message)) configPatch.navStyle = "solid";

  const wantsPremium = /\b(premium|luxury|classy|elegant|modern|better|pro|professional|thoda acha|achha|sundar|clean)\b/i.test(message)
    || /प्रीमियम|बेहतर|सुंदर|क्लासी/.test(message);
  if (wantsPremium) {
    Object.assign(configPatch, premiumCopy(name, input.business.category ?? null, hindi), {
      heroAlign: "left",
      heroHeight: "tall",
      heroOverlay: 52,
      navStyle: "blur",
      pinChrome: true,
      animations: true,
    });
    if (!brandPatch.brandColor) {
      brandPatch.brandColor = /gym/i.test(String(input.business.category)) ? "#111827" : "#0F172A";
      brandPatch.secondaryColor = "#64748B";
    }
  }

  const wantsHeadline = /\b(headline|heading|title|hero text|naam|heading badlo)\b/i.test(message) || /शीर्षक/.test(message);
  const wantsSub = /\b(subheading|subhead|description|tagline|para|copy)\b/i.test(message);
  const wantsButton = /\b(button|cta|book button)\b/i.test(message);

  if (quoted && wantsButton) configPatch.heroButtonLabel = quoted;
  else if (quoted && wantsSub) configPatch.heroDescription = quoted;
  else if (quoted && (wantsHeadline || selected === "hero")) configPatch.heroHeading = quoted;

  if (selected === "intro" && quoted) configPatch.introBody = quoted;
  if (selected === "cta" && quoted) configPatch.ctaHeading = quoted;
  if (selected === "offers" && quoted) configPatch.offerTitle = quoted;
  if (selected === "featured" && quoted) configPatch.featuredTitle = quoted;

  if (patchesAreEmpty(configPatch, brandPatch)) {
    if (selected === "hero" || wantsHeadline || wantsSub || wantsButton) {
      Object.assign(configPatch, premiumCopy(name, input.business.category ?? null, hindi));
    } else {
      configPatch.sectionUi = {
        [selected]: {
          eyebrow: hindi ? "Updated" : "Updated",
          body: hindi
            ? `${name} ke is section ko clear aur customer-friendly bana diya.`
            : `Tightened this section so visitors immediately understand ${name}.`,
        },
      };
      if (selected === "cta") {
        configPatch.ctaHeading = hindi ? "Aaj hi book karein" : "Book the next visit";
        configPatch.ctaBody = hindi
          ? "Ek clear next step — bina extra clicks ke."
          : "One clear next step, without extra clicks.";
      }
    }
  }

  const reply = hindi
    ? `Samajh gaya. ${selected} section update kar diya — preview mein dekh lo, aur agar aur tweak chahiye to likh do.`
    : `Done. I updated the ${selected} section like a developer would. Check the preview and tell me the next tweak.`;

  return { reply, configPatch, brandPatch, selectSection: selected };
}

export function parseLooseJsonObject(text: string): Record<string, unknown> {
  const cleaned = String(text || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let raw = (fenced ? fenced[1] : cleaned).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no-json");
  raw = raw.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(raw);
}
