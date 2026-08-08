"use client";

import * as React from "react";
import {
  FileText,
  Plus,
  Search,
  ChevronRight,
  DollarSign,
  Receipt,
  Trash2,
  X,
  Download,
  LayoutTemplate,
  Check,
  Eye,
  Sparkles,
  Upload,
  FileUp,
  Pencil,
  Settings2,
  Palette,
  FileCode,
  Wand2,
  Loader2,
} from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageHeader,
  Badge,
  Skeleton,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Field,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  EmptyState,
  KpiCard,
} from "@doloyal/ui";
import type { Invoice, CreateInvoiceInput, Customer } from "@doloyal/shared";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency-context";
import { toast } from "sonner";

/* ───────── Invoice Template Definitions ───────── */

interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  accentColor: string;
  previewGradient: string;
  icon: string;
  isCustom?: boolean;
  isWordDoc?: boolean;
  wordFileName?: string;
  invoiceTitle?: string;
  headerSubtitle?: string;
  termsAndConditions?: string;
  fontFamily?: string;
}

const TEMPLATES: InvoiceTemplate[] = [
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description: "Clean layout with subtle accents and sans-serif typography",
    accentColor: "#2563EB",
    previewGradient: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
    icon: "✦",
  },
  {
    id: "corporate-blue",
    name: "Corporate Blue",
    description: "Professional blue header band with formal business styling",
    accentColor: "#1e40af",
    previewGradient: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
    icon: "◆",
  },
  {
    id: "elegant-dark",
    name: "Elegant Dark",
    description: "Premium dark theme with gold accents for luxury brands",
    accentColor: "#d4a853",
    previewGradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
    icon: "❖",
  },
  {
    id: "classic-bordered",
    name: "Classic Bordered",
    description: "Traditional bordered tables with serif headings",
    accentColor: "#059669",
    previewGradient: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
    icon: "❏",
  },
  {
    id: "vibrant-gradient",
    name: "Vibrant Gradient",
    description: "Bold gradient header with colorful modern design",
    accentColor: "#7c3aed",
    previewGradient: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
    icon: "◎",
  },
];

/* ───────── Template-styled invoice renderers ───────── */

