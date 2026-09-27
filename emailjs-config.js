// One-time setup so "Email summary to instructor" ACTUALLY sends the email itself, instead of just
// opening the student's own mail app (a mailto: link, which does nothing if their device has no mail app
// configured). This uses EmailJS (emailjs.com), a service built for sending real email straight from a
// website — through YOUR OWN connected email account, not the student's. Students never sign into
// anything for this; only you set it up, once. Until you do, the page falls back to the mailto: link.
//
// How to set it up (about 10 minutes, free tier covers 200 emails/month):
//   1. Go to https://www.emailjs.com/ and create a free account (any email works, doesn't need to be
//      your institutional one).
//   2. In the dashboard: "Email Services" -> "Add New Service" -> pick Gmail, Outlook, or any provider
//      you use -> connect YOUR OWN email account (you'll see a normal sign-in/consent screen for that
//      provider, since EmailJS needs your permission to send through it). Copy the "Service ID" it shows.
//   3. "Email Templates" -> "Create New Template". Set:
//        To Email:  {{to_email}}
//        Subject:   {{subject}}
//        Content:   {{message}}
//      Save it, then copy the "Template ID".
//   4. "Account" -> "General" -> copy your "Public Key" (safe to put in this file — it only allows
//      sending through the template you just made, never reading your inbox or anything else).
//   5. Paste all three values below in place of the placeholders, save, and redeploy the site.
window.EMAILJS_PUBLIC_KEY = "REPLACE_WITH_YOUR_PUBLIC_KEY";
window.EMAILJS_SERVICE_ID = "REPLACE_WITH_YOUR_SERVICE_ID";
window.EMAILJS_TEMPLATE_ID = "REPLACE_WITH_YOUR_TEMPLATE_ID";
