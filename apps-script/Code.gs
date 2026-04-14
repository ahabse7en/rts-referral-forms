// =============================================================================
// RTS Referral Forms — Google Apps Script Backend
// =============================================================================
//
// SETUP:
// 1. Go to https://script.google.com and create a new project
// 2. Paste this code into Code.gs
// 3. Update ADMIN_EMAIL, SPREADSHEET_ID, and DRIVE_FOLDER_ID below
// 4. Create a Google Sheet with 3 tabs: "Hospital", "GP", "Patient"
//    Add header rows matching the column lists in this script (see getHeaders())
// 5. Create a Google Drive folder for attachments
//    Optionally create subfolders: Hospital/, GP/, Patient/
// 6. Deploy: Deploy → New deployment → Web app
//    - Execute as: Me
//    - Who has access: Anyone
// 7. Copy the deployment URL — this is your SUBMIT_ENDPOINT
// 8. Paste the URL into each HTML form's SUBMIT_ENDPOINT constant
// 9. After any code changes: Deploy → Manage deployments → Edit → New version
//
// =============================================================================

// ── Configuration ────────────────────────────────────────────────────────────

const ADMIN_EMAIL     = 'info@respiratorytesting.com.au';
const SPREADSHEET_ID  = 'YOUR_GOOGLE_SHEET_ID_HERE';
const DRIVE_FOLDER_ID = 'YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE';

// ── Main POST handler ────────────────────────────────────────────────────────

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var formType = payload.formType;   // "hospital", "gp", or "patient"
    var fields   = payload.fields;
    var file     = payload.file;       // { name, mimeType, data } or null

    // Validate form type
    if (['hospital', 'gp', 'patient'].indexOf(formType) === -1) {
      return jsonResponse(false, 'Invalid form type: ' + formType);
    }

    // ── Handle file attachment ───────────────────────────────────────────
    var attachmentBlob = null;
    var driveFileUrl   = '';

    if (file && file.data) {
      var decoded = Utilities.base64Decode(file.data);
      attachmentBlob = Utilities.newBlob(decoded, file.mimeType, file.name);

      // Save to Drive
      var parentFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      var subfolder = getOrCreateSubfolder(parentFolder, capitalise(formType));
      var driveFile = subfolder.createFile(attachmentBlob);
      driveFileUrl = driveFile.getUrl();
    }

    // ── Append row to Google Sheet ───────────────────────────────────────
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var tabName = capitalise(formType);    // "Hospital", "GP", or "Patient"
    if (formType === 'gp') tabName = 'GP'; // ensure uppercase
    var sheet = ss.getSheetByName(tabName);

    if (!sheet) {
      return jsonResponse(false, 'Sheet tab "' + tabName + '" not found');
    }

    var row = buildSheetRow(formType, fields, driveFileUrl);
    sheet.appendRow(row);

    // ── Send email ───────────────────────────────────────────────────────
    var patientName = fields.patientFullName || fields.fullName || 'Unknown';
    var requestDate = fields.requestDate || '';
    var subject = '[RTS Referral - ' + capitalise(formType) + '] '
                + patientName + ' - ' + requestDate;

    var htmlBody = buildEmailHtml(formType, fields, file);

    var emailOptions = {
      to: ADMIN_EMAIL,
      subject: subject,
      htmlBody: htmlBody
    };

    if (attachmentBlob) {
      emailOptions.attachments = [attachmentBlob];
    }

    MailApp.sendEmail(emailOptions);

    return jsonResponse(true, 'Referral submitted successfully');

  } catch (err) {
    return jsonResponse(false, 'Server error: ' + err.message);
  }
}

// ── doGet — simple health check ──────────────────────────────────────────────

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'RTS Referral Forms backend is running.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── JSON response helper ─────────────────────────────────────────────────────

