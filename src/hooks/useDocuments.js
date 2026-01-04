// src/hooks/useDocuments.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const TABLE = "documents";
const BUCKET = "documents";

function bytesToNice(bytes) {
  if (!bytes && bytes !== 0) return "—";
  const mb = bytes / 1024 / 1024;
  if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
  return `${mb.toFixed(1)} MB`;
}

function cleanType(t) {
  const v = String(t || "other").toLowerCase();
  const allowed = new Set(["insurance", "mot", "service", "tax", "other"]);
  return allowed.has(v) ? v : "other";
}

export function useDocuments() {
  const { user } = useAuth();

  const [documents, setDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setLoadingDocuments(true);

    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setLoadingDocuments(false);
    if (error) throw error;

    setDocuments(data || []);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setDocuments([]);
      return;
    }
    refresh().catch((e) => {
      console.error("Failed to load documents:", e);
      setDocuments([]);
    });
  }, [user?.id, refresh]);

  const uploadDocument = useCallback(
    async ({ file, vehicleId, name, type }) => {
      if (!user?.id) throw new Error("Not logged in.");
      if (!file) throw new Error("No file selected.");

      const fileName = String(file.name || "document").replace(/[^\w.\-() ]/g, "");
      const safeType = cleanType(type);
      const safeVehicle = String(vehicleId || "general");

      // Basic validation
      const maxMb = 10;
      if (file.size > maxMb * 1024 * 1024) {
        throw new Error(`File too large. Max ${maxMb}MB.`);
      }

      // Accept common docs/images (balanced)
      const allowedExt = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];
      const lower = fileName.toLowerCase();
      const okExt = allowedExt.some((ext) => lower.endsWith(ext));
      const mime = String(file.type || "").toLowerCase();
      const okMime =
        mime.includes("pdf") ||
        mime.startsWith("image/") ||
        mime === "application/octet-stream" ||
        mime === "";

      if (!okExt && !okMime) {
        throw new Error("Unsupported file. Upload PDF or an image (JPG/PNG/WEBP).");
      }

      // Create DB row first (so we have docId for stable path)
      const { data: created, error: insertErr } = await supabase
        .from(TABLE)
        .insert({
          user_id: user.id,
          vehicle_id: safeVehicle === "general" ? null : safeVehicle,
          name: name?.trim() || fileName,
          type: safeType,
          file_path: "PENDING",
          mime_type: mime || null,
          size_bytes: file.size || null,
        })
        .select("*")
        .single();

      if (insertErr) throw insertErr;

      const docId = created.id;
      const path = `${user.id}/${safeVehicle}/${docId}-${fileName}`;

      // Upload to Storage
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: true,
        contentType: mime || "application/octet-stream",
        cacheControl: "3600",
      });

      if (upErr) {
        // Cleanup DB row if upload failed
        await supabase.from(TABLE).delete().eq("id", docId).eq("user_id", user.id);
        throw upErr;
      }

      // Update DB row with file_path
      const { data: finalRow, error: updErr } = await supabase
        .from(TABLE)
        .update({ file_path: path })
        .eq("id", docId)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (updErr) throw updErr;

      // Update local state
      setDocuments((prev) => [finalRow, ...prev]);

      return finalRow;
    },
    [user?.id]
  );

  const deleteDocument = useCallback(
    async (docId) => {
      if (!user?.id) throw new Error("Not logged in.");

      const existing = documents.find((d) => String(d.id) === String(docId));
      if (!existing) return;

      // 1) Delete file from storage (ignore errors so we can still remove DB row)
      if (existing.file_path && existing.file_path !== "PENDING") {
        await supabase.storage.from(BUCKET).remove([existing.file_path]);
      }

      // 2) Delete DB row
      const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq("id", docId)
        .eq("user_id", user.id);

      if (error) throw error;

      setDocuments((prev) => prev.filter((d) => String(d.id) !== String(docId)));
    },
    [user?.id, documents]
  );

  const getDownloadUrl = useCallback(
    async (doc) => {
      if (!user?.id) throw new Error("Not logged in.");
      if (!doc?.file_path || doc.file_path === "PENDING") throw new Error("File not ready.");

      // Private bucket: use signed URL
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(doc.file_path, 60); // 60 seconds

      if (error) throw error;
      return data?.signedUrl;
    },
    [user?.id]
  );

  const helpers = useMemo(
    () => ({
      bytesToNice,
      cleanType,
    }),
    []
  );

  return {
    documents,
    loadingDocuments,
    refresh,
    uploadDocument,
    deleteDocument,
    getDownloadUrl,
    ...helpers,
  };
}