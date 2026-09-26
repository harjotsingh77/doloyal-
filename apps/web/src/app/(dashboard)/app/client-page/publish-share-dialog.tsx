"use client";

import * as React from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, ExternalLink, Share2 } from "lucide-react";
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from "@doloyal/ui";
import { toast } from "sonner";

/** Public client/website page (not the booking wizard). */
export function customerPageUrl(slug: string) {
  if (typeof window === "undefined") return `/book/${slug}?view=site`;
  return `${window.location.origin}/book/${slug}?view=site`;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function fileStem(name: string, slug: string) {
  return (slug || name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "client-page";
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 1500);
}

async function renderShareCard(opts: {
  name: string;
  logoUrl?: string | null;
  qrSrc: string;
  pageUrl: string;
}) {
  const width = 1080;
  const height = 1480;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not draw the QR image.");

  ctx.fillStyle = "#f3eee6";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#1c1410";
  ctx.fillRect(0, 0, width, 430);

  ctx.fillStyle = "#e2c49a";
  ctx.font = "600 22px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("LIVE FOR GUESTS", 88, 92);

  const markX = 88;
  const markY = 140;
  const mark = 108;
  ctx.save();
  ctx.beginPath();
  ctx.arc(markX + mark / 2, markY + mark / 2, mark / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  const logo = opts.logoUrl ? await loadImage(opts.logoUrl) : null;
  if (logo) {
    ctx.drawImage(logo, markX, markY, mark, mark);
  } else {
    ctx.fillStyle = "#f6efe4";
    ctx.fillRect(markX, markY, mark, mark);
    ctx.fillStyle = "#1c1410";
    ctx.font = "700 36px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials(opts.name), markX + mark / 2, markY + mark / 2 + 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();

  ctx.fillStyle = "#f6efe4";
  ctx.font = "600 56px Georgia, Times New Roman, serif";
  const nameLines = wrapText(ctx, opts.name, width - markX - mark - 80);
  nameLines.forEach((line, index) => {
    ctx.fillText(line, markX + mark + 28, 188 + index * 64);
  });

  ctx.fillStyle = "rgba(246,239,228,.58)";
  ctx.font = "400 26px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Scan to visit · sign in if you’re new", 88, 372);

  const plate = 720;
  const plateX = (width - plate) / 2;
  const plateY = 500;
  ctx.fillStyle = "#f6efe4";
  roundRect(ctx, plateX, plateY, plate, plate, 48);
  ctx.fill();
  ctx.strokeStyle = "rgba(226,196,154,.7)";
  ctx.lineWidth = 3;
  ctx.stroke();

  const qr = await loadImage(opts.qrSrc);
  if (!qr) throw new Error("Could not draw the QR image.");
  const qrSize = 620;
  const qrX = (width - qrSize) / 2;
  const qrY = plateY + (plate - qrSize) / 2;
  ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = "rgba(28,20,16,.42)";
  ctx.font = "400 24px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  const url = opts.pageUrl.replace(/^https?:\/\//, "");
  ctx.fillText(url, width / 2, 1308);
  ctx.fillStyle = "rgba(28,20,16,.28)";
  ctx.font = "500 20px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Share this image · guests scan to open your page", width / 2, 1360);
  ctx.textAlign = "left";

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not create the QR image.");
  return blob;
}

export function PublishShareDialog({
  open,
  onOpenChange,
  businessName,
  logoUrl,
  slug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessName: string;
  logoUrl?: string | null;
  slug: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const [qrSrc, setQrSrc] = React.useState("");
  const [busy, setBusy] = React.useState<"share" | "save" | null>(null);
  const cardRef = React.useRef<Blob | null>(null);
  const pageUrl = slug ? customerPageUrl(slug) : "";
  const name = businessName.trim() || "Your business";
  const filename = `${fileStem(name, slug)}-qr.png`;

  React.useEffect(() => {
    if (!open || !pageUrl) {
      setQrSrc("");
      cardRef.current = null;
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(pageUrl, {
      width: 720,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#1c1410", light: "#f6efe4" },
    })
      .then((url) => {
        if (!cancelled) setQrSrc(url);
      })
      .catch(() => {
        if (!cancelled) setQrSrc("");
      });
    return () => {
      cancelled = true;
    };
  }, [open, pageUrl]);

  const cardBlob = React.useCallback(async () => {
    if (cardRef.current) return cardRef.current;
    if (!qrSrc || !pageUrl) throw new Error("QR isn’t ready yet.");
    const blob = await renderShareCard({ name, logoUrl, qrSrc, pageUrl });
    cardRef.current = blob;
    return blob;
  }, [logoUrl, name, pageUrl, qrSrc]);

  React.useEffect(() => {
    cardRef.current = null;
  }, [qrSrc, name, logoUrl, pageUrl]);

  const copy = async () => {
    if (!pageUrl) return;
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      toast.success("Link copied");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn’t copy the link. Select it and copy instead.");
    }
  };

  const shareImage = async () => {
    setBusy("share");
    try {
      const blob = await cardBlob();
      const file = new File([blob], filename, { type: "image/png" });
      const payload = { files: [file], title: name, text: `Scan to visit ${name}` };
      if (typeof navigator.share === "function" && (!navigator.canShare || navigator.canShare(payload))) {
        await navigator.share(payload);
        return;
      }
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast.success("QR image copied. Paste it into WhatsApp, Instagram, or Messages.");
        return;
      }
      downloadBlob(blob, filename);
      toast.success("QR image saved. Share it from your downloads.");
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return;
      toast.error((error as Error)?.message || "Couldn’t share the QR image.");
    } finally {
      setBusy(null);
    }
  };

  const saveImage = async () => {
    setBusy("save");
    try {
      const blob = await cardBlob();
      downloadBlob(blob, filename);
      toast.success("QR image saved.");
    } catch (error) {
      toast.error((error as Error)?.message || "Couldn’t save the QR image.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className="max-w-[380px] overflow-hidden border-0 bg-transparent p-0 shadow-none"
      >
        <div className="overflow-hidden rounded-[28px] bg-[#f3eee6] shadow-[0_32px_80px_rgba(28,20,16,.28)] ring-1 ring-[rgba(28,20,16,.12)]">
          <header className="relative bg-[#1c1410] px-6 pb-7 pt-6 text-[#f6efe4]">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-[#f6efe4]/55 hover:bg-white/10 hover:text-[#f6efe4]"
              aria-label="Close"
            >
              <span className="text-lg leading-none">×</span>
            </button>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e2c49a]">Live for guests</p>
            <div className="mt-4 flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-12 w-12 rounded-full object-cover ring-1 ring-white/15" />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#f6efe4] text-sm font-semibold text-[#1c1410]">
                  {initials(name)}
                </span>
              )}
              <DialogTitle className="font-[Georgia,Times,serif] text-[1.75rem] leading-[1.15] tracking-[-0.03em] text-[#f6efe4]">
                {name}
              </DialogTitle>
            </div>
            <DialogDescription className="mt-3 text-sm leading-5 text-[#f6efe4]/58">
              Share this QR as an image. New guests sign in first — anyone already signed in goes straight in.
            </DialogDescription>
          </header>

          <div className="px-6 pb-6 pt-5">
            <div className="mx-auto w-fit rounded-[24px] bg-[#f6efe4] p-4 shadow-[inset_0_0_0_1px_rgba(226,196,154,.55)]">
              {qrSrc ? (
                <img
                  src={qrSrc}
                  alt={`QR code for ${name}`}
                  width={220}
                  height={220}
                  className="h-[220px] w-[220px] rounded-[14px]"
                />
              ) : (
                <div className="grid h-[220px] w-[220px] place-items-center text-sm text-[#1c1410]/40">Preparing QR…</div>
              )}
            </div>

            <p className="mt-4 truncate text-center text-[11px] text-[#1c1410]/40">{pageUrl}</p>

            <div className="mt-4 grid gap-2">
              <Button
                onClick={() => void shareImage()}
                loading={busy === "share"}
                disabled={!qrSrc || busy !== null}
                className="h-11 rounded-full bg-[#1c1410] text-[#f6efe4] hover:bg-[#2a201a]"
              >
                <Share2 className="h-4 w-4" />
                Share image
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => void saveImage()}
                  loading={busy === "save"}
                  disabled={!qrSrc || busy !== null}
                  className="h-11 rounded-full border-0 bg-white/80 text-[#1c1410] hover:bg-white"
                >
                  <Download className="h-4 w-4" />
                  Save image
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void copy()}
                  className="h-11 rounded-full border-0 bg-white/80 text-[#1c1410] hover:bg-white"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </div>
              <Button
                variant="secondary"
                className="h-11 rounded-full border-0 bg-white/80 text-[#1c1410] hover:bg-white"
                onClick={() => pageUrl && window.open(pageUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
                Open page
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
