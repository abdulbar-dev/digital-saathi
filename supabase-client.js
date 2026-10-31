/* Browser-safe Supabase configuration.
 * Set these values in this file or define window.DIGITAL_SAATHI_CONFIG before it loads.
 * Only the public publishable/anon key belongs here. Never use a service-role key.
 */
(function () {
  const config = window.DIGITAL_SAATHI_CONFIG || {};
  const url = config.supabaseUrl || 'https://YOUR_PROJECT.supabase.co';
  const key = config.supabaseAnonKey || 'YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY';
  const configured = !url.includes('YOUR_PROJECT') && !key.includes('YOUR_PUBLIC');

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
