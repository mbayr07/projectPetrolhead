// src/pages/DocumentVault.jsx
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet";
import { Upload, File, Trash2, Download, Search, Eye, X } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDocuments } from "@/hooks/useDocuments";
import { useVehicles } from "@/hooks/useVehicles";
import { useToast } from "@/components/ui/use-toast";

function isPdf(doc) {
  const mime = String(doc?.mime_type || "").toLowerCase();
  const path = String(doc?.file_path || "").toLowerCase();
  return mime.includes("pdf") || path.endsWith(".pdf");
}

function isImage(doc) {
  const mime = String(doc?.mime_type || "").toLowerCase();
  const path = String(doc?.file_path || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  return [".png", ".jpg", ".jpeg", ".webp"].some((ext) => path.endsWith(ext));
}

export default function DocumentVault() {
  const {
    documents,
    loadingDocuments,
    uploadDocument,
    deleteDocument,
    getDownloadUrl,
    bytesToNice,
  } = useDocuments();

  const { vehicles } = useVehicles();
  const { toast } = useToast();

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ✅ Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const [filters, setFilters] = useState({
    q: "",
    vehicleId: "all",
    type: "all",
  });

  const [formData, setFormData] = useState({
    vehicleId: "",
    name: "",
    type: "insurance",
  });

  const documentTypes = {
    insurance: "Insurance",
    mot: "MOT Certificate",
    service: "Service Record",
    tax: "Tax Document",
    other: "Other",
  };

  const getVehicleName = (vehicleId) => {
    if (!vehicleId) return "General";
    const vehicle = vehicles.find((v) => String(v.id) === String(vehicleId));
    return vehicle ? vehicle.nickname : "Unknown Vehicle";
  };

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return (documents || []).filter((d) => {
      const vid = d.vehicle_id ? String(d.vehicle_id) : "general";
      const okVehicle = filters.vehicleId === "all" ? true : vid === String(filters.vehicleId);
      const okType = filters.type === "all" ? true : String(d.type || "other") === String(filters.type);

      if (!q) return okVehicle && okType;

      const hay = [d.name, d.type, getVehicleName(d.vehicle_id)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return okVehicle && okType && hay.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents, filters.vehicleId, filters.type, filters.q, vehicles]);

  const openPreview = async (doc) => {
    try {
      setPreviewDoc(doc);
      setPreviewUrl("");
      setPreviewOpen(true);
      setPreviewLoading(true);

      const url = await getDownloadUrl(doc);
      setPreviewUrl(url);
    } catch (err) {
      toast({
        title: "Preview failed",
        description: String(err?.message || err),
        variant: "destructive",
      });
      setPreviewOpen(false);
      setPreviewDoc(null);
      setPreviewUrl("");
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewDoc(null);
    setPreviewUrl("");
    setPreviewLoading(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = e.target.file?.files?.[0];

    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.vehicleId) {
      toast({
        title: "Pick a vehicle",
        description: "Please choose which vehicle this document belongs to.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      await uploadDocument({
        file,
        vehicleId: formData.vehicleId,
        name: formData.name,
        type: formData.type,
      });

      toast({
        title: "Document uploaded",
        description: "Saved to your Document Vault.",
      });

      setUploadDialogOpen(false);
      setFormData({ vehicleId: "", name: "", type: "insurance" });
      e.target.reset();
    } catch (err) {
      toast({
        title: "Upload failed",
        description: String(err?.message || err),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDocument(id);
      toast({ title: "Document deleted", description: "Removed from your vault." });

      // If deleting the one currently previewing, close preview
      if (String(previewDoc?.id) === String(id)) {
        closePreview();
      }
    } catch (err) {
      toast({
        title: "Delete failed",
        description: String(err?.message || err),
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (doc) => {
    try {
      const url = await getDownloadUrl(doc);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast({
        title: "Download failed",
        description: String(err?.message || err),
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <Helmet>
        <title>Document Vault - AutoMateAI</title>
        <meta
          name="description"
          content="Securely store and manage all your vehicle documents in one place. Upload insurance certificates, MOT documents, and service records."
        />
      </Helmet>

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Document Vault
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tap any document to preview it instantly.
            </p>
          </div>

          <Button
            onClick={() => setUploadDialogOpen(true)}
            className="bg-gradient-to-r from-primary to-secondary h-9 px-3 text-sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={filters.q}
              onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
              placeholder="Search documents…"
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select value={filters.vehicleId} onValueChange={(v) => setFilters((p) => ({ ...p, vehicleId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="All vehicles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All vehicles</SelectItem>
                <SelectItem value="general">General</SelectItem>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.nickname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.type} onValueChange={(v) => setFilters((p) => ({ ...p, type: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(documentTypes).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        {loadingDocuments ? (
          <div className="text-sm text-muted-foreground">Loading documents…</div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-3">
              <File className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No documents yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload your first document to get started.
            </p>
            <Button onClick={() => setUploadDialogOpen(true)} className="bg-gradient-to-r from-primary to-secondary">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.05, 0.25) }}
                className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => openPreview(doc)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") openPreview(doc);
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0">
                      <File className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{doc.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {getVehicleName(doc.vehicle_id)}
                      </p>
                    </div>
                  </div>

                  {/* Actions — stop propagation so card tap still previews */}
                  <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => openPreview(doc)} title="Preview">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} title="Download / open">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-500 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{documentTypes[doc.type] || "Other"}</span>
                  <span>{bytesToNice(doc.size_bytes)}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Uploaded: {new Date(doc.created_at).toLocaleDateString("en-GB")}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Upload dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <Label>Vehicle</Label>
              <Select
                value={formData.vehicleId}
                onValueChange={(value) => setFormData((p) => ({ ...p, vehicleId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                      {vehicle.nickname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Document Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Insurance Certificate 2026"
              />
              <p className="text-xs text-muted-foreground mt-1">Leave blank to use the file name.</p>
            </div>

            <div>
              <Label>Document Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData((p) => ({ ...p, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(documentTypes).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>File</Label>
              <Input id="file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required />
              <p className="text-xs text-muted-foreground mt-1">PDF or images. Max 10MB.</p>
            </div>

            <Button type="submit" disabled={uploading} className="w-full bg-gradient-to-r from-primary to-secondary">
              {uploading ? "Uploading…" : "Upload Document"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ✅ Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={(v) => (v ? null : closePreview())}>
        <DialogContent className="max-w-[860px] w-[95vw] max-h-[90vh] overflow-hidden p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <div className="min-w-0">
              <div className="font-semibold truncate">{previewDoc?.name || "Preview"}</div>
              <div className="text-xs text-muted-foreground truncate">
                {previewDoc ? `${documentTypes[previewDoc.type] || "Other"} • ${getVehicleName(previewDoc.vehicle_id)}` : ""}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {previewDoc && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(previewDoc)}
                    className="h-8"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Open
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={closePreview}
                    className="h-8 w-8"
                    aria-label="Close preview"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="bg-background">
            {previewLoading ? (
              <div className="h-[70vh] flex items-center justify-center text-sm text-muted-foreground">
                Loading preview…
              </div>
            ) : !previewUrl ? (
              <div className="h-[70vh] flex items-center justify-center text-sm text-muted-foreground">
                No preview available.
              </div>
            ) : isImage(previewDoc) ? (
              <div className="h-[70vh] overflow-auto">
                <img
                  src={previewUrl}
                  alt={previewDoc?.name || "Document"}
                  className="w-full h-auto block"
                />
              </div>
            ) : isPdf(previewDoc) ? (
              <div className="h-[70vh]">
                <iframe
                  title={previewDoc?.name || "PDF Preview"}
                  src={previewUrl}
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="h-[70vh] flex flex-col items-center justify-center text-sm text-muted-foreground gap-3">
                <div>This file type can’t be previewed yet.</div>
                <Button variant="outline" onClick={() => handleDownload(previewDoc)}>
                  <Download className="h-4 w-4 mr-2" />
                  Open file
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}