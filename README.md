# RTS Referral Forms

Self-contained HTML referral forms for Respiratory Testing Solutions, with a Google Apps Script backend for email delivery, Google Sheet logging, and Drive file storage.

## Files

```
referral-forms/
├── hospital-referral.html    # Hospital referral form
├── gp-referral.html          # GP referral form
├── patient-referral.html     # Patient referral form
├── apps-script/
│   └── Code.gs               # Google Apps Script backend
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
   const ADMIN_EMAIL     = 'info@respiratorytesting.com.au';
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

In each HTML file (`hospital-referral.html`, `gp-referral.html`, `patient-referral.html`), find the line:

```js
var SUBMIT_ENDPOINT = '';
```

Replace the empty string with your Apps Script Web app URL:

```js
var SUBMIT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx.../exec';
```

### 5. Embed in Wix

**Option A — Paste HTML directly:**
1. Open Wix Editor
2. Navigate to the relevant referral page
3. Remove or hide the existing Wix form
4. Add Elements > Embed Code > Embed HTML
5. Paste the entire HTML file contents
6. Resize the element (width: 100% of column, height: ~1400-2000px)
7. Preview and test
8. Publish

**Option B — Host externally (recommended):**
1. Host the HTML files at a stable HTTPS URL (GitHub Pages, Netlify, etc.)
2. In Wix, use "Embed a Site" and enter the URL
3. Future updates only require editing the hosted file — no Wix changes needed

## How It Works

1. User fills in the form in their browser
2. On submit, the form converts any attached file to base64
3. All field data + file are sent as a JSON POST to the Apps Script
4. The Apps Script:
   - Saves the attachment to Google Drive (in a form-type subfolder)
   - Appends a row to the correct Google Sheet tab
   - Sends a formatted HTML email with all field data and the attachment to the admin email
5. The form shows a success confirmation message

## Updating the Apps Script

After making changes to Code.gs:
1. Go to your Apps Script project
2. Click **Deploy > Manage deployments**
3. Click the edit (pencil) icon on your deployment
4. Change **Version** to **New version**
5. Click **Deploy**

The URL stays the same — no need to update the HTML forms.

## Quotas

**Free Gmail account:**
- 100 emails/day
- 6 min script execution timeout
- 15GB Drive storage (shared)

**Google Workspace:**
- 1,500 emails/day
- 30 min script execution timeout

For a medical referral workflow, these limits are more than adequate.
