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
  var heading = '';
  if (formType === 'hospital') heading = 'Hospital Referral';
  if (formType === 'gp')       heading = 'GP Referral';
  if (formType === 'patient')  heading = 'Patient Referral';

  var timestamp = Utilities.formatDate(new Date(), 'Australia/Perth', 'dd/MM/yyyy HH:mm');
  var patientName = f.patientFullName || f.fullName || '';

  var h = '';

  // Outer wrapper
  h += '<div style="font-family: Helvetica, \'Helvetica Neue\', sans-serif; max-width: 640px; margin: 0 auto; color: #2d3748; font-size: 14px; line-height: 1.6;">';

  // Header banner
  h += '<div style="background: #1a3c5e; color: #fff; padding: 20px 24px; border-radius: 8px 8px 0 0;">';
  h += '<h1 style="margin: 0; font-size: 20px; font-weight: 600;">New ' + heading + '</h1>';
  h += '<p style="margin: 6px 0 0; font-size: 13px; color: #b0c4de;">' + timestamp + ' AWST</p>';
  h += '</div>';

  // Body
  h += '<div style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; padding: 0;">';

  // Patient Details
  h += sectionHeading('Patient Details');
  h += '<table style="width: 100%; border-collapse: collapse;">';
  if (formType === 'patient') {
    h += row('Name', f.fullName);
    h += row('DOB', f.dob);
    h += row('Phone', f.phone);
    h += row('Address', f.address);
    h += row('Medicare', f.medicare);
    h += row('Gender', f.gender);
  } else {
    h += row('Name', f.patientFullName);
    h += row('DOB', f.patientDOB);
    h += row('Phone', f.patientPhone);
    h += row('Address', f.patientAddress);
    h += row('Medicare', f.patientMedicare);
    h += row('Gender', f.gender);
  }
  h += '</table>';

  // Referral Details
  h += sectionHeading('Referral Details');
  h += '<table style="width: 100%; border-collapse: collapse;">';
  h += row('Request Date', f.requestDate);
  if (formType === 'hospital') {
    h += row('Hospital', f.hospitalName);
    if (f.hospitalNameOther) h += row('Hospital (Other)', f.hospitalNameOther);
    h += row('Department', f.hospitalDepartment);
    h += row('Doctor / Consultant', f.requestingDoctor);
    h += row('Provider No', f.providerNo);
  }
  if (formType === 'gp') {
    h += row('Practice', f.practiceName);
    h += row('Practice Address', f.practiceAddress);
    h += row('Requesting GP', f.requestingGP);
    h += row('Provider No', f.providerNo);
  }
  if (formType === 'patient') {
    h += row('GP Practice', f.gpPracticeName);
    h += row('Requesting GP', f.requestingGP);
  }
  h += '</table>';

  // Clinical
  h += sectionHeading('Clinical');
  h += '<table style="width: 100%; border-collapse: collapse;">';
  h += row('Tests Requested', formatArray(f.clinicalTests));
  if (formType === 'hospital' || formType === 'gp') {
    h += row('Pre-existing Conditions', formatArray(f.preExistingConditions));
    h += row('Urgent Results', f.urgentResults ? '<span style="color: #c53030; font-weight: 600;">Yes</span>' : 'No');
    h += row('Recent HB (<3 months)', f.recentHB ? 'Yes' : 'No');
    h += row('Clinical Notes', f.clinicalNotes || '<span style="color: #a0aec0;">—</span>');
  }
  if (formType === 'gp' || formType === 'patient') {
    h += row('Preferred Location', formatArray(f.preferredLocation));
  }
  h += '</table>';

  // Results email
  if (formType === 'hospital' || formType === 'gp') {
    h += sectionHeading('Results');
    h += '<table style="width: 100%; border-collapse: collapse;">';
    h += row('Send Results To', f.resultsEmail);
    h += '</table>';
  }

  // Attachment
  if (file && file.name) {
    h += sectionHeading('Attachment');
    h += '<table style="width: 100%; border-collapse: collapse;">';
    h += row('File', file.name + ' (attached)');
    h += '</table>';
  }

  h += '</div>'; // end body

  // Footer
  h += '<p style="text-align: center; font-size: 11px; color: #a0aec0; margin-top: 16px;">Respiratory Testing Services — Referral Form Submission</p>';

  h += '</div>'; // end wrapper
  return h;
}

// ── Email HTML helpers ───────────────────────────────────────────────────────

function sectionHeading(title) {
  return '<div style="background: #f7fafc; padding: 10px 24px; border-top: 1px solid #e2e8f0;">'
       + '<h3 style="margin: 0; font-size: 13px; font-weight: 600; color: #1a3c5e; text-transform: uppercase; letter-spacing: 0.5px;">'
       + title + '</h3></div>';
}

function row(label, value) {
  return '<tr>'
       + '<td style="padding: 8px 24px; width: 180px; color: #718096; font-size: 13px; vertical-align: top;">' + label + '</td>'
       + '<td style="padding: 8px 24px; color: #2d3748; font-size: 14px; vertical-align: top;">' + (value || '') + '</td>'
       + '</tr>';
}

function formatArray(val) {
  if (Array.isArray(val) && val.length > 0) return val.join(', ');
  return '<span style="color: #a0aec0;">—</span>';
}
