// src/pages/Crash.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import {
  AlertTriangle,
  PhoneCall,
  MapPin,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Camera,
  Copy,
  Save,
  FileText,
  Image as ImageIcon,
  Plus,
  Loader2,
  X,
} from "lucide-react";

import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useCrashReports } from "@/hooks/useCrashReports";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function nowIso() {
  return new Date().toISOString();
}

function niceDateTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso || "");
  }
}

function safeText(s) {
  return String(s || "").trim();
}

function buildShareText(my, other, meta) {
  const lines = [];
  lines.push("AutoMateAI Crash Details");
  lines.push(`Date/time: ${niceDateTime(meta.occurred_at || meta.created_at || meta.started_at)}`);

  if (meta.location?.lat && meta.location?.lng) {
    lines.push(`Location: ${meta.location.lat}, ${meta.location.lng}`);
    if (meta.location?.mapsUrl) lines.push(`Maps: ${meta.location.mapsUrl}`);
  } else if (meta.location_text) {
    lines.push(`Location: ${meta.location_text}`);
  }

  lines.push("");
  lines.push("My details:");
  lines.push(`Name: ${my.name || "—"}`);
  lines.push(`Phone: ${my.phone || "—"}`);
  lines.push(`Vehicle reg: ${my.vrm || "—"}`);
  lines.push(`Make/model/colour: ${[my.makeModel, my.colour].filter(Boolean).join(" / ") || "—"}`);
  lines.push(`Insurer: ${my.insurer || "—"}`);
  lines.push(`Policy no: ${my.policy || "—"}`);

  lines.push("");
  lines.push("Other driver details:");
  lines.push(`Name: ${other.name || "—"}`);
  lines.push(`Phone: ${other.phone || "—"}`);
  lines.push(`Vehicle reg: ${other.vrm || "—"}`);
  lines.push(`Make/model/colour: ${[other.makeModel, other.colour].filter(Boolean).join(" / ") || "—"}`);
  lines.push(`Insurer: ${other.insurer || "—"}`);
  lines.push(`Policy no: ${other.policy || "—"}`);

  lines.push("");
  lines.push("Notes:");
  lines.push(meta.notes || "—");
  return lines.join("\n");
}

function useGeolocationOnce(when = true) {
  const [state, setState] = useState({
    status: "idle", // idle | loading | ok | error
    lat: null,
    lng: null,
    accuracy: null,
    error: null,
    mapsUrl: null,
  });

  useEffect(() => {
    if (!when) return;
    if (!navigator?.geolocation) {
      setState((p) => ({
        ...p,
        status: "error",
        error: "Geolocation not supported on this device/browser.",
      }));
      return;
    }

    setState((p) => ({ ...p, status: "loading" }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
        setState({ status: "ok", lat, lng, accuracy, error: null, mapsUrl });
      },
      (err) => {
        setState((p) => ({
          ...p,
          status: "error",
          error: err?.message || "Location permission denied or unavailable.",
        }));
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 2000 }
    );
  }, [when]);

  return state;
}

const STEPS = [
  { id: "safety", title: "Safety first" },
  { id: "emergency", title: "Emergency services" },
  { id: "details", title: "Exchange details" },
  { id: "evidence", title: "Photos & evidence" },
  { id: "report", title: "Save report" },
];

