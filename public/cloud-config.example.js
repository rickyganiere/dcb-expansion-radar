// Copy to cloud-config.js only after the dedicated Supabase project exists.
// The publishable key is safe to expose in the browser when RLS is correctly configured.
// Never put a Supabase secret/service-role key in this file.
window.RADAR_CLOUD_CONFIG = {
  url: "",
  publishableKey: ""
};
