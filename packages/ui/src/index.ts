/**
 * @doloyal/ui — Doloyal brand design system.
 *
 * Consuming app setup:
 *   // app/layout.tsx or globals.css
 *   import "@doloyal/ui/styles.css";
 *
 * Then import components from the package root.
 */

// Utilities
export { cn } from "./lib/utils";

// Brand tokens
export { BRAND_COLORS, CHART_PALETTE } from "./brand";

// Primitives
export {
  Button,
  buttonVariants,
  type ButtonProps,
} from "./components/button";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./components/card";
export {
  Input,
  Textarea,
  Label,
  Field,
  type InputProps,
  type TextareaProps,
  type FieldProps,
} from "./components/input";
export { Badge, badgeVariants, type BadgeProps } from "./components/badge";
export { Avatar, AvatarImage, AvatarFallback } from "./components/avatar";
export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogPortal,
  DialogOverlay,
} from "./components/dialog";
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
} from "./components/select";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/tabs";
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "./components/table";
export { Skeleton } from "./components/skeleton";
export {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Switch,
} from "./components/misc";
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuRadioGroup,
} from "./components/dropdown";

// Composite
export { KpiCard, type KpiCardProps } from "./components/kpi-card";
export { StatChart, type StatChartProps, type SeriesConfig } from "./components/stat-chart";
export { EmptyState, ComingSoon, type EmptyStateProps } from "./components/empty-state";
export { Logo, LogoMark, type LogoProps } from "./components/logo";
export { PageHeader, Spinner } from "./components/page-header";
