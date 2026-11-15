/* Връзка с базата данни (Supabase).
   supabaseUrl  — адресът на проекта, напр. https://abcdefgh.supabase.co
   supabaseKey  — ПУБЛИЧНИЯТ ключ (publishable / anon). Той е предвиден да стои в сайта:
                  достъпът до данните се пази от правилата в базата (supabase/schema.sql).
   НИКОГА не слагайте тук secret / service_role ключ. */
window.UM_CONFIG = {
  supabaseUrl: 'https://cjxmwgnxxxteoodtqjsp.supabase.co',
  supabaseKey: 'sb_publishable_b_Js8tYI_fzFkCMut2JzPw_ufC9wm9J',
  /* публичен ключ за известията на телефона (частният стои само в базата) */
  vapidPublicKey: 'BNv29v8pBRywkMx2uoHot7mzrMI3X5DGzpSODOu62xjy6h0fSE-_cb1_3HMXlDQh-KhxEnu4Z-qkbxNf-WGolsk'
};
