// One-time Azure setup, shared by two optional features:
//   1. The instructor tool's "Sign in with Microsoft" gate (builder.html) — replaces the old shared
//      passphrase with real AASU account sign-in, checked against an allowed-email list in builder.js.
//   2. The OPTIONAL "Save to OneDrive" button on the My Progress page (stays off/hidden either way).
// Both stay off until the placeholder below is replaced with a real Client ID from an Azure app
// registration.
//
// How to get a Client ID (about 10 minutes, needs only a free Microsoft account — your AASU account is
// fine to use for this, since you're the one registering the app):
//   1. Go to https://portal.azure.com and sign in.
//   2. Search "App registrations" in the top search bar, then click "+ New registration".
//   3. Name it anything, e.g. "IEP099 Grammar Practice".
//   4. Under "Supported account types" choose:
//      "Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant)
//       and personal Microsoft accounts (e.g. Skype, Xbox)"
//      — this is what lets AASU accounts (and, for the optional OneDrive feature, students from any
//      institution's Microsoft 365 tenant) sign in, not just your own tenant.
//   5. Under "Redirect URI" choose platform "Single-page application (SPA)" and add BOTH exact addresses:
//        https://grammarbooklet.github.io/iep099-grammar-practice/builder.html
//        https://grammarbooklet.github.io/iep099-grammar-practice/progress.html
//   6. Click "Register". On the page that opens, copy the "Application (client) ID".
//   7. (Only needed for the OneDrive feature — skip this if you only want the sign-in gate.) Go to
//      "API permissions" (left menu) → "+ Add a permission" → "Microsoft Graph" → "Delegated
//      permissions" → search for and add "Files.ReadWrite.AppFolder". (Leave the default "User.Read"
//      permission as-is either way; you don't need admin consent for either.)
//   8. Paste the Client ID below in place of the placeholder text, save, and redeploy the site.
//
// User.Read only lets the site confirm who signed in (their name/email) — it can't read mail, files, or
// anything else. Files.ReadWrite.AppFolder (OneDrive feature only) only ever lets the site read or write
// files INSIDE a single hidden app folder it creates in that person's OneDrive.
window.MSAL_CLIENT_ID = "REPLACE_WITH_YOUR_AZURE_APP_CLIENT_ID";
