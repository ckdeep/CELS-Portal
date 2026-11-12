# CELS Portal

Run locally (needed for Google sign-in): open a terminal in this folder and run `python -m http.server 8000`, then browse to http://localhost:8000
Opening index.html directly also works for email/password sign-in, but not Google.

Backend: Supabase project `cels-portal` (see assets/js/supabase.js). Sign-in, roles and the Admin Portal use real data.
Student and Teacher portals still use sample data from data/*.js until they are connected.
Demo mode (sample accounts, no backend): open index.html?demo=1

Supabase dashboard steps for Google sign-in:
1. Authentication > Sign In / Providers > Google: enable, paste the Client ID and Secret from Google Cloud Console.
2. Authentication > URL Configuration: add http://localhost:8000/index.html to Redirect URLs (and your real site address later).

Teacher side: sign in with a teacher account. Files for teacher pages are assets/js/pages/teacher-core.js, teacher.js and teacher2.js. Teachers only see sections whose Teacher matches their nickname (set in Admin > Courses).
