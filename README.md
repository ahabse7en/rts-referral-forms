# RTS Referral Forms

Self-contained HTML referral forms for Respiratory Testing Services, with a Google Apps Script backend for email delivery, Google Sheet logging, and Drive file storage. Hosted on GitHub Pages and embedded in Wix via iframe.

## Live Form URLs

- **Hospital:** https://ahabse7en.github.io/rts-referral-forms/hospital-referral.html
- **GP:** https://ahabse7en.github.io/rts-referral-forms/gp-referral.html
- **Patient:** https://ahabse7en.github.io/rts-referral-forms/patient-referral.html

## Files

```
referral-forms/
├── hospital-referral.html    # Hospital referral form
├── gp-referral.html          # GP referral form
├── patient-referral.html     # Patient referral form
├── styles.css                # Shared stylesheet (all 3 forms)
├── success.html              # Fallback success page
├── apps-script/
│   └── Code.gs               # Google Apps Script backend
├── config-ids.txt            # Private config IDs (gitignored)
└── README.md                 # This file
```

## Setup Instructions

### 1. Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Rename the first tab to **Hospital**
3. Add a second tab named **GP**
4. Add a third tab named **Patient**
5. Add header rows to each tab:

**Hospital tab:**
`Timestamp | Request Date | Hospital Name | Hospital Name (Other) | Department | Requesting Doctor | Provider No | Patient Name | Patient DOB | Phone | Address | Medicare | Gender | Urgent | Recent HB | Clinical Tests | Pre-existing Conditions | Clinical Notes | Results Email | Attachment Link`

**GP tab:**
`Timestamp | Request Date | Practice Name | Practice Address | Requesting GP | Provider No | Patient Name | Patient DOB | Phone | Address | Medicare | Gender | Urgent | Recent HB | Clinical Tests | Pre-existing Conditions | Preferred Location | Clinical Notes | Results Email | Attachment Link`

**Patient tab:**
`Timestamp | Request Date | Full Name | DOB | Phone | Address | Medicare | GP Practice | Requesting GP | Gender | Clinical Tests | Preferred Location | Attachment Link`

6. Copy the **Spreadsheet ID** from the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit`

### 2. Create Google Drive Folder

1. Go to [Google Drive](https://drive.google.com)
2. Create a new folder called **RTS Referral Attachments**
3. Copy the **Folder ID** from the URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`

### 3. Deploy Google Apps Script

1. Go to [Google Apps Script](https://script.google.com)
2. Create a new project and name it **RTS Referral Forms**
3. Delete the default code and paste the contents of `apps-script/Code.gs`
4. Update the configuration constants at the top:
   ```js
   const ADMIN_EMAIL     = 'your@email.here';
   const SPREADSHEET_ID  = 'your-spreadsheet-id';
   const DRIVE_FOLDER_ID = 'your-drive-folder-id';
   ```
5. Click **Deploy > New deployment**
6. Select type: **Web app**
7. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
8. Click **Deploy** and authorise when prompted
9. Copy the **Web app URL** — this is your `SUBMIT_ENDPOINT`

### 4. Configure the HTML Forms

Each form has three config variables at the top of its `<script>` section:

```js
var SUBMIT_ENDPOINT = '';   // Google Apps Script deployment URL
var FORM_TYPE = 'hospital'; // Don't change this
var SUCCESS_URL = '';       // Wix success page URL (redirects the whole browser after submit)
```

- **SUBMIT_ENDPOINT** — your Apps Script web app URL
- **SUCCESS_URL** — a Wix page to redirect to after successful submission (e.g. `https://www.respiratorytesting.com.au/hospital-referral-submitted`). If left empty, an inline success message is shown instead.

### 5. Embed in Wix

1. Host the HTML files on GitHub Pages (already done)
2. In Wix Editor, navigate to the referral page
3. Remove or hide the existing Wix form
4. Add Elements > Embed Code > **Embed a Site**
5. Enter the GitHub Pages URL for the form
6. Resize the element (width: 100% of column, height: ~1400-2000px)
7. Create a corresponding success page in Wix for the post-submit redirect
8. Preview, test, and publish

## How It Works

1. User fills in the form in their browser (inside a Wix iframe)
2. On submit, the form converts any attached file to base64
3. All field data + file are sent as a JSON POST to the Apps Script
4. The Apps Script:
   - Saves the attachment to Google Drive (in a form-type subfolder)
   - Appends a row to the correct Google Sheet tab
   - Sends a formatted HTML email with all field data and the attachment to the admin email
5. The form redirects the browser to a Wix success page

## Updating

**Forms (HTML/CSS):** Edit files locally, commit, and `git push`. GitHub Pages auto-deploys — no Wix changes needed.

**Apps Script (Code.gs):** After making changes:
1. Go to your Apps Script project
2. Replace the code with the updated Code.gs
3. Click **Deploy > Manage deployments** > edit > **New version** > Deploy

The deployment URL stays the same.

## Quotas

**Free Gmail account:**
- 100 emails/day
- 6 min script execution timeout
- 15GB Drive storage (shared)

**Google Workspace:**
- 1,500 emails/day
- 30 min script execution timeout

For a medical referral workflow, these limits are more than adequate.
