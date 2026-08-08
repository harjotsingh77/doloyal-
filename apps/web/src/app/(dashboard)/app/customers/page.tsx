"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Users,
  ChevronRight,
  Upload,
  Download,
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Field,
  EmptyState,
} from "@doloyal/ui";
import { relativeTime } from "@doloyal/shared";
import type { Customer, CustomerQuery, Paginated } from "@doloyal/shared";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency-context";
import { toast } from "sonner";

const CHURN_RISK_COLORS: Record<string, "success" | "warning" | "accent" | "danger"> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "accent",
  CRITICAL: "danger",
};

export default function CustomersPage() {
  const { format: fmt } = useCurrency();
  const router = useRouter();
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [bandFilter, setBandFilter] = React.useState<string>("ALL");
  const [churnFilter, setChurnFilter] = React.useState<string>("ALL");
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [addName, setAddName] = React.useState("");
  const [addPhone, setAddPhone] = React.useState("");
  const [addEmail, setAddEmail] = React.useState("");
  const [addTags, setAddTags] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const importInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadCustomers = React.useCallback(
    async (cursorVal?: string) => {
      try {
        setLoading(true);
        setError(null);
        const params: CustomerQuery = { limit: 50 };
        if (debouncedSearch) params.search = debouncedSearch;
        if (bandFilter && bandFilter !== "ALL") params.band = bandFilter as Customer["loyaltyBand"];
        if (churnFilter && churnFilter !== "ALL")
          params.churnRisk = churnFilter as Customer["churnRisk"];
        if (cursorVal) params.cursor = cursorVal;

        const result = await api.listCustomers(params);
        if (cursorVal) {
          setCustomers((prev) => [...prev, ...result.items]);
        } else {
          setCustomers(result.items);
        }
        setCursor(result.nextCursor);
        setHasMore(result.hasMore);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load customers");
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, bandFilter, churnFilter],
  );

  React.useEffect(() => {
    setCursor(null);
    loadCustomers();
  }, [loadCustomers]);

  const handleAddCustomer = async () => {
    if (!addName.trim() || !addPhone.trim()) {
      toast.error("Customer name and phone number are required");
      return;
    }
    if (addEmail && !/^\S+@\S+\.\S+$/.test(addEmail)) {
      toast.error("Enter a valid email address");
      return;
    }
    try {
      setAdding(true);
      const tags = addTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await api.createCustomer({
        name: addName,
        phone: addPhone,
        email: addEmail || undefined,
        tags,
      });
      setAddDialogOpen(false);
      setAddName("");
      setAddPhone("");
      setAddEmail("");
      setAddTags("");
      loadCustomers();
      toast.success("Customer added successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add customer");
    } finally {
      setAdding(false);
    }
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
      toast.error("Please select an Excel file (.xlsx or .xls)");
      return;
    }

    try {
      setImporting(true);
      const result = await api.importCustomers(file);
      await loadCustomers();

      if (result.imported > 0 && result.skipped === 0) {
        toast.success(
          `Imported ${result.imported} customer${result.imported === 1 ? "" : "s"} successfully`,
        );
      } else if (result.imported > 0) {
        const failedRows = result.errors
          .slice(0, 5)
          .map((e) => `Row ${e.row}: ${e.reason}`)
          .join(" · ");
        toast.warning(
          `Imported ${result.imported}, skipped ${result.skipped}. ${failedRows}${
            result.errors.length > 5 ? ` · +${result.errors.length - 5} more` : ""
          }`,
          { duration: 8000 },
        );
      } else if (result.skipped > 0) {
        const failedRows = result.errors
          .slice(0, 5)
          .map((e) => `Row ${e.row}: ${e.reason}`)
          .join(" · ");
        toast.error(
          `No customers imported. ${failedRows}${
            result.errors.length > 5 ? ` · +${result.errors.length - 5} more` : ""
          }`,
          { duration: 8000 },
        );
      } else {
        toast.error("No customer rows found in the Excel file");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not import customers");
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const { blob, filename } = await api.exportCustomers();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("Customer export downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not export customers");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="View and manage your customer base"
        actions={
          <div className="flex items-center gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={handleImportFile}
            />
            <Button
              variant="secondary"
              onClick={handleImportClick}
              loading={importing}
              disabled={exporting}
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button
              variant="secondary"
              onClick={handleExport}
              loading={exporting}
              disabled={importing}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Customer</DialogTitle>
                  <DialogDescription>
                    Add a new customer to your database.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Field label="Full name" required>
                    <Input
                      placeholder="Customer name"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                    />
                  </Field>
                  <Field label="Phone number" required>
                    <Input
                      placeholder="+91 98765 43210"
                      value={addPhone}
                      onChange={(e) => setAddPhone(e.target.value)}
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      type="email"
                      placeholder="customer@example.com"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                    />
                  </Field>
                  <Field label="Tags (comma-separated)">
                    <Input
                      placeholder="VIP, Gold, Regular"
                      value={addTags}
                      onChange={(e) => setAddTags(e.target.value)}
                    />
                  </Field>
                </div>
                <DialogFooter>
                  <Button variant="secondary" onClick={() => setAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddCustomer} loading={adding}>
                    Add Customer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
              <Input
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={bandFilter} onValueChange={setBandFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Band" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Bands</SelectItem>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="GROWING">Growing</SelectItem>
                  <SelectItem value="LOYAL">Loyal</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                  <SelectItem value="CHURNED">Churned</SelectItem>
                </SelectContent>
              </Select>
              <Select value={churnFilter} onValueChange={setChurnFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Risk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Risk</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && customers.length === 0 ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-12">
              <p className="text-sm text-[rgb(var(--color-danger))]">{error}</p>
              <Button variant="ghost" className="mt-3" onClick={() => loadCustomers()}>
                Try again
              </Button>
            </div>
          ) : customers.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<Users className="h-6 w-6" />}
                title="No customers found"
                description={
                  debouncedSearch || bandFilter !== "ALL" || churnFilter !== "ALL"
                    ? "Try adjusting your filters"
                    : "Add your first customer to get started"
                }
                action={
                  !debouncedSearch && bandFilter === "ALL" && churnFilter === "ALL" ? (
                    <Button onClick={() => setAddDialogOpen(true)}>
                      <Plus className="h-4 w-4" />
                      Add Customer
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Visits</TableHead>
                  <TableHead>LTV</TableHead>
                  <TableHead>Band</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Last Visit</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/app/customers/${c.id}`)}
                  >
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-[rgb(var(--color-muted-foreground))]">{c.phone}</TableCell>
                    <TableCell className="text-[rgb(var(--color-muted-foreground))]">{c.email ?? "—"}</TableCell>
                    <TableCell>{c.pointsBalance.toLocaleString("en-IN")}</TableCell>
                    <TableCell>{c.visitCount}</TableCell>
                    <TableCell className="font-medium">{fmt(c.lifetimeValue)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          c.loyaltyBand === "VIP"
                            ? "primary"
                            : c.loyaltyBand === "LOYAL"
                              ? "success"
                              : c.loyaltyBand === "GROWING"
                                ? "accent"
                                : c.loyaltyBand === "NEW"
                                  ? "outline"
                                  : "danger"
                        }
                        className="text-[0.65rem]"
                      >
                        {c.loyaltyBand}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={CHURN_RISK_COLORS[c.churnRisk] ?? "outline"}
                        className="text-[0.65rem]"
                      >
                        {c.churnRisk}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-[rgb(var(--color-muted-foreground))]">
                      {c.lastVisitAt ? relativeTime(c.lastVisitAt) : "—"}
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

      {hasMore && !loading && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            onClick={() => loadCustomers(cursor ?? undefined)}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
