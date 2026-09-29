// One-time setup for the OPTIONAL "Save to OneDrive" button on the My Progress page.
// This feature stays off (the button stays hidden) until the placeholder below is replaced with a
// real Client ID from an Azure app registration. Nothing else on the site depends on this file.
//
// How to get a Client ID (about 10 minutes, needs only a free Microsoft account — a personal one is fine,
// it does not need to belong to your institution):
//   1. Go to https://portal.azure.com and sign in.
//   2. Search "App registrations" in the top search bar, then click "+ New registration".
//   3. Name it anything, e.g. "IEP099 Grammar Practice".
//   4. Under "Supported account types" choose:
//      "Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant)
//       and personal Microsoft accounts (e.g. Skype, Xbox)"
//      — this is what lets students from any institution's Microsoft 365 tenant sign in, not just you.
//   5. Under "Redirect URI" choose platform "Single-page application (SPA)" and enter the exact
//      address of this site's progress page, for example:
//        https://grammarbooklet.github.io/iep099-grammar-practice/progress.html
//   6. Click "Register". On the page that opens, copy the "Application (client) ID".
//   7. Go to "API permissions" (left menu) → "+ Add a permission" → "Microsoft Graph" →
//      "Delegated permissions" → search for and add "Files.ReadWrite.AppFolder".
//      (Leave the default "User.Read" permission as-is; you don't need admin consent for either.)
//   8. Paste the Client ID below in place of the placeholder text, save, and redeploy the site.
//
// This permission (Files.ReadWrite.AppFolder) only ever lets the site read or write files INSIDE a
// single hidden app folder it creates in a student's OneDrive — it can never see or touch anything
// else in their account.
window.MSAL_CLIENT_ID = "REPLACE_WITH_YOUR_AZURE_APP_CLIENT_ID";
