# Adding content

1. Catalog: add a course in data/courses.js (one line using C(id, name, color, parts)).
2. Lessons: copy content/templates/lesson.html into content/ielts/<course-id>/<part>/ and edit it.
3. Enrollments, events, messages: add rows in data/courses.js. In production these come from the database.
4. New page: create <role>/<name>.html (copy any page, change data-page), add it to nav in data/config.js,
   and register a renderer: CELS.pages["role/name"]=function(el,user){...}
5. New appointment type: add to appointmentTypes and availability in data/config.js.

The data files mirror the planned PostgreSQL tables (programs, courses, enrollments, appointments, messages),
so replacing them with API calls later will not change the pages.