export default function Crash() {
  const { toast } = useToast();
  const { user } = useAuth();
  const loc = useGeolocationOnce(true);

  const {
    reports,
    loadingReports,
    refreshReports,
    createCrashReport,
    updateCrashReport,
    uploadCrashPhoto,
    listCrashPhotos,
    getCrashPhotoSignedUrl,
  } = useCrashReports();

  const MY_KEY = useMemo(
    () => (user?.id ? `automateai_my_details_${user.id}` : "automateai_my_details"),
    [user?.id]
  );

  // Active report id (Supabase row id)
  const [activeReportId, setActiveReportId] = useState("");

  // Stepper + local UI state (we save to DB on “Save”)
  const [stepIndex, setStepIndex] = useState(0);
  const [isSafe, setIsSafe] = useState(null);
  const [needsHelp, setNeedsHelp] = useState(false);
  const [notes, setNotes] = useState("");

  const [my, setMy] = useState(() => {
    try {
      const saved = localStorage.getItem(MY_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      name: user?.name || "",
      phone: "",
      vrm: "",
      makeModel: "",
      colour: "",
      insurer: "",
      policy: "",
    };
  });

  const [other, setOther] = useState(() => ({
    name: "",
    phone: "",
    vrm: "",
    makeModel: "",
    colour: "",
    insurer: "",
    policy: "",
  }));

  // Photo previews coming from Supabase (signed URLs)
  // { id, path, url, file_name, created_at }
  const [photos, setPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const takeInputRef = useRef(null);
  const chooseInputRef = useRef(null);

  const step = STEPS[stepIndex];
  const progressPct = Math.round(((stepIndex + 1) / STEPS.length) * 100);
  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  // pick default active report once reports load
  useEffect(() => {
    if (!user?.id) return;
    if (loadingReports) return;

    if (reports?.length && !activeReportId) {
      setActiveReportId(String(reports[0].id));
    }
  }, [user?.id, loadingReports, reports, activeReportId]);

  const loadReportIntoState = async (reportId) => {
    const r = reports.find((x) => String(x.id) === String(reportId));
    if (!r) return;

    setStepIndex(r?.extras?.stepIndex ?? 0);
    setIsSafe(typeof r?.extras?.isSafe === "boolean" ? r.extras.isSafe : null);
    setNeedsHelp(!!(r?.extras?.needsHelp));
    setNotes(r?.notes ?? "");

    setMy((prev) => ({ ...prev, ...(r?.my_details || {}) }));
    setOther((prev) => ({ ...prev, ...(r?.other_details || {}) }));

    // photos
    setLoadingPhotos(true);
    try {
      const rows = await listCrashPhotos(r.id);
      const withUrls = await Promise.all(
        (rows || []).map(async (p) => {
          const url = await getCrashPhotoSignedUrl(p.path, 60 * 10);
          return {
            id: p.id,
            path: p.path,
            url,
            file_name: p.file_name,
            created_at: p.created_at,
          };
        })
      );
      setPhotos(withUrls);
    } catch (e) {
      console.error(e);
      toast({
        title: "Failed to load photos",
        description: String(e?.message || e),
        variant: "destructive",
      });
      setPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  };

  // When active report changes, load its content + photos
  useEffect(() => {
    if (!activeReportId) return;
    loadReportIntoState(activeReportId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeReportId]);

  const startNewCrash = async () => {
    try {
      const payload = {
        title: `Crash report • ${new Date().toLocaleDateString("en-GB")}`,
        notes: "",
        occurred_at: nowIso(),
        location_text: null,
        lat: loc.status === "ok" ? loc.lat : null,
        lng: loc.status === "ok" ? loc.lng : null,
        is_injuries: false,
        called_999: false,
        my_details: my || {},
        other_details: {},
        extras: { stepIndex: 0, isSafe: null, needsHelp: false },
      };

      const created = await createCrashReport(payload);
      await refreshReports();

      setActiveReportId(String(created.id));

      // reset UI state
      setStepIndex(0);
      setIsSafe(null);
      setNeedsHelp(false);
      setOther({
        name: "",
        phone: "",
        vrm: "",
        makeModel: "",
        colour: "",
        insurer: "",
        policy: "",
      });
      setNotes("");
      setPhotos([]);

      toast({ title: "New crash started", description: "Created a new crash report." });
    } catch (e) {
      toast({
        title: "Could not create crash report",
        description: String(e?.message || e),
        variant: "destructive",
      });
    }
  };

  const call999 = () => {
    window.location.href = "tel:999";
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: "Copied to clipboard." });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not access clipboard on this device.",
        variant: "destructive",
      });
    }
  };

  const saveMyDetails = () => {
    try {
      localStorage.setItem(MY_KEY, JSON.stringify(my));
      toast({ title: "Saved", description: "Your details are saved for next time." });
    } catch {
      toast({
        title: "Save failed",
        description: "Could not save details on this device.",
        variant: "destructive",
      });
    }
  };

  const saveToSupabase = async () => {
    if (!activeReportId) {
      toast({
        title: "No crash selected",
        description: "Create a crash report first.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        notes: safeText(notes),
        my_details: my || {},
        other_details: other || {},
        extras: {
          stepIndex,
          isSafe,
          needsHelp,
        },
        // keep latest location snapshot (optional)
        lat: loc.status === "ok" ? loc.lat : null,
        lng: loc.status === "ok" ? loc.lng : null,
        location_text: null,
      };

      await updateCrashReport(activeReportId, payload);

      toast({ title: "Saved", description: "Crash report saved to Supabase." });
    } catch (e) {
      toast({
        title: "Save failed",
        description: String(e?.message || e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const onPickPhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    if (!activeReportId) {
      toast({
        title: "Create a report first",
        description: "Tap “New” to create a crash report, then add photos.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      for (const file of files.slice(0, 10)) {
        const row = await uploadCrashPhoto(activeReportId, file);
        const url = await getCrashPhotoSignedUrl(row.path, 60 * 10);

        setPhotos((prev) => [
          ...prev,
          {
            id: row.id,
            path: row.path,
            url,
            file_name: row.file_name,
            created_at: row.created_at,
          },
        ]);
      }

      toast({ title: "Uploaded", description: "Photo(s) saved to your crash report." });
    } catch (e) {
      console.error(e);
      toast({
        title: "Upload failed",
        description: String(e?.message || e),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const exportSummary = () => {
    const r = reports.find((x) => String(x.id) === String(activeReportId));

    const meta = {
      started_at: r?.created_at || nowIso(),
      occurred_at: r?.occurred_at || null,
      created_at: r?.created_at || null,
      location_text: r?.location_text || null,
      location:
        loc.status === "ok"
          ? { lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy, mapsUrl: loc.mapsUrl }
          : null,
      notes: safeText(notes),
    };

    const text = buildShareText(my, other, meta);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `AutoMateAI-Crash-Report-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    toast({ title: "Exported", description: "Downloaded report summary." });
  };

  const shareText = useMemo(() => {
    const r = reports.find((x) => String(x.id) === String(activeReportId));
    const meta = {
      started_at: r?.created_at || nowIso(),
      occurred_at: r?.occurred_at || null,
      created_at: r?.created_at || null,
      location_text: r?.location_text || null,
      location:
        loc.status === "ok"
          ? { lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy, mapsUrl: loc.mapsUrl }
          : null,
      notes: safeText(notes),
    };
    return buildShareText(my, other, meta);
  }, [reports, activeReportId, loc.status, loc.lat, loc.lng, loc.accuracy, loc.mapsUrl, notes, my, other]);

  return (
    <Layout>
      <Helmet>
        <title>I had a crash - AutoMateAI</title>
        <meta
          name="description"
          content="Guided crash checklist to help you stay safe and handle the immediate aftermath of a road accident (UK)."
        />
      </Helmet>

      <div className="space-y-4">
        {/* Top emergency card */}
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold leading-tight text-red-100">I had a crash</h1>
              <p className="text-sm text-red-100/70 mt-1">Keep calm. Follow the steps. (UK focused)</p>

              {/* ✅ Supabase report selector */}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1">
                  <Select
                    value={activeReportId}
                    onValueChange={(v) => setActiveReportId(v)}
                    disabled={loadingReports || !reports?.length}
                  >
                    <SelectTrigger className="h-10 bg-card/50 border-border">
                      <SelectValue placeholder={loadingReports ? "Loading reports…" : "Select crash…"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(reports || []).map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.title || "Crash report"} • {niceDateTime(r.occurred_at || r.created_at)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="button" variant="destructive" className="h-10 px-3" onClick={startNewCrash}>
                  <Plus className="h-4 w-4 mr-2" />
                  New
                </Button>
              </div>

              {!reports?.length && !loadingReports && (
                <div className="mt-2 text-xs text-red-100/70">
                  No crash reports yet. Tap <span className="font-semibold">New</span> to create one.
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-border bg-card/40 p-3">
            <div className="text-sm font-semibold">Quick reminder</div>
            <div className="text-sm text-muted-foreground mt-1">
              Don’t admit fault at the scene. Exchange details, take evidence, and let insurers decide.
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {loc.status === "loading" && <span className="text-muted-foreground">Getting location…</span>}
              {loc.status === "error" && <span className="text-muted-foreground">Location unavailable</span>}
              {loc.status === "ok" && (
                <span className="text-muted-foreground">
                  {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}{" "}
                  <span className="opacity-70">(±{Math.round(loc.accuracy)}m)</span>
                </span>
              )}
            </div>

            {loc.status === "ok" && (
              <Button variant="outline" size="sm" onClick={() => window.open(loc.mapsUrl, "_blank", "noopener,noreferrer")}>
                Open map
              </Button>
            )}
          </div>
        </div>

        {/* Stepper */}
        <div className="rounded-2xl border border-border bg-card/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">
                Step {stepIndex + 1} of {STEPS.length}
              </div>
              <div className="text-lg font-semibold">{step.title}</div>
            </div>
            <div className="text-xs text-muted-foreground">{progressPct}%</div>
          </div>

          <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="mt-4">
            {step.id === "safety" && (
              <div className="space-y-3">
                <div className="text-base font-semibold">Are you and others safe?</div>
                <div className="text-sm text-muted-foreground">
                  Stop the vehicle if you haven’t already. Turn on hazard lights. If possible, move to a safe place.
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Button
                    type="button"
                    className="h-12 text-base bg-gradient-to-r from-primary to-secondary"
                    onClick={() => {
                      setIsSafe(true);
                      setNeedsHelp(false);
                      goNext();
                    }}
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    I’m safe
                  </Button>

                  <Button
                    type="button"
                    variant="destructive"
                    className="h-12 text-base"
                    onClick={() => {
                      setIsSafe(false);
                      setNeedsHelp(true);
                      setStepIndex(1);
                    }}
                  >
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    I need help
                  </Button>
                </div>
              </div>
            )}

            {step.id === "emergency" && (
              <div className="space-y-3">
                <div className="text-base font-semibold">Emergency services</div>
                <div className="text-sm text-muted-foreground">
                  {needsHelp
                    ? "If anyone is injured or there’s danger (fire, blocked road, serious damage), call emergency services now."
                    : "If there are no injuries, stay calm and continue. If unsure, call for help."}
                </div>

                <Button type="button" variant="destructive" className="h-14 w-full text-base" onClick={call999}>
                  <PhoneCall className="h-5 w-5 mr-2" />
                  Call 999 now
                </Button>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button variant="outline" className="h-11" onClick={goBack}>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button className="h-11 bg-gradient-to-r from-primary to-secondary" onClick={goNext}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {step.id === "details" && (
              <div className="space-y-4">
                <div className="text-base font-semibold">Exchange details</div>
                <div className="text-sm text-muted-foreground">
                  Collect the other driver’s details. Save your own once and reuse next time.
                </div>

                <div className="rounded-xl border border-border bg-card/50 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">My details</div>
                    <Button variant="outline" size="sm" onClick={saveMyDetails}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label>Name</Label>
                      <Input value={my.name} onChange={(e) => setMy((p) => ({ ...p, name: e.target.value }))} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Phone</Label>
                        <Input value={my.phone} onChange={(e) => setMy((p) => ({ ...p, phone: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Vehicle reg</Label>
                        <Input
                          value={my.vrm}
                          onChange={(e) => setMy((p) => ({ ...p, vrm: e.target.value.toUpperCase() }))}
                          className="uppercase"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Make / model</Label>
                        <Input value={my.makeModel} onChange={(e) => setMy((p) => ({ ...p, makeModel: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Colour</Label>
                        <Input value={my.colour} onChange={(e) => setMy((p) => ({ ...p, colour: e.target.value }))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Insurer</Label>
                        <Input value={my.insurer} onChange={(e) => setMy((p) => ({ ...p, insurer: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Policy no</Label>
                        <Input value={my.policy} onChange={(e) => setMy((p) => ({ ...p, policy: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card/50 p-3 space-y-3">
                  <div className="font-semibold">Other driver</div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label>Name</Label>
                      <Input value={other.name} onChange={(e) => setOther((p) => ({ ...p, name: e.target.value }))} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Phone</Label>
                        <Input value={other.phone} onChange={(e) => setOther((p) => ({ ...p, phone: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Vehicle reg</Label>
                        <Input
                          value={other.vrm}
                          onChange={(e) => setOther((p) => ({ ...p, vrm: e.target.value.toUpperCase() }))}
                          className="uppercase"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Make / model</Label>
                        <Input value={other.makeModel} onChange={(e) => setOther((p) => ({ ...p, makeModel: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Colour</Label>
                        <Input value={other.colour} onChange={(e) => setOther((p) => ({ ...p, colour: e.target.value }))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Insurer</Label>
                        <Input value={other.insurer} onChange={(e) => setOther((p) => ({ ...p, insurer: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Policy no</Label>
                        <Input value={other.policy} onChange={(e) => setOther((p) => ({ ...p, policy: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                </div>

                <Button type="button" variant="outline" className="h-11 w-full" onClick={() => copyToClipboard(shareText)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy shareable details
                </Button>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button variant="outline" className="h-11" onClick={goBack}>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button className="h-11 bg-gradient-to-r from-primary to-secondary" onClick={goNext}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {step.id === "evidence" && (
              <div className="space-y-4">
                <div className="text-base font-semibold">Take photos & evidence</div>
                <div className="text-sm text-muted-foreground">
                  Photograph damage (multiple angles), road position/layout, skid marks/signs, and weather conditions.
                </div>

                <div className="rounded-xl border border-border bg-card/50 p-3">
                  <Label className="block mb-2">Add photos</Label>

                  <input
                    ref={takeInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={onPickPhotos}
                  />
                  <input
                    ref={chooseInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={onPickPhotos}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      className="h-12 bg-gradient-to-r from-primary to-secondary"
                      onClick={() => takeInputRef.current?.click()}
                      disabled={uploading || !activeReportId}
                    >
                      {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
                      Take photo
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="h-12"
                      onClick={() => chooseInputRef.current?.click()}
                      disabled={uploading || !activeReportId}
                    >
                      {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-2" />}
                      Choose
                    </Button>
                  </div>

                  {!activeReportId && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Create a crash report first (tap <span className="font-semibold">New</span>).
                    </div>
                  )}

                  {loadingPhotos ? (
                    <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading photos…
                    </div>
                  ) : photos.length > 0 ? (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {photos.map((p) => (
                        <div key={p.id} className="relative rounded-lg overflow-hidden border border-border">
                          <img src={p.url} alt={p.file_name || "Crash photo"} className="h-24 w-full object-cover" />
                          <div className="absolute bottom-1 left-1 rounded bg-black/55 text-white text-[10px] px-1.5 py-0.5">
                            Saved
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-muted-foreground">No photos yet.</div>
                  )}

                  <div className="text-xs text-muted-foreground mt-2">
                    If “Take photo” shows a black screen on your device, use “Choose”.
                    (Some browsers have camera bugs with capture mode.)
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card/50 p-3">
                  <Label className="block mb-2">Notes (optional)</Label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    placeholder="What happened? Road conditions, witness names, anything important…"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button variant="outline" className="h-11" onClick={goBack}>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button className="h-11 bg-gradient-to-r from-primary to-secondary" onClick={goNext}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {step.id === "report" && (
              <div className="space-y-4">
                <div className="text-base font-semibold">Notify insurance & save report</div>
                <div className="text-sm text-muted-foreground">
                  Save to Supabase (so it appears in your crash dropdown). Export a summary if needed.
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Button variant="outline" className="h-11" onClick={() => copyToClipboard(shareText)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy report summary
                  </Button>

                  <Button variant="outline" className="h-11" onClick={exportSummary}>
                    <FileText className="h-4 w-4 mr-2" />
                    Download summary (.txt)
                  </Button>

                  <Button
                    className="h-11 bg-gradient-to-r from-primary to-secondary"
                    onClick={saveToSupabase}
                    disabled={saving || !activeReportId}
                  >
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save to Supabase
                  </Button>

                  <Button type="button" variant="destructive" className="h-12" onClick={call999}>
                    <PhoneCall className="h-5 w-5 mr-2" />
                    Call 999
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button variant="outline" className="h-11" onClick={goBack}>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    className="h-11 bg-gradient-to-r from-primary to-secondary"
                    onClick={() => toast({ title: "Done", description: "You can come back any time. Stay safe." })}
                  >
                    Finish
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground px-1">
          Tip: If safe, record witness contact details and note the time and road name.
        </div>
      </div>
    </Layout>
  );
}