function jsonResponse(success, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: success, message: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Drive subfolder helper ───────────────────────────────────────────────────

function getOrCreateSubfolder(parent, name) {
  var folders = parent.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parent.createFolder(name);
}

// ── Capitalise helper ────────────────────────────────────────────────────────

function capitalise(str) {
  if (str === 'gp') return 'GP';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Build sheet row per form type ────────────────────────────────────────────

function buildSheetRow(formType, f, driveFileUrl) {
  var timestamp = new Date();
  var arrayToString = function(val) {
    return Array.isArray(val) ? val.join(', ') : (val || '');
  };
  var boolToYesNo = function(val) {
    return val ? 'Yes' : 'No';
  };

  if (formType === 'hospital') {
    return [
      timestamp,
      f.requestDate || '',
      f.hospitalName || '',
      f.hospitalNameOther || '',
      f.hospitalDepartment || '',
      f.requestingDoctor || '',
      f.providerNo || '',
      f.patientFullName || '',
      f.patientDOB || '',
      f.patientPhone || '',
      f.patientAddress || '',
      f.patientMedicare || '',
      f.gender || '',
      boolToYesNo(f.urgentResults),
      boolToYesNo(f.recentHB),
      arrayToString(f.clinicalTests),
      arrayToString(f.preExistingConditions),
      f.clinicalNotes || '',
      f.resultsEmail || '',
      driveFileUrl
    ];
  }

  if (formType === 'gp') {
    return [
      timestamp,
      f.requestDate || '',
      f.practiceName || '',
      f.practiceAddress || '',
      f.requestingGP || '',
      f.providerNo || '',
      f.patientFullName || '',
      f.patientDOB || '',
      f.patientPhone || '',
      f.patientAddress || '',
      f.patientMedicare || '',
      f.gender || '',
      boolToYesNo(f.urgentResults),
      boolToYesNo(f.recentHB),
      arrayToString(f.clinicalTests),
      arrayToString(f.preExistingConditions),
      arrayToString(f.preferredLocation),
      f.clinicalNotes || '',
      f.resultsEmail || '',
      driveFileUrl
    ];
  }

  if (formType === 'patient') {
    return [
      timestamp,
      f.requestDate || '',
      f.fullName || '',
      f.dob || '',
      f.phone || '',
      f.address || '',
      f.medicare || '',
      f.gpPracticeName || '',
      f.requestingGP || '',
      f.gender || '',
      arrayToString(f.clinicalTests),
      arrayToString(f.preferredLocation),
      driveFileUrl
    ];
  }

  return [timestamp, 'Unknown form type'];
}

// ── Build email HTML ─────────────────────────────────────────────────────────

function buildEmailHtml(formType, f, file) {
  var html = '';
  var heading = '';

  if (formType === 'hospital') heading = 'Hospital Referral';
  if (formType === 'gp')       heading = 'GP Referral';
  if (formType === 'patient')  heading = 'Patient Referral';

  html += '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">';
  html += '<h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">';
  html += 'New ' + heading + ' Submission</h2>';
  html += '<p style="color: #666;">Submitted: ' + Utilities.formatDate(new Date(), 'Australia/Perth', 'dd/MM/yyyy HH:mm') + ' AWST</p>';

  // Patient Details
  html += sectionHeading('Patient Details');

  if (formType === 'patient') {
    html += row('Name', f.fullName);
    html += row('DOB', f.dob);
    html += row('Phone', f.phone);
    html += row('Address', f.address);
    html += row('Medicare', f.medicare);
    html += row('Gender', f.gender);
  } else {
    html += row('Name', f.patientFullName);
    html += row('DOB', f.patientDOB);
    html += row('Phone', f.patientPhone);
    html += row('Address', f.patientAddress);
    html += row('Medicare', f.patientMedicare);
    html += row('Gender', f.gender);
  }

  // Referral Details
  html += sectionHeading('Referral Details');
  html += row('Request Date', f.requestDate);

  if (formType === 'hospital') {
    html += row('Hospital', f.hospitalName);
    if (f.hospitalNameOther) html += row('Hospital (Other)', f.hospitalNameOther);
    html += row('Department', f.hospitalDepartment);
    html += row('Doctor / Consultant', f.requestingDoctor);
    html += row('Provider No', f.providerNo);
  }

  if (formType === 'gp') {
    html += row('Practice', f.practiceName);
    html += row('Practice Address', f.practiceAddress);
    html += row('Requesting GP', f.requestingGP);
    html += row('Provider No', f.providerNo);
  }

  if (formType === 'patient') {
    html += row('GP Practice', f.gpPracticeName);
    html += row('Requesting GP', f.requestingGP);
  }

  // Clinical
  html += sectionHeading('Clinical');
  html += row('Tests Requested', formatArray(f.clinicalTests));

  if (formType === 'hospital' || formType === 'gp') {
    html += row('Pre-existing Conditions', formatArray(f.preExistingConditions));
    html += row('Urgent Results', f.urgentResults ? 'Yes' : 'No');
    html += row('Recent HB (<3 months)', f.recentHB ? 'Yes' : 'No');
    html += row('Clinical Notes', f.clinicalNotes || '(none)');
  }

  // Location
  if (formType === 'gp' || formType === 'patient') {
    html += row('Preferred Location', formatArray(f.preferredLocation));
  }

  // Results email
  if (formType === 'hospital' || formType === 'gp') {
    html += sectionHeading('Results');
    html += row('Results Email', f.resultsEmail);
  }

  // Attachment
  if (file && file.name) {
    html += sectionHeading('Attachment');
    html += row('File', file.name + ' (attached)');
  }

  html += '</div>';
  return html;
}

// ── Email HTML helpers ───────────────────────────────────────────────────────

function sectionHeading(title) {
  return '<h3 style="color: #2c3e50; margin-top: 20px; margin-bottom: 8px; '
       + 'border-bottom: 1px solid #ddd; padding-bottom: 4px;">' + title + '</h3>';
}

function row(label, value) {
  return '<p style="margin: 4px 0;"><strong>' + label + ':</strong> '
       + (value || '') + '</p>';
}

function formatArray(val) {
  if (Array.isArray(val) && val.length > 0) return val.join(', ');
  return '(none)';
}
