/* Browser-safe Supabase configuration.
 * Define window.DIGITAL_SAATHI_CONFIG before this file loads.
 * Only the public sb_publishable_ key belongs here. Never use a service-role key.
 */
(function () {
  const config = window.DIGITAL_SAATHI_CONFIG || {};
  const url = (config.supabaseUrl || '').replace(/\/rest\/v1\/?$/, '');
  const key = config.supabasePublishableKey || '';
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)
    && key.startsWith('sb_publishable_');

  window.DigitalSaathiSupabase = {
    configured,
    client: configured && window.supabase
      ? window.supabase.createClient(url, key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        })
      : null
  };
})();
