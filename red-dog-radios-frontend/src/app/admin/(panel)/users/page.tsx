"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { Button } from "@/components/ui/button";

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const res = await adminApi.get("admin/users", { params: { limit: 200 } });
      return res.data.data as Record<string, unknown>[];
    },
  });

  const roleMut = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      adminApi.put(`admin/users/${userId}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Users</h1>
      <div className="overflow-x-auto rounded-lg border border-slate-800 text-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Signed up</th>
              <th className="p-3">Agency</th>
              <th className="p-3">Apps</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={String(u._id)} className="border-t border-slate-800">
                <td className="p-3 text-white">{String(u.fullName || u.email)}</td>
                <td className="p-3 text-slate-400">{String(u.email)}</td>
                <td className="p-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-semibold ${
                      u.role === "admin"
                        ? "bg-red-900/50 text-red-300"
                        : "bg-blue-900/50 text-blue-300"
                    }`}
                  >
                    {String(u.role)}
                  </span>
                </td>
                <td className="p-3 text-slate-500">
                  {u.createdAt ? new Date(String(u.createdAt)).toLocaleDateString() : "—"}
                </td>
                <td className="p-3 text-slate-400">{String(u.agencyName || "—")}</td>
                <td className="p-3 text-slate-400">{String(u.applicationCount ?? 0)}</td>
                <td className="p-3">
                  {u.role === "admin" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-600 text-xs"
                      onClick={() =>
                        roleMut.mutate({ userId: String(u._id), role: "agency" })
                      }
                    >
                      Demote to agency
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-600 text-xs"
                      onClick={() =>
                        roleMut.mutate({ userId: String(u._id), role: "admin" })
                      }
                    >
                      Promote to admin
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
