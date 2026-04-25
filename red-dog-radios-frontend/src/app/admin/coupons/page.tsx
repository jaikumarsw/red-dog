"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import api from "@/lib/api";
import { 
  Ticket, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Power, 
  Users, 
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Coupon Form
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    description: "",
    maxUses: "",
    grantFullAccess: true,
    expiresAt: ""
  });

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await api.get("/coupons");
      setCoupons(res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch coupons:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreate = async () => {
    if (!newCoupon.code) return;
    try {
      setIsSubmitting(true);
      const payload = {
        ...newCoupon,
        maxUses: newCoupon.maxUses ? parseInt(newCoupon.maxUses) : null,
        expiresAt: newCoupon.expiresAt || null
      };
      await api.post("/coupons", payload);
      setIsModalOpen(false);
      setNewCoupon({ code: "", description: "", maxUses: "", grantFullAccess: true, expiresAt: "" });
      fetchCoupons();
    } catch (err) {
      console.error("Failed to create coupon:", err);
      alert("Failed to create coupon. Code might already exist.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this coupon?")) return;
    try {
      await api.patch(`/coupons/${id}/deactivate`);
      fetchCoupons();
    } catch (err) {
      console.error("Failed to deactivate coupon:", err);
    }
  };

  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="[font-family:'Oswald',Helvetica] text-2xl font-bold uppercase tracking-tight text-black sm:text-3xl">
              Access Coupons
            </h1>
            <p className="[font-family:'Montserrat',Helvetica] text-sm text-[#6b7280]">
              Manage beta access codes and paywall bypasses.
            </p>
          </div>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#ef3e34] hover:bg-[#d9382e] text-white flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Coupon
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="[font-family:'Oswald',Helvetica] uppercase">New Access Coupon</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">Coupon Code</Label>
                  <Input 
                    id="code" 
                    value={newCoupon.code} 
                    onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                    placeholder="e.g. BETA2026"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="desc">Description</Label>
                  <Input 
                    id="desc" 
                    value={newCoupon.description} 
                    onChange={e => setNewCoupon({...newCoupon, description: e.target.value})}
                    placeholder="Beta tester access"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="max">Max Uses (Optional)</Label>
                    <Input 
                      id="max" 
                      type="number"
                      value={newCoupon.maxUses} 
                      onChange={e => setNewCoupon({...newCoupon, maxUses: e.target.value})}
                      placeholder="Unlimited"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input 
                      id="expiry" 
                      type="date"
                      value={newCoupon.expiresAt} 
                      onChange={e => setNewCoupon({...newCoupon, expiresAt: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox 
                    id="access" 
                    checked={newCoupon.grantFullAccess} 
                    onCheckedChange={(checked) => setNewCoupon({...newCoupon, grantFullAccess: !!checked})}
                  />
                  <Label htmlFor="access" className="font-medium">Grant Full Platform Access</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button 
                  className="bg-[#ef3e34] hover:bg-[#d9382e]" 
                  onClick={handleCreate}
                  disabled={isSubmitting || !newCoupon.code}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Coupon"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search codes or descriptions..." 
            className="pl-10 h-11 bg-white border-[#e5e7eb]"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="rounded-xl border border-[#e5e7eb] bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#f3f4f6] bg-[#f9fafb]">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Code</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Usage</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Access</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Expires</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3f4f6]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading coupons...
                    </td>
                  </tr>
                ) : filteredCoupons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      No coupons found.
                    </td>
                  </tr>
                ) : filteredCoupons.map((coupon) => (
                  <tr key={coupon._id} className="hover:bg-[#f9fafb] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#111827] flex items-center gap-2">
                          <Ticket className="w-3.5 h-3.5 text-[#ef3e34]" />
                          {coupon.code}
                        </span>
                        <span className="text-xs text-gray-500 line-clamp-1">{coupon.description || "No description"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {coupon.isActive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-500">
                          <XCircle className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase">
                          <span>{coupon.currentUses} Uses</span>
                          {coupon.maxUses && <span>Limit {coupon.maxUses}</span>}
                        </div>
                        <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#ef3e34]" 
                            style={{ width: `${coupon.maxUses ? Math.min((coupon.currentUses / coupon.maxUses) * 100, 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {coupon.grantFullAccess ? (
                        <span className="font-medium text-indigo-600">Full Access</span>
                      ) : (
                        <span className="text-gray-500">Standard</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {coupon.expiresAt ? (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(coupon.expiresAt), "MMM d, yyyy")}
                        </div>
                      ) : (
                        "Never"
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4 text-gray-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {coupon.isActive && (
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600"
                              onClick={() => handleDeactivate(coupon._id)}
                            >
                              <Power className="mr-2 h-4 w-4" />
                              Deactivate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => {
                            if (coupon.usedBy?.length > 0) {
                              alert(`Used by: ${coupon.usedBy.map((u: any) => u.organizationId).join(", ")}`);
                            } else {
                              alert("No usage recorded yet.");
                            }
                          }}>
                            <Users className="mr-2 h-4 w-4" />
                            View usage
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
