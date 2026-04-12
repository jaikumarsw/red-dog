"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { AdminTableViewLink } from "@/components/admin/AdminTableViewLink";
import { Button } from "@/components/ui/button";

type CreatedBy = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

type ApplicationSummary = {
  _id: string;
  status: string;
  amountRequested?: number;
  contactName?: string;
  contactEmail?: string;
  projectTitle?: string;
  updatedAt?: string;
  organization?: { name?: string; location?: string; agencyTypes?: string[] };
  funder?: { name?: string };
};

type OpportunityDetail = {
  _id: string;
  title: string;
  funder: string;
  deadline?: string;
  status: string;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  sourceUrl?: string;
  keywords?: string[];
  equipmentTags?: string[];
  localMatchRequired?: boolean;
  agencyTypes?: string[];
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: CreatedBy | string;
  applications: ApplicationSummary[];
};

function formatAmountRange(min?: number, max?: number) {
  if (min == null && max == null) return "—";
  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `${fmt(min)}+`;
  return `Up to ${fmt(max!)}`;
}

function createdByLabel(cb: OpportunityDetail["createdBy"]) {
  if (!cb || typeof cb === "string") return "—";
  const name = [cb.firstName, cb.lastName].filter(Boolean).join(" ");
  return name || cb.email || "—";
}

export default function AdminOpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const id = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "opportunity", id],
    queryFn: async () => {
      const res = await adminApi.get(`admin/opportunities/${id}`);
      return res.data.data as OpportunityDetail;
    },
    enabled: Boolean(id),
  });

  const deleteOpp = useMutation({
    mutationFn: () => adminApi.delete(`admin/opportunities/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "opportunities"] });
      router.push("/admin/opportunities");
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Button variant="ghost" className="-ml-3 h-auto gap-2 px-3 py-2 text-[#374151] hover:text-[#111827]" asChild>
            <Link href="/admin/opportunities">
              <ArrowLeft className="h-4 w-4" />
              Back to opportunities
            </Link>
          </Button>
          <h1 className="[font-family:'Montserrat',Helvetica] text-2xl font-bold text-[#111827]">
            Opportunity details
          </h1>
          {data?.title && <p className="text-sm text-[#6b7280]">{data.title}</p>}
        </div>
        {data && (
          <div className="flex flex-wrap gap-2">
            <Button asChild className="bg-[#ef3e34] hover:bg-[#d63530]">
              <Link href={`/admin/opportunities/${data._id}/edit`}>Edit opportunity</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
              disabled={deleteOpp.isPending}
              onClick={() => {
                if (confirm("Delete this opportunity?")) deleteOpp.mutate();
              }}
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {isLoading && (
        <p className="text-sm text-[#6b7280] [font-family:'Montserrat',Helvetica]">Loading…</p>
      )}
      {isError && (
        <p className="text-sm text-red-600 [font-family:'Montserrat',Helvetica]">
          Could not load this opportunity.{" "}
          <Link href="/admin/opportunities" className="font-medium underline">
            Return to list
          </Link>
        </p>
      )}
      {!isLoading && !isError && data && (
        <div className="space-y-10">
          <section className="space-y-3 text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#ef3e34] [font-family:'Montserrat',Helvetica]">
              Overview
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-[#6b7280]">Title</dt>
                <dd className="font-medium text-[#111827]">{data.title}</dd>
              </div>
              <div>
                <dt className="text-[#6b7280]">Funder</dt>
                <dd className="text-[#111827]">{data.funder}</dd>
              </div>
              <div>
                <dt className="text-[#6b7280]">Category</dt>
                <dd className="text-[#111827]">{data.category || "—"}</dd>
              </div>
              <div>
                <dt className="text-[#6b7280]">Status</dt>
                <dd className="text-[#111827]">{data.status}</dd>
              </div>
              <div>
                <dt className="text-[#6b7280]">Deadline</dt>
                <dd className="text-[#111827]">
                  {data.deadline ? new Date(String(data.deadline)).toLocaleString() : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[#6b7280]">Amount range</dt>
                <dd className="text-[#111827]">{formatAmountRange(data.minAmount, data.maxAmount)}</dd>
              </div>
                  <div>
                    <dt className="text-[#6b7280]">Local match required</dt>
                    <dd className="text-[#111827]">{data.localMatchRequired ? "Yes" : "No"}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[#6b7280]">Equipment tags</dt>
                    <dd className="text-[#111827]">
                      {data.equipmentTags?.length ? data.equipmentTags.join(", ") : "—"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[#6b7280]">Official link</dt>
                <dd className="text-[#111827]">
                  {data.sourceUrl ? (
                    <a
                      href={data.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-[#ef3e34] hover:underline"
                    >
                      {data.sourceUrl}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[#6b7280]">Keywords</dt>
                <dd className="text-[#111827]">{data.keywords?.length ? data.keywords.join(", ") : "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[#6b7280]">Eligible agency types</dt>
                <dd className="text-[#111827]">
                  {data.agencyTypes?.length ? data.agencyTypes.join(", ") : "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[#6b7280]">Description</dt>
                <dd className="whitespace-pre-wrap text-[#374151]">{data.description || "—"}</dd>
              </div>
              <div>
                <dt className="text-[#6b7280]">Created</dt>
                <dd className="text-[#111827]">
                  {data.createdAt ? new Date(String(data.createdAt)).toLocaleString() : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[#6b7280]">Last updated</dt>
                <dd className="text-[#111827]">
                  {data.updatedAt ? new Date(String(data.updatedAt)).toLocaleString() : "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[#6b7280]">Created by</dt>
                <dd className="text-[#111827]">{createdByLabel(data.createdBy)}</dd>
              </div>
            </dl>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#ef3e34] [font-family:'Montserrat',Helvetica]">
              Applicants ({data.applications?.length ?? 0})
            </h2>
            {(!data.applications || data.applications.length === 0) && (
              <p className="text-sm text-[#6b7280] [font-family:'Montserrat',Helvetica]">
                No applications have been started for this opportunity yet.
              </p>
            )}
            {data.applications && data.applications.length > 0 && (
              <div className="overflow-x-auto rounded-md border border-[#e5e7eb] bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-[#f9fafb] text-left text-[#6b7280]">
                    <tr>
                      <th className="p-2">Agency</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Updated</th>
                      <th className="w-14 p-2 text-center" aria-label="View details" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.applications.map((app) => (
                      <tr key={String(app._id)} className="border-t border-[#f0f0f0]">
                        <td className="p-2">
                          <p className="font-medium text-[#111827]">{app.organization?.name || "—"}</p>
                          {app.organization?.location && (
                            <p className="text-xs text-[#6b7280]">{app.organization.location}</p>
                          )}
                        </td>
                        <td className="p-2">
                          <span className="inline-block rounded bg-[#f3f4f6] px-2 py-0.5 text-xs text-[#374151]">
                            {app.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap p-2 text-[#6b7280]">
                          {app.updatedAt ? new Date(String(app.updatedAt)).toLocaleDateString() : "—"}
                        </td>
                        <td className="p-2 text-center">
                          <AdminTableViewLink href={`/admin/applications/${app._id}`} label="View application" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
