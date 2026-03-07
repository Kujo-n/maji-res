"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { AdminUserData } from "@/lib/firebase/admin-users";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Mail, Shield, ShieldOff } from "lucide-react";
import { THREAD_LIMITS, MESSAGE_LIMITS } from "@/lib/constants/limits";

export default function AdminPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const targetUserEmail = searchParams.get("user");
  
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

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
      setUsers(prev => prev.map(u => u.email === email ? { ...u, status: newStatus } : u));
    } catch (err: any) {
      alert("Error updating user status: " + err.message);
    }
  };

  const handleRoleChange = async (email: string, newRole: "admin" | "user") => {
    // ダウングレード時は確認ダイアログを表示
    if (newRole === "user") {
      const confirmed = window.confirm(
        `ロール変更の確認\n\n` +
        `このユーザーのロールを Admin から User に変更します。\n\n` +
        `以下の上限が変更されます:\n` +
        `• スレッド数: ${THREAD_LIMITS.admin} → ${THREAD_LIMITS.user}\n` +
        `• メッセージ数/スレッド: ${MESSAGE_LIMITS.admin} → ${MESSAGE_LIMITS.user}\n\n` +
        `上限を超える既存データは削除されます。\n` +
        `この操作は元に戻せません。続行しますか？`
      );
      if (!confirmed) return;
    }

    setUpdatingRole(email);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: "updateRole", email, role: newRole }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update role");
      }

      const data = await res.json();
      
      // Update local state
      setUsers(prev => prev.map(u => u.email === email ? { ...u, role: newRole } : u));

      // ダウングレード時に削除されたデータがあれば通知
      if (data.cleanup && (data.cleanup.deletedThreads > 0 || data.cleanup.deletedMessages > 0)) {
        alert(
          `ロールを変更しました。\n` +
          `削除されたスレッド: ${data.cleanup.deletedThreads}件\n` +
          `削除されたメッセージ: ${data.cleanup.deletedMessages}件`
        );
      }
    } catch (err: any) {
      alert("Error updating user role: " + err.message);
    } finally {
      setUpdatingRole(null);
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
                        {u.email === user?.email && <Badge variant="outline" className="text-muted-foreground">あなた</Badge>}
                        {u.currentMonthTokens !== undefined && (
                          <Badge variant="outline" className="ml-2 text-xs bg-muted/50">
                            今月のトークン: {u.currentMonthTokens.toLocaleString()}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3"/>{u.email}</div>
                      {u.activatedAt && <div className="text-xs text-muted-foreground">Activated: {new Date(u.activatedAt).toLocaleString()}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* ロール変更ボタン（自分自身は除外） */}
                      {u.email !== user?.email && (
                        u.role === "user" ? (
                          <Button
                            variant="outline"
                            onClick={() => handleRoleChange(u.email, "admin")}
                            disabled={updatingRole === u.email}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                          >
                            <Shield className="mr-1 h-4 w-4" />
                            Admin に昇格
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => handleRoleChange(u.email, "user")}
                            disabled={updatingRole === u.email}
                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950"
                          >
                            <ShieldOff className="mr-1 h-4 w-4" />
                            User に降格
                          </Button>
                        )
                      )}
                      {u.email !== user?.email && u.role !== "admin" && (
                        <Button variant="outline" onClick={() => handleStatusChange(u.email, "pending")} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          Revoke Access
                        </Button>
                      )}
                    </div>
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

