// src/hooks/useCrashReports.js
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const TABLE_REPORTS = "crash_reports";
const TABLE_PHOTOS = "crash_report_photos";
const BUCKET = "crash-photos";

// small helpers
function isRealFile(x) {
  return (
    x &&
    typeof x === "object" &&
    (x instanceof File ||
      (typeof x.name === "string" &&
        typeof x.size === "number" &&
        typeof x.arrayBuffer === "function"))
  );
}

function cleanExt(file) {
  const name = String(file?.name || "").toLowerCase();
  const m = name.match(/\.([a-z0-9]+)$/i);
  let ext = (m?.[1] || "").toLowerCase();
  if (ext === "jpeg") ext = "jpg";
  return ext;
}

function guessFinalExt(file) {
  const mime = String(file?.type || "").toLowerCase();
  const ext = cleanExt(file);

  // block HEIC early
  if (mime.includes("heic") || mime.includes("heif") || ext === "heic" || ext === "heif") {
    throw new Error("HEIC/HEIF isn’t supported yet. Please export as JPG or PNG.");
  }

  const allowed = new Set(["png", "jpg", "webp", "pdf"]);
  if (allowed.has(ext)) return ext;

  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("pdf")) return "pdf";
  return "jpg";
}

function guessContentType(file, ext) {
  const mime = String(file?.type || "").toLowerCase();
  if (mime) return mime;

  if (ext === "png") return "image/png";
  if (ext === "jpg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "pdf") return "application/pdf";
  return "application/octet-stream";
}

export function useCrashReports() {
  const { user } = useAuth();

  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const refreshReports = useCallback(async () => {
    if (!user?.id) return;
    setLoadingReports(true);

    const { data, error } = await supabase
      .from(TABLE_REPORTS)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setLoadingReports(false);
    if (error) throw error;

    setReports(data || []);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setReports([]);
      return;
    }
    refreshReports().catch((e) => console.error("Failed to load crash reports:", e));
  }, [user?.id, refreshReports]);

  const createCrashReport = useCallback(
    async (payload) => {
      if (!user?.id) throw new Error("Not logged in.");

      const insertPayload = {
        user_id: user.id,
        title: payload?.title ?? "Crash report",
        notes: payload?.notes ?? "",
        occurred_at: payload?.occurred_at ?? null,
        location_text: payload?.location_text ?? null,
        lat: payload?.lat ?? null,
        lng: payload?.lng ?? null,
        is_injuries: !!payload?.is_injuries,
        called_999: !!payload?.called_999,
        my_details: payload?.my_details ?? {},
        other_details: payload?.other_details ?? {},
        extras: payload?.extras ?? {},
      };

      const { data, error } = await supabase
        .from(TABLE_REPORTS)
        .insert(insertPayload)
        .select("*")
        .single();

      if (error) throw error;

      setReports((prev) => [data, ...prev]);
      return data;
    },
    [user?.id]
  );

  const updateCrashReport = useCallback(
    async (id, updates) => {
      if (!user?.id) throw new Error("Not logged in.");
      if (!id) throw new Error("report id is required");

      const patch = { ...updates };
      delete patch.user_id;

      const { data, error } = await supabase
        .from(TABLE_REPORTS)
        .update(patch)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (error) throw error;

      setReports((prev) => prev.map((r) => (String(r.id) === String(id) ? data : r)));
      return data;
    },
    [user?.id]
  );

  const deleteCrashReport = useCallback(
    async (id) => {
      if (!user?.id) throw new Error("Not logged in.");
      if (!id) throw new Error("report id is required");

      // delete photos (db rows + storage objects)
      const { data: photos } = await supabase
        .from(TABLE_PHOTOS)
        .select("path")
        .eq("report_id", id)
        .eq("user_id", user.id);

      const paths = (photos || []).map((p) => p.path).filter(Boolean);
      if (paths.length) {
        await supabase.storage.from(BUCKET).remove(paths);
      }

      await supabase.from(TABLE_PHOTOS).delete().eq("report_id", id).eq("user_id", user.id);

      const { error } = await supabase
        .from(TABLE_REPORTS)
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setReports((prev) => prev.filter((r) => String(r.id) !== String(id)));
    },
    [user?.id]
  );

  // -------------------------
  // Photos
  // -------------------------

  const uploadCrashPhoto = useCallback(
    async (reportId, file) => {
      if (!user?.id) throw new Error("Not logged in.");
      if (!reportId) throw new Error("reportId is required.");
      if (!isRealFile(file)) throw new Error("No file provided.");

      // allow images (and optionally pdfs if you want)
      const mime = String(file.type || "").toLowerCase();
      const ext = guessFinalExt(file); // throws on HEIC
      const isAllowed =
        mime.startsWith("image/") ||
        ext === "png" ||
        ext === "jpg" ||
        ext === "webp";

      if (!isAllowed) {
        throw new Error(`Please upload an image (JPG/PNG/WEBP). Got: "${file?.name}" "${file?.type}"`);
      }

      if (file.size > 8 * 1024 * 1024) {
        throw new Error("Max 8MB per photo.");
      }

      const contentType = guessContentType(file, ext);
      const path = `${user.id}/${reportId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType, cacheControl: "3600" });

      if (uploadError) throw uploadError;

      // store row in DB
      const { data: row, error: rowError } = await supabase
        .from(TABLE_PHOTOS)
        .insert({
          report_id: reportId,
          user_id: user.id,
          bucket: BUCKET,
          path,
          file_name: file.name || null,
          content_type: contentType || null,
          size_bytes: file.size || null,
        })
        .select("*")
        .single();

      if (rowError) throw rowError;

      return row;
    },
    [user?.id]
  );

  const listCrashPhotos = useCallback(
    async (reportId) => {
      if (!user?.id) throw new Error("Not logged in.");
      if (!reportId) throw new Error("reportId is required.");

      const { data, error } = await supabase
        .from(TABLE_PHOTOS)
        .select("*")
        .eq("report_id", reportId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    [user?.id]
  );

  // Signed URL for private bucket preview
  const getCrashPhotoSignedUrl = useCallback(async (path, expiresSeconds = 60 * 10) => {
    if (!path) return "";

    const { data, error } = await supabase
      .storage
      .from(BUCKET)
      .createSignedUrl(path, expiresSeconds);

    if (error) throw error;
    return data?.signedUrl || "";
  }, []);

  return {
    reports,
    loadingReports,
    refreshReports,

    createCrashReport,
    updateCrashReport,
    deleteCrashReport,

    uploadCrashPhoto,
    listCrashPhotos,
    getCrashPhotoSignedUrl,
  };
}