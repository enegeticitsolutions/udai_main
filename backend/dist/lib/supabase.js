import { createClient } from "@supabase/supabase-js";
import { config } from "../config.js";
import fs from "node:fs/promises";
let supabaseClient = null;
export function getSupabaseClient() {
    if (!supabaseClient) {
        if (!config.supabaseUrl || (!config.supabaseServiceRole && !config.supabaseAnon)) {
            throw new Error("Supabase environment variables are missing.");
        }
        supabaseClient = createClient(config.supabaseUrl, config.supabaseServiceRole || config.supabaseAnon);
    }
    return supabaseClient;
}
export async function uploadToSupabase(filePath, originalName, mimeType) {
    const supabase = getSupabaseClient();
    const fileBuffer = await fs.readFile(filePath);
    const fileExt = originalName.split(".").pop();
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${fileExt}`;
    const { data, error } = await supabase.storage
        .from(config.supabaseBucketName)
        .upload(fileName, fileBuffer, {
        contentType: mimeType,
        cacheControl: "3600",
        upsert: false,
    });
    if (error) {
        throw error;
    }
    // Get the public URL of the uploaded file
    const { data: publicUrlData } = supabase.storage
        .from(config.supabaseBucketName)
        .getPublicUrl(fileName);
    // Clean up the local temp file in background
    fs.unlink(filePath).catch((err) => {
        console.error("Failed to delete local temp upload file:", err);
    });
    return publicUrlData.publicUrl;
}
