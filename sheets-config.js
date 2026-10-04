/* © Dr. Chadi Chahdi. IEP099 Grammar Booklet, Second Edition, and the Writing Center. Designed and written by Dr. Chadi Chahdi. */
// Optional: log every completed practice set (name, section, set title, score) to a Google Sheet you own,
// so you can see who has completed which QR/link and their result. Entirely dormant until you set this up —
// nothing is sent anywhere while the URL below is empty. This is the only way to "track" a set on a static
// site with no server: the student's own browser reports the result directly to your sheet when they submit.
//
// Setup (about 10 minutes, free, needs only your own Google account):
//   1. Go to sheets.google.com and create a new blank sheet. Add a header row:
//        Date | Student | Section | Set | Correct | Total | Percent | Extra Minutes
//   2. Extensions -> Apps Script. Delete the placeholder code and paste:
//
//        function doPost(e) {
//          var data = JSON.parse(e.postData.contents);
//          SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().appendRow([
//            new Date(), data.name, data.section, data.set, data.correct, data.total, data.percent, data.extraMinutes || 0
//          ]);
//          return ContentService.createTextOutput("ok");
//        }
//
//   3. Click Deploy -> New deployment -> gear icon -> type "Web app".
//      Set "Execute as" to yourself, and "Who has access" to "Anyone" (this lets a student's browser reach
//      it without signing in — it can only ever run the one function above, nothing else in your account).
//   4. Click Deploy, then Authorize access with your OWN Google account (never a student's).
//   5. Copy the "Web app URL" it gives you and paste it below, replacing the empty string.
window.SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzINyhvlhe4omoynPWP3vYiS1j7RvuYZoHRU3mZexBeFwNmT4tx0U-418t7iWVhWlDySw/exec";
