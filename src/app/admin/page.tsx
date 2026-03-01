"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { AdminUserData } from "@/lib/firebase/admin-users";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Mail } from "lucide-react";

export default function AdminPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const targetUserEmail = searchParams.get("user");
  
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = await user?.getIdToken();
      const res = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  const handleStatusChange = async (email: string, newStatus: "active" | "pending") => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email, status: newStatus }),
      });
      
      if (!res.ok) throw new Error("Failed to update status");
      
      // Update local state
      setUsers(users.map(u => u.email === email ? { ...u, status: newStatus } : u));
    } catch (err: any) {
      alert("Error updating user status: " + err.message);
    }
  };

  const pendingUsers = useMemo(() => users.filter(u => u.status === "pending"), [users]);
  const activeUsers = useMemo(() => users.filter(u => u.status === "active"), [users]);

  // If redirected from email snippet
  useEffect(() => {
    if (targetUserEmail && users.length > 0) {
      const targetElement = document.getElementById(`user-${targetUserEmail}`);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
        targetElement.classList.add("ring-2", "ring-primary", "ring-offset-2");
        setTimeout(() => targetElement.classList.remove("ring-2", "ring-primary", "ring-offset-2"), 3000);
      }
    }
  }, [targetUserEmail, users]);

  if (loading) return <div>Loading users...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">Manage user access and system permissions.</p>
      </div>

      <div className="grid gap-6">
        <Card className="border-warning/50 shadow-sm">
          <CardHeader className="bg-warning/10 pb-4">
            <CardTitle className="flex items-center gap-2 text-warning-foreground">
              <Clock className="w-5 h-5 text-orange-500" />
              Pending Approvals ({pendingUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {pendingUsers.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No pending users.</div>
            ) : (
              <div className="divide-y relative">
                {pendingUsers.map(u => (
                  <div key={u.email} id={`user-${u.email}`} className="flex items-center justify-between p-4 px-6 transition-all duration-300">
                    <div className="flex flex-col gap-1">
                      <div className="font-medium flex items-center gap-2">
                        {u.name || "Unknown User"}
                        {u.email === targetUserEmail && <Badge variant="outline" className="text-primary border-primary">From Email Link</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3"/>{u.email}</div>
                      <div className="text-xs text-muted-foreground">Requested: {new Date(u.createdAt).toLocaleString()}</div>
                    </div>
                    <Button onClick={() => handleStatusChange(u.email, "active")} className="bg-green-600 hover:bg-green-700 text-white">
                      Approve (Active)
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Active Users ({activeUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activeUsers.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No active users found.</div>
            ) : (
              <div className="divide-y">
                {activeUsers.map(u => (
                  <div key={u.email} id={`user-${u.email}`} className="flex items-center justify-between p-4 px-6">
                    <div className="flex flex-col gap-1">
                      <div className="font-medium flex items-center gap-2">
                        {u.name || "Unknown User"}
                        {u.role === "admin" && <Badge className="bg-blue-600">Admin</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3"/>{u.email}</div>
                      {u.activatedAt && <div className="text-xs text-muted-foreground">Activated: {new Date(u.activatedAt).toLocaleString()}</div>}
                    </div>
                    {u.role !== "admin" && (
                      <Button variant="outline" onClick={() => handleStatusChange(u.email, "pending")} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        Revoke Access
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