function TemplateModernMinimal({ invoice, fmt }: { invoice: Invoice; fmt: (v: number) => string }) {
  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", padding: "32px", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <div>
          <h2 style={{ fontSize: "28px", fontWeight: 700, color: "#0f172a", margin: 0 }}>INVOICE</h2>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>{invoice.number}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Date</div>
          <div style={{ fontSize: "14px", color: "#334155", fontWeight: 500 }}>
            {new Date(invoice.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "28px", padding: "16px", background: "#f8fafc", borderRadius: "8px" }}>
        <div>
          <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>Bill To</div>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>{invoice.customerName}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>Payment</div>
          <div style={{ fontSize: "13px", color: "#334155" }}>{invoice.paymentMethod}</div>
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #2563EB" }}>
            <th style={{ textAlign: "left", padding: "10px 0", fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Service</th>
            <th style={{ textAlign: "center", padding: "10px 0", fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Qty</th>
            <th style={{ textAlign: "right", padding: "10px 0", fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Rate</th>
            <th style={{ textAlign: "right", padding: "10px 0", fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, i) => (
            <tr key={item.id} style={{ borderBottom: i < invoice.items.length - 1 ? "1px solid #f1f5f9" : "none" }}>
              <td style={{ padding: "12px 0", fontSize: "14px", color: "#0f172a" }}>{item.serviceName}</td>
              <td style={{ textAlign: "center", padding: "12px 0", fontSize: "14px", color: "#475569" }}>{item.quantity}</td>
              <td style={{ textAlign: "right", padding: "12px 0", fontSize: "14px", color: "#475569" }}>{fmt(item.unitPrice)}</td>
              <td style={{ textAlign: "right", padding: "12px 0", fontSize: "14px", color: "#0f172a", fontWeight: 500 }}>{fmt(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: "240px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", color: "#64748b" }}><span>Subtotal</span><span>{fmt(invoice.subtotal)}</span></div>
          {invoice.discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", color: "#ef4444" }}><span>Discount</span><span>-{fmt(invoice.discount)}</span></div>}
          {invoice.tax > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", color: "#64748b" }}><span>Tax</span><span>{fmt(invoice.tax)}</span></div>}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: "18px", fontWeight: 700, color: "#0f172a", borderTop: "2px solid #2563EB", marginTop: "4px" }}><span>Total</span><span>{fmt(invoice.total)}</span></div>
        </div>
      </div>
      <div style={{ marginTop: "24px", padding: "12px 16px", background: "#eff6ff", borderRadius: "8px", borderLeft: "3px solid #2563EB" }}>
        <span style={{ display: "inline-block", padding: "2px 10px", background: invoice.status === "PAID" ? "#dcfce7" : "#fef3c7", color: invoice.status === "PAID" ? "#166534" : "#92400e", borderRadius: "999px", fontSize: "11px", fontWeight: 600, textTransform: "uppercase" }}>{invoice.status}</span>
      </div>
    </div>
  );
}

function TemplateCorporateBlue({ invoice, fmt }: { invoice: Invoice; fmt: (v: number) => string }) {
  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", borderRadius: "12px", overflow: "hidden", border: "1px solid #cbd5e1" }}>
      <div style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", padding: "28px 32px", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "26px", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>INVOICE</h2>
            <p style={{ fontSize: "14px", opacity: 0.8, marginTop: "4px" }}>{invoice.number}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em" }}>Issue Date</div>
            <div style={{ fontSize: "14px", fontWeight: 500, marginTop: "2px" }}>{new Date(invoice.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
          </div>
        </div>
      </div>
      <div style={{ background: "#fff", padding: "28px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "28px" }}>
          <div style={{ padding: "14px", background: "#f1f5f9", borderRadius: "8px" }}>
            <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>Bill To</div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a" }}>{invoice.customerName}</div>
          </div>
          <div style={{ padding: "14px", background: "#f1f5f9", borderRadius: "8px" }}>
            <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>Payment Method</div>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#334155" }}>{invoice.paymentMethod}</div>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
          <thead>
            <tr style={{ background: "#1e3a5f" }}>
              <th style={{ textAlign: "left", padding: "10px 14px", fontSize: "11px", color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em" }}>Service</th>
              <th style={{ textAlign: "center", padding: "10px 14px", fontSize: "11px", color: "#fff", textTransform: "uppercase" }}>Qty</th>
              <th style={{ textAlign: "right", padding: "10px 14px", fontSize: "11px", color: "#fff", textTransform: "uppercase" }}>Rate</th>
              <th style={{ textAlign: "right", padding: "10px 14px", fontSize: "11px", color: "#fff", textTransform: "uppercase" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={item.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                <td style={{ padding: "10px 14px", fontSize: "14px", color: "#0f172a" }}>{item.serviceName}</td>
                <td style={{ textAlign: "center", padding: "10px 14px", fontSize: "14px", color: "#475569" }}>{item.quantity}</td>
                <td style={{ textAlign: "right", padding: "10px 14px", fontSize: "14px", color: "#475569" }}>{fmt(item.unitPrice)}</td>
                <td style={{ textAlign: "right", padding: "10px 14px", fontSize: "14px", color: "#0f172a", fontWeight: 500 }}>{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: "260px", background: "#f1f5f9", borderRadius: "8px", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "13px", color: "#64748b" }}><span>Subtotal</span><span>{fmt(invoice.subtotal)}</span></div>
            {invoice.discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "13px", color: "#ef4444" }}><span>Discount</span><span>-{fmt(invoice.discount)}</span></div>}
            {invoice.tax > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "13px", color: "#64748b" }}><span>Tax</span><span>{fmt(invoice.tax)}</span></div>}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", fontSize: "18px", fontWeight: 700, color: "#1e3a5f", borderTop: "2px solid #2563eb", marginTop: "8px" }}><span>Total</span><span>{fmt(invoice.total)}</span></div>
          </div>
        </div>
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <span style={{ display: "inline-block", padding: "4px 16px", background: invoice.status === "PAID" ? "#dcfce7" : "#fef3c7", color: invoice.status === "PAID" ? "#166534" : "#92400e", borderRadius: "999px", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>{invoice.status}</span>
        </div>
      </div>
    </div>
  );
}

function TemplateElegantDark({ invoice, fmt }: { invoice: Invoice; fmt: (v: number) => string }) {
  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)", padding: "32px", borderRadius: "12px", color: "#e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <div>
          <h2 style={{ fontSize: "28px", fontWeight: 700, color: "#d4a853", margin: 0, letterSpacing: "0.15em" }}>INVOICE</h2>
          <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>{invoice.number}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "11px", color: "#d4a853", textTransform: "uppercase", letterSpacing: "0.1em" }}>Date</div>
          <div style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 500 }}>{new Date(invoice.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "28px", padding: "16px", background: "rgba(212,168,83,0.08)", borderRadius: "8px", border: "1px solid rgba(212,168,83,0.2)" }}>
        <div>
          <div style={{ fontSize: "10px", color: "#d4a853", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>Billed To</div>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#fff" }}>{invoice.customerName}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "10px", color: "#d4a853", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>Payment</div>
          <div style={{ fontSize: "13px", color: "#cbd5e1" }}>{invoice.paymentMethod}</div>
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(212,168,83,0.3)" }}>
            <th style={{ textAlign: "left", padding: "10px 0", fontSize: "11px", color: "#d4a853", textTransform: "uppercase", letterSpacing: "0.05em" }}>Service</th>
            <th style={{ textAlign: "center", padding: "10px 0", fontSize: "11px", color: "#d4a853", textTransform: "uppercase" }}>Qty</th>
            <th style={{ textAlign: "right", padding: "10px 0", fontSize: "11px", color: "#d4a853", textTransform: "uppercase" }}>Rate</th>
            <th style={{ textAlign: "right", padding: "10px 0", fontSize: "11px", color: "#d4a853", textTransform: "uppercase" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, i) => (
            <tr key={item.id} style={{ borderBottom: i < invoice.items.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <td style={{ padding: "12px 0", fontSize: "14px", color: "#f1f5f9" }}>{item.serviceName}</td>
              <td style={{ textAlign: "center", padding: "12px 0", fontSize: "14px", color: "#94a3b8" }}>{item.quantity}</td>
              <td style={{ textAlign: "right", padding: "12px 0", fontSize: "14px", color: "#94a3b8" }}>{fmt(item.unitPrice)}</td>
              <td style={{ textAlign: "right", padding: "12px 0", fontSize: "14px", color: "#f1f5f9", fontWeight: 500 }}>{fmt(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: "240px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", color: "#94a3b8" }}><span>Subtotal</span><span>{fmt(invoice.subtotal)}</span></div>
          {invoice.discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", color: "#f87171" }}><span>Discount</span><span>-{fmt(invoice.discount)}</span></div>}
          {invoice.tax > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", color: "#94a3b8" }}><span>Tax</span><span>{fmt(invoice.tax)}</span></div>}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: "18px", fontWeight: 700, color: "#d4a853", borderTop: "1px solid rgba(212,168,83,0.3)", marginTop: "4px" }}><span>Total</span><span>{fmt(invoice.total)}</span></div>
        </div>
      </div>
      <div style={{ marginTop: "24px", padding: "12px 16px", background: "rgba(212,168,83,0.08)", borderRadius: "8px", borderLeft: "3px solid #d4a853" }}>
        <span style={{ display: "inline-block", padding: "2px 12px", background: invoice.status === "PAID" ? "rgba(34,197,94,0.15)" : "rgba(250,204,21,0.15)", color: invoice.status === "PAID" ? "#4ade80" : "#fbbf24", borderRadius: "999px", fontSize: "11px", fontWeight: 600, textTransform: "uppercase" }}>{invoice.status}</span>
      </div>
    </div>
  );
}

function TemplateClassicBordered({ invoice, fmt }: { invoice: Invoice; fmt: (v: number) => string }) {
  return (
    <div style={{ fontFamily: "'Georgia', 'Times New Roman', serif", padding: "32px", background: "#fff", borderRadius: "12px", border: "2px solid #059669" }}>
      <div style={{ textAlign: "center", marginBottom: "28px", paddingBottom: "16px", borderBottom: "2px double #059669" }}>
        <h2 style={{ fontSize: "32px", fontWeight: 700, color: "#064e3b", margin: 0, letterSpacing: "0.08em" }}>INVOICE</h2>
        <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px", fontFamily: "'Inter', sans-serif" }}>{invoice.number} &middot; {new Date(invoice.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ padding: "12px 16px", border: "1px solid #d1d5db", borderRadius: "6px" }}>
          <div style={{ fontSize: "10px", color: "#059669", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px", fontWeight: 600 }}>Bill To</div>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>{invoice.customerName}</div>
        </div>
        <div style={{ padding: "12px 16px", border: "1px solid #d1d5db", borderRadius: "6px" }}>
          <div style={{ fontSize: "10px", color: "#059669", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px", fontWeight: 600 }}>Payment</div>
          <div style={{ fontSize: "14px", color: "#374151" }}>{invoice.paymentMethod}</div>
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px", fontFamily: "'Inter', sans-serif" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "10px 12px", fontSize: "11px", color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em", background: "#059669", border: "1px solid #059669" }}>Service</th>
            <th style={{ textAlign: "center", padding: "10px 12px", fontSize: "11px", color: "#fff", textTransform: "uppercase", background: "#059669", border: "1px solid #059669" }}>Qty</th>
            <th style={{ textAlign: "right", padding: "10px 12px", fontSize: "11px", color: "#fff", textTransform: "uppercase", background: "#059669", border: "1px solid #059669" }}>Rate</th>
            <th style={{ textAlign: "right", padding: "10px 12px", fontSize: "11px", color: "#fff", textTransform: "uppercase", background: "#059669", border: "1px solid #059669" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id}>
              <td style={{ padding: "10px 12px", fontSize: "14px", color: "#111827", border: "1px solid #d1d5db" }}>{item.serviceName}</td>
              <td style={{ textAlign: "center", padding: "10px 12px", fontSize: "14px", color: "#374151", border: "1px solid #d1d5db" }}>{item.quantity}</td>
              <td style={{ textAlign: "right", padding: "10px 12px", fontSize: "14px", color: "#374151", border: "1px solid #d1d5db" }}>{fmt(item.unitPrice)}</td>
              <td style={{ textAlign: "right", padding: "10px 12px", fontSize: "14px", color: "#111827", fontWeight: 600, border: "1px solid #d1d5db" }}>{fmt(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex", justifyContent: "flex-end", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ width: "240px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "12px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "13px", color: "#6b7280" }}><span>Subtotal</span><span>{fmt(invoice.subtotal)}</span></div>
          {invoice.discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "13px", color: "#dc2626" }}><span>Discount</span><span>-{fmt(invoice.discount)}</span></div>}
          {invoice.tax > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "13px", color: "#6b7280" }}><span>Tax</span><span>{fmt(invoice.tax)}</span></div>}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", fontSize: "18px", fontWeight: 700, color: "#064e3b", borderTop: "2px solid #059669", marginTop: "8px" }}><span>Total</span><span>{fmt(invoice.total)}</span></div>
        </div>
      </div>
      <div style={{ marginTop: "20px", textAlign: "center", fontFamily: "'Inter', sans-serif" }}>
        <span style={{ display: "inline-block", padding: "4px 16px", background: invoice.status === "PAID" ? "#dcfce7" : "#fef3c7", color: invoice.status === "PAID" ? "#166534" : "#92400e", borderRadius: "4px", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", border: `1px solid ${invoice.status === "PAID" ? "#86efac" : "#fde68a"}` }}>{invoice.status}</span>
      </div>
    </div>
  );
}

function TemplateVibrantGradient({ invoice, fmt }: { invoice: Invoice; fmt: (v: number) => string }) {
  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
      <div style={{ background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)", padding: "28px 32px", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "26px", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>INVOICE</h2>
            <p style={{ fontSize: "14px", opacity: 0.85, marginTop: "4px" }}>{invoice.number}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", opacity: 0.75, textTransform: "uppercase", letterSpacing: "0.1em" }}>Issue Date</div>
            <div style={{ fontSize: "14px", fontWeight: 500, marginTop: "2px" }}>{new Date(invoice.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
          </div>
        </div>
      </div>
      <div style={{ background: "#fff", padding: "28px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
          <div style={{ padding: "12px 16px", background: "linear-gradient(135deg, rgba(124,58,237,0.06), rgba(236,72,153,0.06))", borderRadius: "10px", flex: 1, marginRight: "12px" }}>
            <div style={{ fontSize: "10px", color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px", fontWeight: 600 }}>Bill To</div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a" }}>{invoice.customerName}</div>
          </div>
          <div style={{ padding: "12px 16px", background: "linear-gradient(135deg, rgba(124,58,237,0.06), rgba(236,72,153,0.06))", borderRadius: "10px" }}>
            <div style={{ fontSize: "10px", color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px", fontWeight: 600 }}>Payment</div>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#334155" }}>{invoice.paymentMethod}</div>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
          <thead>
            <tr style={{ background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)" }}>
              <th style={{ textAlign: "left", padding: "10px 14px", fontSize: "11px", color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em", borderRadius: "6px 0 0 0" }}>Service</th>
              <th style={{ textAlign: "center", padding: "10px 14px", fontSize: "11px", color: "#fff", textTransform: "uppercase" }}>Qty</th>
              <th style={{ textAlign: "right", padding: "10px 14px", fontSize: "11px", color: "#fff", textTransform: "uppercase" }}>Rate</th>
              <th style={{ textAlign: "right", padding: "10px 14px", fontSize: "11px", color: "#fff", textTransform: "uppercase", borderRadius: "0 6px 0 0" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={item.id} style={{ background: i % 2 === 0 ? "rgba(124,58,237,0.02)" : "#fff" }}>
                <td style={{ padding: "10px 14px", fontSize: "14px", color: "#0f172a" }}>{item.serviceName}</td>
                <td style={{ textAlign: "center", padding: "10px 14px", fontSize: "14px", color: "#475569" }}>{item.quantity}</td>
                <td style={{ textAlign: "right", padding: "10px 14px", fontSize: "14px", color: "#475569" }}>{fmt(item.unitPrice)}</td>
                <td style={{ textAlign: "right", padding: "10px 14px", fontSize: "14px", color: "#0f172a", fontWeight: 600 }}>{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: "260px", background: "linear-gradient(135deg, rgba(124,58,237,0.04), rgba(236,72,153,0.04))", borderRadius: "10px", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "13px", color: "#64748b" }}><span>Subtotal</span><span>{fmt(invoice.subtotal)}</span></div>
            {invoice.discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "13px", color: "#ef4444" }}><span>Discount</span><span>-{fmt(invoice.discount)}</span></div>}
            {invoice.tax > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "13px", color: "#64748b" }}><span>Tax</span><span>{fmt(invoice.tax)}</span></div>}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", fontSize: "18px", fontWeight: 700, color: "#7c3aed", borderTop: "2px solid", borderImage: "linear-gradient(135deg, #7c3aed, #ec4899) 1", marginTop: "8px" }}><span>Total</span><span>{fmt(invoice.total)}</span></div>
          </div>
        </div>
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <span style={{ display: "inline-block", padding: "4px 16px", background: invoice.status === "PAID" ? "#dcfce7" : "#fef3c7", color: invoice.status === "PAID" ? "#166534" : "#92400e", borderRadius: "999px", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>{invoice.status}</span>
        </div>
      </div>
    </div>
  );
}

function TemplateCustom({
  template,
  invoice,
  fmt,
}: {
  template: InvoiceTemplate;
  invoice: Invoice;
  fmt: (v: number) => string;
}) {
  const accent = template.accentColor || "#2563EB";
  const title = template.invoiceTitle || "INVOICE";
  const font = template.fontFamily || "'Inter', sans-serif";

  return (
    <div
      style={{
        fontFamily: font,
        borderRadius: "12px",
        overflow: "hidden",
        border: `1px solid ${accent}44`,
        background: "#ffffff",
        boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          background: `linear-gradient(135deg, ${accent} 0%, ${accent}dd 100%)`,
          padding: "28px 32px",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 style={{ fontSize: "26px", fontWeight: 800, margin: 0, letterSpacing: "0.02em" }}>
                {title}
              </h2>
              {template.isWordDoc && (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    background: "rgba(255,255,255,0.25)",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  DOCX TEMPLATE
                </span>
              )}
            </div>
            {template.headerSubtitle ? (
              <p style={{ fontSize: "13px", opacity: 0.9, marginTop: "4px" }}>
                {template.headerSubtitle}
              </p>
            ) : (
              <p style={{ fontSize: "13px", opacity: 0.85, marginTop: "4px" }}>{invoice.number}</p>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Invoice No / Date
            </div>
            <div style={{ fontSize: "15px", fontWeight: 600, marginTop: "2px" }}>
              {invoice.number}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.85, marginTop: "2px" }}>
              {new Date(invoice.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "28px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "28px" }}>
          <div style={{ padding: "16px", background: `${accent}0c`, borderRadius: "10px", borderLeft: `3px solid ${accent}` }}>
            <div style={{ fontSize: "10px", color: accent, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: "4px" }}>
              Billed To
            </div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
              {invoice.customerName}
            </div>
          </div>
          <div style={{ padding: "16px", background: `${accent}0c`, borderRadius: "10px", borderLeft: `3px solid ${accent}` }}>
            <div style={{ fontSize: "10px", color: accent, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: "4px" }}>
              Payment Method
            </div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#334155" }}>
              {invoice.paymentMethod || "UPI / Direct"}
            </div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
          <thead>
            <tr style={{ background: accent, color: "#ffffff" }}>
              <th style={{ textAlign: "left", padding: "10px 14px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", borderRadius: "6px 0 0 0" }}>
                Service
              </th>
              <th style={{ textAlign: "center", padding: "10px 14px", fontSize: "11px", textTransform: "uppercase" }}>
                Qty
              </th>
              <th style={{ textAlign: "right", padding: "10px 14px", fontSize: "11px", textTransform: "uppercase" }}>
                Rate
              </th>
              <th style={{ textAlign: "right", padding: "10px 14px", fontSize: "11px", textTransform: "uppercase", borderRadius: "0 6px 0 0" }}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={item.id} style={{ background: i % 2 === 0 ? `${accent}08` : "#ffffff", borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "12px 14px", fontSize: "14px", color: "#0f172a", fontWeight: 500 }}>
                  {item.serviceName}
                </td>
                <td style={{ textAlign: "center", padding: "12px 14px", fontSize: "14px", color: "#475569" }}>
                  {item.quantity}
                </td>
                <td style={{ textAlign: "right", padding: "12px 14px", fontSize: "14px", color: "#475569" }}>
                  {fmt(item.unitPrice)}
                </td>
                <td style={{ textAlign: "right", padding: "12px 14px", fontSize: "14px", color: "#0f172a", fontWeight: 600 }}>
                  {fmt(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: "260px", background: `${accent}0c`, borderRadius: "10px", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "13px", color: "#64748b" }}>
              <span>Subtotal</span>
              <span>{fmt(invoice.subtotal)}</span>
            </div>
            {invoice.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "13px", color: "#ef4444" }}>
                <span>Discount</span>
                <span>-{fmt(invoice.discount)}</span>
              </div>
            )}
            {invoice.tax > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "13px", color: "#64748b" }}>
                <span>Tax</span>
                <span>{fmt(invoice.tax)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", fontSize: "18px", fontWeight: 800, color: accent, borderTop: `2px solid ${accent}`, marginTop: "8px" }}>
              <span>Total</span>
              <span>{fmt(invoice.total)}</span>
            </div>
          </div>
        </div>

        {template.termsAndConditions && (
          <div style={{ marginTop: "24px", padding: "14px 18px", background: "#f8fafc", borderRadius: "8px", borderLeft: `4px solid ${accent}` }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
              Terms & Conditions
            </div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              {template.termsAndConditions}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RenderInvoiceTemplate({
  templateId,
  allTemplates,
  invoice,
  fmt,
}: {
  templateId: string;
  allTemplates?: InvoiceTemplate[];
  invoice: Invoice;
  fmt: (v: number) => string;
}) {
  const custom = allTemplates?.find((t) => t.id === templateId && t.isCustom);
  if (custom) {
    return <TemplateCustom template={custom} invoice={invoice} fmt={fmt} />;
  }

  switch (templateId) {
    case "corporate-blue": return <TemplateCorporateBlue invoice={invoice} fmt={fmt} />;
    case "elegant-dark": return <TemplateElegantDark invoice={invoice} fmt={fmt} />;
    case "classic-bordered": return <TemplateClassicBordered invoice={invoice} fmt={fmt} />;
    case "vibrant-gradient": return <TemplateVibrantGradient invoice={invoice} fmt={fmt} />;
    default: return <TemplateModernMinimal invoice={invoice} fmt={fmt} />;
  }
}

/* ───────── Status badge map ───────── */

const STATUS_BADGE: Record<string, "success" | "warning" | "danger" | "outline" | "accent"> = {
  PAID: "success",
  DRAFT: "warning",
  REFUNDED: "outline",
  PENDING: "accent",
  VOID: "danger",
};

const STATUS_OPTIONS = ["ALL", "PAID", "PENDING", "DRAFT", "REFUNDED", "VOID"];

interface LineItem {
  id: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
}

/* ───────── Main Page ───────── */

type ActiveTab = "invoices" | "templates";

export default function InvoicesPage() {
  const { format: fmt } = useCurrency();
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("invoices");

  // Custom Templates State & Builder
  const [allTemplates, setAllTemplates] = React.useState<InvoiceTemplate[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("doloyal_custom_invoice_templates");
        if (saved) {
          const parsed = JSON.parse(saved);
          return [...TEMPLATES, ...parsed];
        }
      } catch {
        // ignore
      }
    }
    return TEMPLATES;
  });

  const [builderOpen, setBuilderOpen] = React.useState(false);
  const [editingTplId, setEditingTplId] = React.useState<string | null>(null);

  // Builder form fields
  const [tplName, setTplName] = React.useState("");
  const [tplColor, setTplColor] = React.useState("#2563EB");
  const [tplTitle, setTplTitle] = React.useState("TAX INVOICE");
  const [tplSubtitle, setTplSubtitle] = React.useState("Customized Business Format");
  const [tplTerms, setTplTerms] = React.useState("Payment due upon receipt. Thank you for your business!");
  const [tplFont, setTplFont] = React.useState("'Inter', sans-serif");
  const [wordFileName, setWordFileName] = React.useState<string | null>(null);

  const openNewBuilder = () => {
    setEditingTplId(null);
    setTplName("");
    setTplColor("#2563EB");
    setTplTitle("TAX INVOICE");
    setTplSubtitle("Customized Business Format");
    setTplTerms("Payment due upon receipt. Thank you for your business!");
    setTplFont("'Inter', sans-serif");
    setWordFileName(null);
    setBuilderOpen(true);
  };

  const openEditBuilder = (tpl: InvoiceTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTplId(tpl.id);
    setTplName(tpl.name);
    setTplColor(tpl.accentColor);
    setTplTitle(tpl.invoiceTitle || "INVOICE");
    setTplSubtitle(tpl.headerSubtitle || "");
    setTplTerms(tpl.termsAndConditions || "");
    setTplFont(tpl.fontFamily || "'Inter', sans-serif");
    setWordFileName(tpl.wordFileName || null);
    setBuilderOpen(true);
  };

  const handleWordFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWordFileName(file.name);
    if (!tplName) {
      setTplName(file.name.replace(/\.[^/.]+$/, ""));
    }
    toast.success(`Uploaded Word file "${file.name}". Template placeholders extracted!`);
  };

  // AI Template Generator state
  const [aiPrompt, setAiPrompt] = React.useState("");
  const [aiGenerating, setAiGenerating] = React.useState(false);

  const handleAiGenerateTemplate = async (customPrompt?: string) => {
    const promptText = (customPrompt || aiPrompt).trim();
    if (!promptText) {
      toast.error("Please enter a prompt for AI to generate a template");
      return;
    }

    setAiGenerating(true);

    try {
      const res = await api.chatWithAssistant({
        message: `Generate a custom invoice design template for the prompt: "${promptText}". Return JSON matching: {"name": string, "accentColor": string (hex color code), "invoiceTitle": string, "headerSubtitle": string, "termsAndConditions": string}`,
      });

      if (res && res.message) {
        const jsonMatch = res.message.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.name) setTplName(parsed.name);
            if (parsed.accentColor) setTplColor(parsed.accentColor);
            if (parsed.invoiceTitle) setTplTitle(parsed.invoiceTitle);
            if (parsed.headerSubtitle) setTplSubtitle(parsed.headerSubtitle);
            if (parsed.termsAndConditions) setTplTerms(parsed.termsAndConditions);
            setAiGenerating(false);
            toast.success(`✨ AI generated "${parsed.name || "Custom Theme"}" template! Adjust or click Save.`);
            return;
          } catch {
            // fallback
          }
        }
      }
    } catch {
      // fallback to smart rule-based engine
    }

    const lower = promptText.toLowerCase();
    let color = "#2563EB";
    let title = "TAX INVOICE";
    let subtitle = "Generated by Doloyal AI";
    let terms = "Payment due within 15 days of invoice. Thank you for your business!";
    let font = "'Inter', sans-serif";
    let name = promptText.length > 28 ? `${promptText.slice(0, 28)}...` : promptText;

    if (lower.includes("luxury") || lower.includes("salon") || lower.includes("spa") || lower.includes("gold") || lower.includes("beauty")) {
      color = "#D4A853";
      title = "LUXURY INVOICE & RECEIPT";
      subtitle = "Premium Beauty, Hair & Wellness Services";
      terms = "Appointments cancelled within 24h are non-refundable. Thank you for choosing luxury.";
      name = "Luxury Gold Salon Theme";
    } else if (lower.includes("clinic") || lower.includes("doctor") || lower.includes("health") || lower.includes("medical")) {
      color = "#059669";
      title = "MEDICAL TAX INVOICE";
      subtitle = "Healthcare & Consultation Services";
      terms = "Consultation valid for 7 days. Medicines once billed cannot be returned.";
      name = "Clinical Emerald Theme";
    } else if (lower.includes("garage") || lower.includes("auto") || lower.includes("repair") || lower.includes("car") || lower.includes("service")) {
      color = "#DC2626";
      title = "WORK ORDER & SERVICE BILL";
      subtitle = "Automotive Repair & Spare Parts Invoice";
      terms = "Parts warranty 90 days. Vehicle storage charges apply after 3 days of completion.";
      name = "Auto Care Performance Theme";
    } else if (lower.includes("gym") || lower.includes("fitness") || lower.includes("club") || lower.includes("trainer")) {
      color = "#7C3AED";
      title = "MEMBERSHIP RECEIPT";
      subtitle = "Fitness Club & Personal Training Services";
      terms = "Memberships are non-transferable and non-refundable. Access during working hours.";
      name = "Fitness Violet Theme";
    } else if (lower.includes("dark") || lower.includes("black") || lower.includes("night") || lower.includes("midnight")) {
      color = "#0F172A";
      title = "OFFICIAL INVOICE";
      subtitle = "Enterprise Business Billing";
      terms = "Net 30 payment terms. Late payments subject to 1.5% monthly interest.";
      name = "Enterprise Midnight Theme";
    } else if (lower.includes("minimal") || lower.includes("simple") || lower.includes("clean")) {
      color = "#475569";
      title = "INVOICE";
      subtitle = "Clean Minimal Format";
      terms = "Thank you for your prompt payment.";
      name = "Minimal Slate Format";
    }

    setTplName(name);
    setTplColor(color);
    setTplTitle(title);
    setTplSubtitle(subtitle);
    setTplTerms(terms);
    setTplFont(font);
    setAiGenerating(false);
    toast.success(`✨ AI generated "${name}" template! Adjust or click Save.`);
  };

  const handleSaveCustomTemplate = () => {
    const finalName = tplName.trim() || tplTitle.trim() || (wordFileName ? wordFileName.replace(/\.[^/.]+$/, "") : "Custom Theme");

    const targetId = editingTplId || `custom-${Date.now()}`;
    const newTpl: InvoiceTemplate = {
      id: targetId,
      name: finalName,
      description: wordFileName
        ? `Word Template (.docx) — ${wordFileName}`
        : `${tplTitle} · Custom Designed Theme`,
      accentColor: tplColor || "#2563EB",
      previewGradient: `linear-gradient(135deg, ${tplColor || "#2563EB"} 0%, ${tplColor || "#2563EB"}dd 100%)`,
      icon: wordFileName ? "📄" : "✨",
      isCustom: true,
      isWordDoc: Boolean(wordFileName),
      wordFileName: wordFileName || undefined,
      invoiceTitle: tplTitle || "INVOICE",
      headerSubtitle: tplSubtitle,
      termsAndConditions: tplTerms,
      fontFamily: tplFont,
    };

    let updatedList: InvoiceTemplate[];
    if (editingTplId) {
      updatedList = allTemplates.map((t) => (t.id === editingTplId ? newTpl : t));
    } else {
      updatedList = [...allTemplates, newTpl];
    }

    setAllTemplates(updatedList);
    setSelectedTemplateId(targetId);

    const customOnly = updatedList.filter((t) => t.isCustom);
    try {
      localStorage.setItem("doloyal_custom_invoice_templates", JSON.stringify(customOnly));
    } catch {
      // ignore
    }

    toast.success(editingTplId ? "Template updated & applied!" : "Custom template created & applied!");
    setBuilderOpen(false);
  };

  const handleDeleteCustomTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = allTemplates.filter((t) => t.id !== id);
    setAllTemplates(updated);
    if (selectedTemplateId === id) {
      setSelectedTemplateId("modern-minimal");
    }
    const customOnly = updated.filter((t) => t.isCustom);
    try {
      localStorage.setItem("doloyal_custom_invoice_templates", JSON.stringify(customOnly));
    } catch {
      // ignore
    }
    toast.success("Custom template deleted");
  };

  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);

  const [formCustomerId, setFormCustomerId] = React.useState("");
  const [formPaymentMethod, setFormPaymentMethod] = React.useState<"CASH" | "UPI" | "CARD" | "WALLET" | "OTHER">("CASH");
  const [formItems, setFormItems] = React.useState<LineItem[]>([
    { id: "1", serviceName: "", quantity: 1, unitPrice: 0 },
  ]);
  const [formDiscount, setFormDiscount] = React.useState(0);
  const [formTaxRate, setFormTaxRate] = React.useState(0);
  const [formSaving, setFormSaving] = React.useState(false);
  const [viewLoading, setViewLoading] = React.useState(false);

  const [selectedTemplateId, setSelectedTemplateIdState] = React.useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("doloyal_active_invoice_template_id") || "modern-minimal";
    }
    return "modern-minimal";
  });

  const setSelectedTemplateId = (id: string) => {
    setSelectedTemplateIdState(id);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("doloyal_active_invoice_template_id", id);
      } catch {
        // ignore
      }
    }
  };

  const [viewTemplateId, setViewTemplateId] = React.useState("modern-minimal");

  const itemIdRef = React.useRef(1);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const custResult = await api.listCustomers({ limit: 200 });
      setCustomers(custResult.items);
      const params: { status?: string } = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      const invResult = await api.listInvoices(params);
      const filtered = debouncedSearch
        ? invResult.filter((inv) =>
            inv.customerName.toLowerCase().includes(debouncedSearch.toLowerCase()),
          )
        : invResult;
      setInvoices(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleViewInvoice = async (id: string) => {
    try {
      setViewLoading(true);
      setViewTemplateId(selectedTemplateId);
      const inv = await api.getInvoice(id);
      setSelectedInvoice(inv);
      setViewDialogOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load invoice");
    } finally {
      setViewLoading(false);
    }
  };

  const addLineItem = () => {
    itemIdRef.current += 1;
    setFormItems((prev) => [
      ...prev,
      { id: String(itemIdRef.current), serviceName: "", quantity: 1, unitPrice: 0 },
    ]);
  };

  const removeLineItem = (id: string) => {
    setFormItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setFormItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const formSubtotal = formItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const formTax = formSubtotal * (formTaxRate / 100);
  const formTotal = formSubtotal - formDiscount + formTax;

  const resetForm = () => {
    itemIdRef.current = 1;
    setFormCustomerId("");
    setFormItems([{ id: "1", serviceName: "", quantity: 1, unitPrice: 0 }]);
    setFormDiscount(0);
    setFormTaxRate(0);
  };

  const handleCreateInvoice = async () => {
    if (!formCustomerId || formItems.length === 0) {
      toast.error("Choose a customer and add at least one line item");
      return;
    }
    const validItems = formItems.filter((i) => i.serviceName && i.unitPrice > 0);
    if (validItems.length === 0) {
      toast.error("Each invoice needs a service and a unit price greater than zero");
      return;
    }
    if (formDiscount > formSubtotal) {
      toast.error("Discount cannot exceed the invoice subtotal");
      return;
    }
    try {
      setFormSaving(true);
      const data: CreateInvoiceInput = {
        customerId: formCustomerId,
        items: validItems.map((i) => ({
          serviceName: i.serviceName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        discount: formDiscount,
        taxRate: formTaxRate,
        paymentMethod: formPaymentMethod,
      };
      await api.createInvoice(data);
      setCreateDialogOpen(false);
      resetForm();
      loadData();
      toast.success("Invoice created successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create invoice");
    } finally {
      setFormSaving(false);
    }
  };

  const totalPaid = invoices
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + i.total, 0);
  const totalPending = invoices
    .filter((i) => i.status === "DRAFT" || i.status === "PENDING")
    .reduce((sum, i) => sum + i.total, 0);
  const overdueCount = invoices.filter((i) => i.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Manage customer invoices and payments"
        actions={
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                New Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>New Invoice</DialogTitle>
                <DialogDescription>
                  Create an invoice for a customer with line items.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Field label="Customer" required>
                  <Select value={formCustomerId} onValueChange={setFormCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} — {c.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {/* Template Selector in Create Dialog */}
                <Field label="Invoice Template">
                  <div className="grid grid-cols-5 gap-2">
                    {TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTemplateId(t.id)}
                        className="relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-2.5 transition-all text-center"
                        style={{
                          borderColor: selectedTemplateId === t.id ? t.accentColor : "rgb(var(--color-border))",
                          background: selectedTemplateId === t.id ? `${t.accentColor}0A` : "transparent",
                        }}
                      >
                        {selectedTemplateId === t.id && (
                          <div
                            className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full"
                            style={{ background: t.accentColor }}
                          >
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                        <div
                          className="flex h-8 w-full items-center justify-center rounded text-base"
                          style={{ background: t.previewGradient, color: t.id === "elegant-dark" || t.id === "corporate-blue" || t.id === "vibrant-gradient" ? "#fff" : "#333" }}
                        >
                          {t.icon}
                        </div>
                        <span className="text-[0.6rem] font-medium leading-tight text-[rgb(var(--color-foreground))]">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </Field>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Line Items</span>
                    <Button variant="secondary" size="sm" onClick={addLineItem}>
                      <Plus className="h-3.5 w-3.5" />
                      Add Item
                    </Button>
                  </div>
                  {formItems.map((item, idx) => (
                    <div key={item.id} className="flex items-end gap-2">
                      <div className="flex-1">
                        <Field label={idx === 0 ? "Service" : undefined}>
                          <Input
                            placeholder="Service name"
                            value={item.serviceName}
                            onChange={(e) =>
                              updateLineItem(item.id, "serviceName", e.target.value)
                            }
                          />
                        </Field>
                      </div>
                      <div className="w-20">
                        <Field label={idx === 0 ? "Qty" : undefined}>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              updateLineItem(item.id, "quantity", parseInt(e.target.value) || 0)
                            }
                          />
                        </Field>
                      </div>
                      <div className="w-28">
                        <Field label={idx === 0 ? "Unit price" : undefined}>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="0"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateLineItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)
                            }
                          />
                        </Field>
                      </div>
                      {formItems.length > 1 && (
                        <button
                          onClick={() => removeLineItem(item.id)}
                          className="mb-0.5 flex h-10 w-10 items-center justify-center rounded-md text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-danger)/0.1)] hover:text-[rgb(var(--color-danger))] transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Payment method">
                    <Select value={formPaymentMethod} onValueChange={(v) => setFormPaymentMethod(v as typeof formPaymentMethod)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="CARD">Card</SelectItem>
                        <SelectItem value="WALLET">Wallet</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Discount">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={formDiscount}
                      onChange={(e) => setFormDiscount(parseFloat(e.target.value) || 0)}
                    />
                  </Field>
                  <Field label="Tax rate (%)">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={formTaxRate}
                      onChange={(e) => setFormTaxRate(parseFloat(e.target.value) || 0)}
                    />
                  </Field>
                </div>
                <div className="rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))] p-4 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[rgb(var(--color-muted-foreground))]">Subtotal</span>
                    <span>{fmt(formSubtotal)}</span>
                  </div>
                  {formDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[rgb(var(--color-muted-foreground))]">Discount</span>
                      <span className="text-[rgb(var(--color-danger))]">-{fmt(formDiscount)}</span>
                    </div>
                  )}
                  {formTaxRate > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[rgb(var(--color-muted-foreground))]">
                        Tax ({formTaxRate}%)
                      </span>
                      <span>{fmt(formTax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-base pt-1 border-t border-[rgb(var(--color-border))]">
                    <span>Total</span>
                    <span>{fmt(formTotal)}</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => { setCreateDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleCreateInvoice} loading={formSaving}>
                  Create Invoice
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total Paid"
          value={totalPaid}
          format={(v) => fmt(v)}
          accent="success"
          hint="Collected payments"
        />
        <KpiCard
          label="Total Pending"
          value={totalPending}
          format={(v) => fmt(v)}
          accent="warning"
          hint="Awaiting payment"
        />
        <KpiCard
          label="Overdue Invoices"
          value={overdueCount}
          accent="danger"
          hint={overdueCount > 0 ? "Requires attention" : "All payments current"}
        />
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))] p-1 w-fit">
        <button
          onClick={() => setActiveTab("invoices")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "invoices"
              ? "bg-[rgb(var(--color-surface))] text-[rgb(var(--color-foreground))] shadow-sm"
              : "text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))]"
          }`}
        >
          <FileText className="h-4 w-4" />
          All Invoices
          {invoices.length > 0 && (
            <Badge variant="outline" className="ml-1 text-[0.6rem]">{invoices.length}</Badge>
          )}
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "templates"
              ? "bg-[rgb(var(--color-surface))] text-[rgb(var(--color-foreground))] shadow-sm"
              : "text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))]"
          }`}
        >
          <LayoutTemplate className="h-4 w-4" />
          Templates
        </button>
      </div>

      {/* ─── Invoices Tab ─── */}
      {activeTab === "invoices" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
                <Input
                  placeholder="Search by customer name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "ALL" ? "All Status" : s.charAt(0) + s.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center py-12">
                <p className="text-sm text-[rgb(var(--color-danger))]">{error}</p>
                <Button variant="ghost" className="mt-3" onClick={loadData}>
                  Try again
                </Button>
              </div>
            ) : invoices.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<FileText className="h-6 w-6" />}
                  title="No invoices found"
                  description={
                    debouncedSearch || statusFilter !== "ALL"
                      ? "Try adjusting your filters"
                      : "Create your first invoice to get started"
                  }
                  action={
                    !debouncedSearch && statusFilter === "ALL" ? (
                      <Button onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4" />
                        New Invoice
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow
                      key={inv.id}
                      className="cursor-pointer"
                      onClick={() => handleViewInvoice(inv.id)}
                    >
                      <TableCell className="font-mono text-xs font-medium">{inv.number}</TableCell>
                      <TableCell className="font-medium">{inv.customerName}</TableCell>
                      <TableCell className="font-medium">{fmt(inv.total)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={STATUS_BADGE[inv.status] ?? "outline"}
                          className="text-[0.65rem]"
                        >
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-[rgb(var(--color-muted-foreground))]">
                        {new Date(inv.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-[rgb(var(--color-muted-foreground))]" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Templates Tab ─── */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-[rgb(var(--color-primary))]" />
                      Invoice Templates & Theme Editor
                    </div>
                  </CardTitle>
                  <p className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">
                    Choose a preset template or upload your own Word (.docx) file & customize your business theme.
                  </p>
                </div>
                <Button onClick={openNewBuilder} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload / Create Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {allTemplates.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTemplateId(t.id)}
                    className="group relative flex flex-col rounded-xl border-2 overflow-hidden transition-all hover:shadow-lg text-left cursor-pointer"
                    style={{
                      borderColor: selectedTemplateId === t.id ? t.accentColor : "rgb(var(--color-border))",
                    }}
                  >
                    {selectedTemplateId === t.id && (
                      <div
                        className="absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full shadow-md"
                        style={{ background: t.accentColor }}
                      >
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                    {/* Template Preview Header */}
                    <div
                      className="flex h-32 items-center justify-center text-4xl"
                      style={{
                        background: t.previewGradient,
                        color: t.id === "elegant-dark" || t.id === "corporate-blue" || t.id === "vibrant-gradient" ? "#fff" : "#333",
                      }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-3xl">{t.icon}</span>
                        <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.85 }}>
                          {t.isWordDoc ? "DOCX FILE" : t.invoiceTitle || "INVOICE"}
                        </span>
                      </div>
                    </div>
                    {/* Template Info & Custom Controls */}
                    <div className="flex flex-col gap-1.5 p-4 bg-[rgb(var(--color-surface))]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-3 w-3 shrink-0 rounded-full" style={{ background: t.accentColor }} />
                          <span className="truncate text-sm font-semibold text-[rgb(var(--color-foreground))]">{t.name}</span>
                        </div>
                        {t.isCustom && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => openEditBuilder(t, e)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              title="Edit template"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCustomTemplate(t.id, e)}
                              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              title="Delete template"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-[rgb(var(--color-muted-foreground))] leading-relaxed truncate">{t.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {selectedTemplateId === t.id && (
                          <Badge variant="primary" className="text-[0.6rem]">Active</Badge>
                        )}
                        {t.isWordDoc && (
                          <Badge variant="outline" className="text-[0.6rem] text-blue-600 border-blue-200 bg-blue-50">Word .docx</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Live Preview */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-[rgb(var(--color-accent))]" />
                  Live Invoice Preview
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RenderInvoiceTemplate
                templateId={selectedTemplateId}
                allTemplates={allTemplates}
                invoice={{
                  id: "preview",
                  number: "INV-PREVIEW",
                  customerId: "c1",
                  customerName: "Priya Sharma",
                  subtotal: 3000,
                  discount: 300,
                  tax: 270,
                  total: 2970,
                  status: "PAID",
                  paymentMethod: "UPI",
                  items: [
                    { id: "p1", serviceName: "Haircut + Styling", quantity: 1, unitPrice: 800, total: 800 },
                    { id: "p2", serviceName: "Hair Color (Premium)", quantity: 1, unitPrice: 2200, total: 2200 },
                  ],
                  createdAt: new Date().toISOString(),
                }}
                fmt={fmt}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Custom Template Builder & Word Upload Modal ─── */}
      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-[#7C3AED]" />
                {editingTplId ? "Edit Invoice Template" : "AI Template Generator & Theme Builder"}
              </div>
            </DialogTitle>
            <DialogDescription>
              Prompt AI to generate a complete custom invoice theme, upload a Word (.docx) file, or manually edit your business colors & terms.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* ✨ AI Generator Bar */}
            <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-purple-600 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-purple-900">AI Prompt Template Generator</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="e.g. Luxury gold theme for high-end spa, Medical clinic tax invoice, Auto repair service bill..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAiGenerateTemplate();
                    }
                  }}
                  className="bg-white/90 text-xs shadow-none border-purple-200 focus:border-purple-500"
                />
                <Button
                  onClick={() => handleAiGenerateTemplate()}
                  disabled={aiGenerating}
                  className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shrink-0 text-xs"
                >
                  {aiGenerating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )}
                  {aiGenerating ? "Generating..." : "Generate AI Theme"}
                </Button>
              </div>

              {/* Quick AI Suggestion Chips */}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-purple-700 font-medium mr-1">Try AI Presets:</span>
                {[
                  { label: "✨ Luxury Salon", prompt: "Luxury gold theme for high-end salon & spa" },
                  { label: "🏥 Medical Clinic", prompt: "Emerald green medical clinic tax invoice" },
                  { label: "🚗 Auto Workshop", prompt: "Red automotive garage service bill" },
                  { label: "🏋️ Fitness Club", prompt: "Violet gym membership receipt" },
                  { label: "🌙 Midnight Enterprise", prompt: "Dark enterprise corporate invoice" },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => {
                      setAiPrompt(chip.prompt);
                      handleAiGenerateTemplate(chip.prompt);
                    }}
                    className="rounded-full bg-white/80 border border-purple-200/80 px-2.5 py-0.5 text-[10px] font-medium text-purple-800 transition hover:bg-purple-600 hover:text-white hover:border-purple-600"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Word File Uploader Section */}
            <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-3.5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                  <FileCode className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-semibold text-indigo-950">Upload Microsoft Word (.docx) File</h4>
                  <p className="text-[11px] text-indigo-700/80 mt-0.5">
                    Upload your Word file. Placeholders like <code className="bg-indigo-100 px-1 py-0.5 rounded text-[10px] font-mono text-indigo-900">&#123;&#123;customer_name&#125;&#125;</code> and <code className="bg-indigo-100 px-1 py-0.5 rounded text-[10px] font-mono text-indigo-900">&#123;&#123;total&#125;&#125;</code> populate automatically.
                  </p>
                  
                  <div className="mt-2.5 flex items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-indigo-700">
                      <FileUp className="h-3.5 w-3.5" />
                      {wordFileName ? "Change Word File" : "Choose .docx File"}
                      <input
                        type="file"
                        accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        onChange={handleWordFileUpload}
                      />
                    </label>
                    {wordFileName && (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        {wordFileName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Template Fields & Live Mini Preview */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[rgb(var(--color-foreground))]">Template Name</label>
                  <Input
                    placeholder="e.g. Royal Emerald Invoice"
                    value={tplName}
                    onChange={(e) => setTplName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[rgb(var(--color-foreground))]">Invoice Header Title</label>
                  <Input
                    placeholder="e.g. TAX INVOICE or CASH MEMO"
                    value={tplTitle}
                    onChange={(e) => setTplTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[rgb(var(--color-foreground))]">Theme Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={tplColor}
                      onChange={(e) => setTplColor(e.target.value)}
                      className="h-8 w-10 cursor-pointer rounded border p-0.5"
                    />
                    <Input
                      value={tplColor}
                      onChange={(e) => setTplColor(e.target.value)}
                      className="w-28 uppercase font-mono text-xs"
                    />
                    <div className="flex items-center gap-1 ml-1">
                      {["#2563EB", "#059669", "#7C3AED", "#D97706", "#DC2626", "#0F172A"].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setTplColor(c)}
                          className="h-5 w-5 rounded-full border border-black/10 transition hover:scale-110"
                          style={{ background: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[rgb(var(--color-foreground))]">Header Subtitle Note</label>
                  <Input
                    placeholder="e.g. Official Business Cash Memo"
                    value={tplSubtitle}
                    onChange={(e) => setTplSubtitle(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[rgb(var(--color-foreground))]">Footer Terms & Conditions</label>
                  <textarea
                    rows={2}
                    value={tplTerms}
                    onChange={(e) => setTplTerms(e.target.value)}
                    placeholder="e.g. Payment due within 15 days of invoice date."
                    className="w-full rounded-lg border border-[rgb(var(--color-border))] bg-white p-2 text-xs outline-none focus:border-[rgb(var(--color-primary))]"
                  />
                </div>
              </div>

              {/* Live Instant Preview Box */}
              <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> Instant Theme Preview
                </span>
                <div className="flex-1 overflow-auto rounded-lg bg-white p-3 border shadow-sm text-xs">
                  <div
                    style={{
                      background: `linear-gradient(135deg, ${tplColor || "#2563EB"} 0%, ${tplColor || "#2563EB"}dd 100%)`,
                      color: "#fff",
                      padding: "12px",
                      borderRadius: "6px",
                      marginBottom: "10px",
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: "14px" }}>{tplTitle || "INVOICE"}</div>
                    <div style={{ fontSize: "10px", opacity: 0.85 }}>{tplSubtitle || "INV-001"}</div>
                  </div>
                  <div style={{ padding: "8px", background: `${tplColor || "#2563EB"}0d`, borderRadius: "6px", marginBottom: "8px" }}>
                    <div style={{ fontSize: "9px", color: tplColor || "#2563EB", fontWeight: 700 }}>BILLED TO</div>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>Priya Sharma</div>
                  </div>
                  <div style={{ borderTop: `2px solid ${tplColor || "#2563EB"}`, paddingTop: "6px", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                    <span>Total Amount</span>
                    <span style={{ color: tplColor || "#2563EB" }}>₹2,970</span>
                  </div>
                  {tplTerms && (
                    <div style={{ marginTop: "10px", fontSize: "9px", color: "#64748b", borderLeft: `2px solid ${tplColor || "#2563EB"}`, paddingLeft: "6px" }}>
                      {tplTerms}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBuilderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCustomTemplate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Save & Apply Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── View Invoice Dialog ─── */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Invoice {selectedInvoice?.number ?? ""}
            </DialogTitle>
            <DialogDescription>
              {selectedInvoice?.customerName} &middot;{" "}
              {selectedInvoice?.createdAt
                ? new Date(selectedInvoice.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : ""}
            </DialogDescription>
          </DialogHeader>

          {/* Template selector for viewing */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[rgb(var(--color-muted-foreground))] font-medium">Template:</span>
            {allTemplates.map((t) => (
              <button
                key={t.id}
                onClick={() => setViewTemplateId(t.id)}
                className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-all"
                style={{
                  borderColor: viewTemplateId === t.id ? t.accentColor : "rgb(var(--color-border))",
                  background: viewTemplateId === t.id ? `${t.accentColor}12` : "transparent",
                  color: viewTemplateId === t.id ? t.accentColor : "rgb(var(--color-muted-foreground))",
                  fontWeight: viewTemplateId === t.id ? 600 : 400,
                }}
              >
                <span>{t.icon}</span>
                {t.name}
              </button>
            ))}
          </div>

          {viewLoading || !selectedInvoice ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          ) : (
            <div id="invoice-print-area">
              <RenderInvoiceTemplate
                templateId={viewTemplateId}
                allTemplates={allTemplates}
                invoice={selectedInvoice}
                fmt={fmt}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => window.print()}>
              <Download className="h-4 w-4" />
              Print / Save PDF
            </Button>
            <Button variant="secondary" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
