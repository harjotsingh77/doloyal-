import { redirect } from "next/navigation";

export default function BranchRoot({ params }: { params: { branchId: string } }) {
  redirect(`/branches/${params.branchId}/dashboard`);
}