"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  Store,
  Clock,
  FileText,
  CreditCard,
  MessageSquare,
  Printer,
} from "lucide-react";
import {
  PageHeader,
  Button,
  Input,
  Label,
  Field,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge,
} from "@doloyal/ui";
import { useBranch } from "@/lib/branch-context";
import { saveBranches } from "@/lib/branches";
import { BranchAvatar } from "@/components/branch-workspace";
import { PageSkeleton, usePageLoading } from "@/components/branch-ui";

type BankDetails = { upi: string; bankName: string; accountNo: string; ifsc: string };

export default function BranchSettingsPage() {
  const params = useParams<{ branchId: string }>();
  const branchId = params.branchId;
  const { selectedBranch, branches } = useBranch();
  const loading = usePageLoading(420);

  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState(() => ({
    businessName: "Doloyal",
    branchName: "",
    address: "",
    mapLocation: "",
    phone: "",
    email: "",
    openingHours: "",
    closingHours: "",
    breakTime: "",
    timezone: "Asia/Kolkata",
    gst: "",
    taxes: "On Services · 18%",
    upi: "doloyal@upi",
    bankAccount: "1234 5678 9012",
    ifsc: "HDFC0001234",
    paymentUpstream: true,
    paymentUpi: true,
    paymentBank: true,
    workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as string[],
    notifyWhatsApp: true,
    notifyEmail: true,
    notifySms: false,
    whatsappBusiness: true,
    receiptPrint: true,
    receiptAutoEmail: true,
    autoWalkInBooking: true,
    bookingDeposit: false,
    autoConfirm: true,
    reminder: true,
    autoSmsReminder: true,
    receiptAutoPrint: true,
    gstReceipt: false,
    allowWalkIn: true,
    requireDeposit: false,
    cancelWindow: "24h",
  }));

  React.useEffect(() => {
    if (selectedBranch) {
      setForm((f) => ({
        ...f,
        branchName: selectedBranch.name,
        address: selectedBranch.address,
        mapLocation: selectedBranch.mapLocation,
        phone: selectedBranch.phone,
        email: selectedBranch.email,
        openingHours: selectedBranch.openingHours,
        closingHours: selectedBranch.closingHours,
        breakTime: selectedBranch.breakTime,
        timezone: selectedBranch.timezone,
        gst: selectedBranch.gst,
      }));
    }
  }, [selectedBranch]);

  if (loading || !selectedBranch) return <PageSkeleton cards={4} />;

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const toggleDay = (day: string) => {
    const has = form.workingDays.includes(day);
    set({
      workingDays: has ? form.workingDays.filter((d) => d !== day) : [...form.workingDays, day],
    });
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      const updated = branches.map((b) =>
        b.id === branchId ? { ...b, name: form.branchName, address: form.address, phone: form.phone, email: form.email, timezone: form.timezone } : b,
      );
      saveBranches(updated);
      setSaving(false);
      toast.success("Branch settings updated");
    }, 500);
  };

  const FormatField = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <Field label={label}>{children}</Field>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch Settings"
        description={`Manage configuration for ${selectedBranch.name}.`}
        actions={
          <Button onClick={handleSave} loading={saving}>
            Save Changes
          </Button>
        }
      />

      <div className="flex items-center gap-4 rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-5">
        <BranchAvatar branch={selectedBranch} size="lg" />
        <div className="min-w-0">
          <p className="text-lg font-semibold">{selectedBranch.name}</p>
          <p className="text-sm text-[rgb(var(--color-muted-foreground))]">{selectedBranch.address}</p>
        </div>
        <Badge variant={selectedBranch.status === "Active" ? "success" : "outline"} className="ml-auto">
          {selectedBranch.status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsCard icon={<Store className="h-4 w-4" />} title="Business & Branch">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormatField label="Business Name"><Input value={form.branchName} /></FormatField>
            <FormatField label="Branch Name"><Input value={form.branchName} onChange={(e) => set({ branchName: e.target.value })} /></FormatField>
            <FormatField label="Address"><Input value={form.address} onChange={(e) => set({ address: e.target.value })} /></FormatField>
            <FormatField label="Map Location"><Input value={form.mapLocation} onChange={(e) => set({ mapLocation: e.target.value })} /></FormatField>
            <FormatField label="Phone"><Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} /></FormatField>
            <FormatField label="Email"><Input value={form.email} onChange={(e) => set({ email: e.target.value })} /></FormatField>
            <FormatField label="Timezone">
              <Select value={form.timezone} onValueChange={(v) => set({ timezone: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Kolkata">Asia/Kolkata</SelectItem>
                  <SelectItem value="Asia/Dubai">Asia/Dubai</SelectItem>
                  <SelectItem value="Asia/Singapore">Asia/Singapore</SelectItem>
                  <SelectItem value="Europe/London">Europe/London</SelectItem>
                </SelectContent>
              </Select>
            </FormatField>
            <FormatField label="GST"><Input value={form.gst} onChange={(e) => set({ gst: e.target.value })} /></FormatField>
          </div>
        </SettingsCard>

        <SettingsCard icon={<Clock className="h-4 w-4" />} title="Hours & Working Days">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormatField label="Opening"><Input value={form.openingHours} onChange={(e) => set({ openingHours: e.target.value })} /></FormatField>
            <FormatField label="Closing"><Input value={form.closingHours} onChange={(e) => set({ closingHours: e.target.value })} /></FormatField>
            <FormatField label="Break Time"><Input value={form.breakTime} onChange={(e) => set({ breakTime: e.target.value })} /></FormatField>
          </div>
          <div className="mt-4">
            <Label>Working Days</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    form.workingDays.includes(d)
                      ? "bg-[rgb(var(--color-primary))] text-white"
                      : "border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] text-[rgb(var(--color-muted-foreground))]"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </SettingsCard>

        <SettingsCard icon={<CreditCard className="h-4 w-4" />} title="Payments">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormatField label="UPI ID"><Input value={form.upi} onChange={(e) => set({ upi: e.target.value })} /></FormatField>
            <FormatField label="Bank Account"><Input value={form.bankAccount} onChange={(e) => set({ bankAccount: e.target.value })} /></FormatField>
            <FormatField label="IFSC"><Input value={form.ifsc} onChange={(e) => set({ ifsc: e.target.value })} /></FormatField>
            <FormatField label="Taxes"><Input value={form.taxes ?? "18% GST"} onChange={(e) => set({ taxes: e.target.value })} /></FormatField>
          </div>
        </SettingsCard>

        <SettingsCard icon={<FileText className="h-4 w-4" />} title="Booking & Rules">
          <div className="space-y-3">
            <ToggleRow checked={form.autoWalkInBooking ?? true} onChange={(v) => set({ autoWalkInBooking: v })} title="Allow walk-in bookings" />
            <ToggleRow checked={form.bookingDeposit ?? false} onChange={(v) => set({ bookingDeposit: v })} title="Require deposit for bookings" />
            <ToggleRow checked={form.autoConfirm ?? true} onChange={(v) => set({ autoConfirm: v })} title="Auto-confirm online bookings" />
            <ToggleRow checked={form.reminder ?? true} onChange={(v) => set({ reminder: v })} title="Send appointment reminders" />
          </div>
          <FormatField label="Cancellation window">
            <Select value={form.cancelWindow} onValueChange={(v) => set({ cancelWindow: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2h">2 hours</SelectItem>
                <SelectItem value="6h">6 hours</SelectItem>
                <SelectItem value="24h">24 hours</SelectItem>
                <SelectItem value="48h">48 hours</SelectItem>
              </SelectContent>
            </Select>
          </FormatField>
        </SettingsCard>

        <SettingsCard icon={<MessageSquare className="h-4 w-4" />} title="Notifications">
          <div className="space-y-3">
            <ToggleRow checked={form.notifyWhatsApp} onChange={(v) => set({ notifyWhatsApp: v })} title="WhatsApp notifications" />
            <ToggleRow checked={form.notifyEmail} onChange={(v) => set({ notifyEmail: v })} title="Email notifications" />
            <ToggleRow checked={form.notifySms} onChange={(v) => set({ notifySms: v })} title="SMS notifications" />
            <ToggleRow checked={form.autoSmsReminder ?? true} onChange={(v) => set({ autoSmsReminder: v })} title="Automatic booking reminders" />
          </div>
        </SettingsCard>

        <SettingsCard icon={<Printer className="h-4 w-4" />} title="Receipts & Printing">
          <div className="space-y-3">
            <ToggleRow checked={form.receiptPrint ?? true} onChange={(v) => set({ receiptPrint: v })} title="Print receipts" />
            <ToggleRow checked={form.receiptAutoPrint ?? true} onChange={(v) => set({ receiptAutoPrint: v })} title="Auto-print after payment" />
            <ToggleRow checked={form.gstReceipt ?? false} onChange={(v) => set({ gstReceipt: v })} title="Show GST on receipts" />
          </div>
        </SettingsCard>
      </div>
    </div>
  );
}

function SettingsCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[0.95rem]">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]">
            {icon}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ToggleRow({
  checked,
  onChange,
  title,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[rgb(var(--color-border))] px-4 py-3">
      <span className="text-sm font-medium">{title}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}