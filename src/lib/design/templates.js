import { supabase } from "../supabase";
import { defaultCertificateDesign, defaultPosterDesign } from "./model";

function normalize(row) {
  if (!row) return null;
  return {
    canvas: row.canvas && Object.keys(row.canvas).length ? row.canvas : {},
    elements: Array.isArray(row.elements) ? row.elements : [],
  };
}

function defaultDesignFor(type) {
  return type === "poster" ? defaultPosterDesign() : defaultCertificateDesign();
}

/**
 * Resolve the active design for a given type, preferring a course-specific
 * override, then the global template, then the built-in default.
 * Never throws — the app works even before the migration is applied.
 *
 * @returns {Promise<{ id, type, scope, course_id, name, design }>}
 */
export async function fetchActiveDesign(type, courseId = null) {
  try {
    if (courseId) {
      const { data } = await supabase
        .from("design_templates")
        .select("id, type, scope, course_id, name, canvas, elements, updated_at")
        .eq("type", type)
        .eq("scope", "course")
        .eq("course_id", courseId)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (data && data.length) return { ...data[0], design: normalize(data[0]) };
    }

    const { data } = await supabase
      .from("design_templates")
      .select("id, type, scope, course_id, name, canvas, elements, updated_at")
      .eq("type", type)
      .eq("scope", "global")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1);
    if (data && data.length) return { ...data[0], design: normalize(data[0]) };
  } catch (_) {
    /* table not present yet → fall through to default */
  }

  return {
    id: null,
    type,
    scope: "global",
    course_id: null,
    name: type === "poster" ? "Default poster" : "Default certificate",
    design: defaultDesignFor(type),
  };
}

/** List all saved templates (admin). Tolerates a missing table. */
export async function fetchAllDesigns() {
  try {
    const { data, error } = await supabase
      .from("design_templates")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (e) {
    return { data: [], error: e?.message || "unavailable" };
  }
}

/** Create or update a template. Returns { data, error }. */
export async function saveTemplate(row) {
  const payload = {
    type: row.type,
    scope: row.scope,
    course_id: row.course_id || null,
    name: row.name || "Untitled",
    canvas: row.canvas,
    elements: row.elements,
    is_active: row.is_active !== false,
    updated_at: new Date().toISOString(),
  };
  try {
    if (row.id) {
      const { data, error } = await supabase
        .from("design_templates")
        .update(payload)
        .eq("id", row.id)
        .select()
        .single();
      return { data, error };
    }
    const { data, error } = await supabase.from("design_templates").insert(payload).select().single();
    return { data, error };
  } catch (e) {
    return { data: null, error: { message: e?.message || "Could not save" } };
  }
}

export async function deleteTemplate(id) {
  try {
    const { error } = await supabase.from("design_templates").delete().eq("id", id);
    return { error };
  } catch (e) {
    return { error: { message: e?.message || "Could not delete" } };
  }
}

/** Fetch org name/tagline used as variable values on designs (cached). */
let _identityCache = null;
export async function fetchSiteIdentity() {
  if (_identityCache) return _identityCache;
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["site_name", "site_tagline"]);
    const o = {};
    (data || []).forEach((r) => (o[r.setting_key] = r.setting_value));
    _identityCache = o;
    return o;
  } catch (_) {
    _identityCache = {};
    return {};
  }
}

/** Fetch the design list for the admin UI, grouped helper. */
export async function fetchDesignsForAdmin() {
  const { data, error } = await fetchAllDesigns();
  // Rows are raw { canvas, elements } columns — attach a normalized `design`
  // so callers (thumbnails, "Edit design") open what was actually saved.
  const rows = data.map((d) => ({ ...d, design: normalize(d) }));
  const globalCert = rows.find((d) => d.type === "certificate" && d.scope === "global") || null;
  const globalPoster = rows.find((d) => d.type === "poster" && d.scope === "global") || null;
  const courseOverrides = rows.filter((d) => d.scope === "course");
  return { globalCert, globalPoster, courseOverrides, all: rows, error };
}