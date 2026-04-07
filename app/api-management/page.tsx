"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Key,
  Copy,
  Trash2,
  Plus,
  Shield,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";

interface ApiKey {
  keyId: string;
  name: string;
  description: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  lastUsedAt: string | null;
  usageCount: number;
}

interface UserData {
  Department: string;
  Firstname: string;
  Lastname: string;
}

export default function APIManagementPage() {
  const { userId } = useUser();
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showGeneratedKey, setShowGeneratedKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: {
      "products:read": true,
      "suppliers:read": true,
    },
  });

  // Check IT department access
  useEffect(() => {
    if (!userId) return;

    const checkAccess = async () => {
      try {
        const res = await fetch(`/api/users?id=${encodeURIComponent(userId)}`);
        if (!res.ok) throw new Error("Failed to fetch user");

        const userData = await res.json();
        setUser(userData);

        if (userData.Department !== "IT") {
          toast.error("Access Denied", {
            description: "This page is restricted to IT department only.",
          });
          router.push("/dashboard");
          return;
        }
      } catch (error) {
        console.error("Error checking access:", error);
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [userId, router]);

  // Fetch API keys
  const fetchApiKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/api-keys?action=list");
      if (!res.ok) throw new Error("Failed to fetch API keys");

      const data = await res.json();
      setApiKeys(data.keys || []);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      toast.error("Failed to load API keys");
    }
  }, []);

  useEffect(() => {
    if (user?.Department === "IT") {
      fetchApiKeys();
    }
  }, [user, fetchApiKeys]);

  const handleGenerateKey = async () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const permissions = Object.entries(formData.permissions)
        .filter(([_, enabled]) => enabled)
        .map(([perm]) => perm);

      const res = await fetch("/api/api-keys?action=generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          permissions,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate API key");
      }

      setGeneratedKey(data.apiKey);
      toast.success("API Key Generated", {
        description: data.message,
      });

      // Refresh the list
      fetchApiKeys();
    } catch (error: any) {
      toast.error("Error", { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!selectedKey) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/api-keys?action=revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId: selectedKey.keyId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to revoke API key");
      }

      toast.success("API Key Revoked", {
        description: data.message,
      });

      setIsRevokeDialogOpen(false);
      setSelectedKey(null);
      fetchApiKeys();
    } catch (error: any) {
      toast.error("Error", { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      permissions: {
        "products:read": true,
        "suppliers:read": true,
      },
    });
    setGeneratedKey(null);
    setShowGeneratedKey(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-gray-800 animate-spin" />
      </div>
    );
  }

  if (!user || user.Department !== "IT") {
    return null; // Will redirect
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="h-6 w-6" />
            API Key Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate and manage API keys for third-party integrations
          </p>
        </div>
        <Button onClick={() => { resetForm(); setIsGenerateDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Generate New Key
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              Active Keys
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiKeys.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-blue-500" />
              API Endpoints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <code className="bg-gray-100 px-2 py-1 rounded">/api/public-api?endpoint=products</code>
              <br />
              <code className="bg-gray-100 px-2 py-1 rounded">/api/public-api?endpoint=suppliers</code>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Security Notice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              API keys grant access to product and supplier data. Keep keys secure and rotate them regularly.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* API Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active API Keys</CardTitle>
          <CardDescription>Manage existing API keys and their permissions</CardDescription>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No API keys generated yet. Click &quot;Generate New Key&quot; to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.keyId}>
                    <TableCell>
                      <div className="font-medium">{key.name}</div>
                      {key.description && (
                        <div className="text-xs text-muted-foreground">{key.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {key.permissions.map((perm) => (
                          <Badge key={perm} variant="secondary" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{key.usageCount} requests</TableCell>
                    <TableCell>{formatDate(key.lastUsedAt)}</TableCell>
                    <TableCell>{formatDate(key.createdAt)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          setSelectedKey(key);
                          setIsRevokeDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Generate Key Dialog */}
      <Dialog
        open={isGenerateDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetForm();
          }
          setIsGenerateDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate New API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for third-party access to products and suppliers.
            </DialogDescription>
          </DialogHeader>

          {generatedKey ? (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Copy this key now!</p>
                    <p className="text-xs text-amber-700 mt-1">
                      This is the only time you will see the full API key. Store it securely.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Your API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showGeneratedKey ? "text" : "password"}
                      value={generatedKey}
                      readOnly
                      className="font-mono text-sm pr-20"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-8 top-0 h-full"
                      onClick={() => setShowGeneratedKey(!showGeneratedKey)}
                    >
                      {showGeneratedKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedKey)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => {
                    setIsGenerateDialogOpen(false);
                    resetForm();
                  }}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Key Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Production API Key"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What is this key used for?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="products-read"
                      checked={formData.permissions["products:read"]}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          permissions: { ...formData.permissions, "products:read": checked as boolean },
                        })
                      }
                    />
                    <Label htmlFor="products-read" className="font-normal">
                      products:read - Access product data
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="suppliers-read"
                      checked={formData.permissions["suppliers:read"]}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          permissions: { ...formData.permissions, "suppliers:read": checked as boolean },
                        })
                      }
                    />
                    <Label htmlFor="suppliers-read" className="font-normal">
                      suppliers:read - Access supplier data
                    </Label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleGenerateKey} disabled={isSubmitting || !formData.name.trim()}>
                  {isSubmitting ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="h-4 w-4 mr-2" />
                  )}
                  Generate Key
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke Key Dialog */}
      <Dialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Revoke API Key
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke the API key &quot;{selectedKey?.name}&quot;? This action cannot be undone.
              Any applications using this key will immediately lose access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRevokeDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevokeKey} disabled={isSubmitting}>
              {isSubmitting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Revoke Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
