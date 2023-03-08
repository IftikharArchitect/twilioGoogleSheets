// Spreadsheet column names mapped to 0-based index numbers.
var TIME_ENTERED = 0;
var SOURCE_NUMBER = 0;
var PHONE_NUMBER = 1;
var MESSAGE = 2;
var STATUS = 3;

// Enter your Twilio account information here.
var TWILIO_ACCOUNT_SID = '';
var TWILIO_SMS_NUMBER = '';
var TWILIO_AUTH_TOKEN = '';
var HEADER_AUTH_TOKEN = TWILIO_ACCOUNT_SID + ':' + TWILIO_AUTH_TOKEN;
var TWILIO_WHATSAPP_NUMBER =  '';
var DEFAULT_PHONE_CALLBACK_SID = '';
var TWILIO_PHONE_CALLBACK_BASE_URL = 'https://handler.twilio.com/twiml/';

/**
 * Installs a trigger in the Spreadsheet to run upon the Sheet being opened.
 * To learn more about triggers read: https://developers.google.com/apps-script/guides/triggers
 */
function onOpen() {
  // To learn about custom menus, please read:
  // https://developers.google.com/apps-script/guides/menus
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Send Messages')
      .addItem('Send SMS to all', 'sendSmsToAll')
      .addItem('Get Reply`s','exportTwilioLogs')
      .addItem('Send WhatsApp To All', 'sendWhatsAppToAll')
      .addItem('Make Call to all', 'makeCallsToAll')     
      .addToUi();
};  

/**
 * Sends calls listed in the Google Sheet (current/active)
 *
 */
function makeCallsToAll() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var rows = sheet.getDataRange().getValues();
  
  // The `shift` method removes the first row and saves it into `headers`.
  var headers = rows.shift();
  
  // Try to send an SMS to every row and save their status.
  rows.forEach(function(row) {
    if (row[PHONE_NUMBER] &&
        row[PHONE_NUMBER].toString().trim().length > 0 &&
        row[SOURCE_NUMBER] &&
        row[SOURCE_NUMBER].toString().trim().length > 0
    ) {
      var msg = row[MESSAGE].toString();
      if (msg.trim().length == 0) {
        msg = DEFAULT_PHONE_CALLBACK_SID;
      }
      row[STATUS] = makeCall(row[PHONE_NUMBER], row[SOURCE_NUMBER], msg);
    }
  });
  
  // Write the entire data back into the sheet.
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

/**
 * Sends text messages listed in the Google Sheet (current/active)
 *
 */
function sendSmsToAll() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var rows = sheet.getDataRange().getValues();
  
  // The `shift` method removes the first row and saves it into `headers`.
  var headers = rows.shift();
  
  // Try to send an SMS to every row and save their status.
  rows.forEach(function(row) {
    if (row[PHONE_NUMBER] &&
        row[PHONE_NUMBER].toString().trim().length > 0 &&
        row[SOURCE_NUMBER] &&
        row[SOURCE_NUMBER].toString().trim().length > 0 &&
        row[MESSAGE] &&
        row[MESSAGE].toString().trim().length > 0
    ) {
      row[STATUS] = sendSms(row[PHONE_NUMBER], row[MESSAGE], row[SOURCE_NUMBER]);
    }
  });
  
  // Write the entire data back into the sheet.
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

/**
 * Sends whatsapp messages listed in the Google Sheet (current/active)
 *
 */
function sendWhatsAppToAll() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var rows = sheet.getDataRange().getValues();
  
  // The `shift` method removes the first row and saves it into `headers`.
  var headers = rows.shift();
  
  // Try to send an SMS to every row and save their status.
  rows.forEach(function(row) {
    if (row[PHONE_NUMBER] &&
        row[PHONE_NUMBER].toString().trim().length > 0 &&
        row[MESSAGE] &&
        row[MESSAGE].toString().trim().length > 0
    ) {
      row[STATUS] = sendWhatsApp(row[PHONE_NUMBER], row[MESSAGE]);
    }
  });
  
  // Write the entire data back into the sheet.
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}


function containsNonLatinCodepoints(s) {
    return /[^\u0000-\u00ff]/.test(s);
}

function showAlert(message) {
  var ui = SpreadsheetApp.getUi(); // Same variations.

  var result = ui.alert(
     'Please confirm',
     'Are you sure you want to continue? message:' + message,
      ui.ButtonSet.YES_NO);

  // Process the user's response.
  if (result == ui.Button.YES) {
    // User clicked "Yes".
    ui.alert('Confirmation received.');
    return 0;
  } else {
    // User clicked "No" or X in the title bar.
    ui.alert('Permission denied.');
    return 1;
  }
}

/**
 * Sends a message to a given phone number via SMS through Twilio.
 * To learn more about sending an SMS via Twilio and Sheets:
 * https://www.twilio.com/blog/2016/02/send-sms-from-a-google-spreadsheet.html
 *
 * @param {number} phoneNumber - phone number to send SMS to.
 * @param {string} message - text to send via SMS.
 * @return {string} status of SMS sent (successful sent date or error encountered).
 */
function sendSms(phoneNumber, message, source) {
  var cont = 0;
  var out = new Array();
  if (cont == 0) {
    var twilioUrl = 'https://api.twilio.com/2010-04-01/Accounts/' + TWILIO_ACCOUNT_SID + '/Messages.json';
    var twilioWhatsAppUrl = 'https://api.twilio.com/2010-04-01/Accounts/' + TWILIO_ACCOUNT_SID + '/Messages.json';
    var fromNum = ""+source;
    
    try {
      var response = UrlFetchApp.fetch(twilioUrl, {
        method: 'post',
        headers: {
          Authorization: 'Basic ' + Utilities.base64Encode(HEADER_AUTH_TOKEN)
        },
        payload: {
          To: phoneNumber.toString(),
          Body: message,
          From: fromNum,
        },
      });
      var responseText = 'sent: ' + new Date() + 'response from ' + phoneNumber +":"+response.getContentText();
      
      out.push(responseText );
      console.log(responseText);
    } catch (err) {
      console.error('error for number:' + phoneNumber +':err:' + err);
      return 'error for number:' + phoneNumber +':err:' + err;
    }
  }
  
  

  return  out;
  
}

/**
 * Sends a whatsapp message to a given phone number via whatsapp api through Twilio.
 * To learn more about sending an WhatsApp via Twilio and Sheets:
 * https://www.twilio.com/docs/whatsapp
 *
 * @param {number} phoneNumber - phone number to send whatsapp to.
 * @param {string} message - text to send via whatsapp.
 * @return {string} status of whatsapp sent (successful sent date or error encountered).
 */
function sendWhatsApp(phoneNumber, message) {
  var out = new Array();
  var twilioUrl = 'https://api.twilio.com/2010-04-01/Accounts/' + TWILIO_ACCOUNT_SID + '/Messages.json';
  var twilioWhatsAppUrl = 'https://api.twilio.com/2010-04-01/Accounts/' + TWILIO_ACCOUNT_SID + '/Messages.json';

  try {
    UrlFetchApp.fetch(twilioUrl, {
      method: 'post',
      headers: {
        Authorization: 'Basic ' + Utilities.base64Encode(HEADER_AUTH_TOKEN)
      },
      payload: {
        mediaUrl: 'https://khuddam.ca/wp-content/uploads/temp/ror.jpg',
        To: 'whatsapp:+1' + phoneNumber.toString(),
        Body: message,
        From: 'whatsapp:+12892756522',
      },
    });
    out.push( 'sent whatsapp: ' + new Date());
    console.log( 'sent: ' + new Date());
    return out;
  } catch (err) {
    out.push('error: ' + err);
    console.error('error' + err);
    if (err) return 'error: ' + err;
  }

  return  out;
}

/**
 * expors twilio logs using api call and saves repsonse to the sheet named:  'Log Reply\'s Twilio';
 *
 */
function exportTwilioLogs() {
  var exportURL = 'https://api.twilio.com/2010-04-01/Accounts/' + TWILIO_ACCOUNT_SID + '/Messages.json?__referrer=runtime&Format=json&PageSize=500&Page=0';
  try {
    var config =  {
      method: 'get',
      headers: {
        Authorization: 'Basic ' + Utilities.base64Encode(HEADER_AUTH_TOKEN)
      }
    };

    var response = UrlFetchApp.fetch(exportURL,config);
    var myNumbers = new Array();
    myNumbers.push("whatsapp:+14155238886");
    myNumbers.push("+12892756522");

    var data = JSON.parse(response.getContentText());
    var sheetNameLogs = 'Log Reply\'s Twilio';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetNameLogs);
    var counter = 2;
    for (var i =0 ; i < data.messages.length; i++) {
      var toNum = data.messages[i].to;
      var range = sheet.getRange(counter,1);
      range.setValue(data.messages[i].from);
      range = sheet.getRange(counter,2);
      range.setValue(data.messages[i].to);
      range = sheet.getRange(counter,3);
      range.setValue(data.messages[i].body);

      range = sheet.getRange(counter,4);
      range.setValue(data.messages[i].date_created);

      range = sheet.getRange(counter,5);
      range.setValue(data.messages[i].body);
      //date_updated
      counter = counter + 1;
    }

    console.log( 'received logs:' + new Date());
  } catch (err) {
    console.error('error' + err);
    return 'error: ' + err;
  }
}

/**
 * Sends a call to a given phone number via a call api through Twilio.
 * To learn more about sending an SMS via Twilio and Sheets:
 * https://www.twilio.com/docs/voice
 *
 * @param {number} phoneNumber - phone number to send call to.
 * @param {string} source - source to send via call.
 * @return {string} status of source sent (successful sent date or error encountered).
 */
function makeCall(phoneNumber,source, phone_callback_sid = '') {
  var out = new Array();
  var twilioUrl = 'https://api.twilio.com/2010-04-01/Accounts/' + TWILIO_ACCOUNT_SID + '/Calls.json';
  var fromNum = ""+source;
  if (!phone_callback_sid || phone_callback_sid.length == 0) {
    phone_callback_sid = DEFAULT_PHONE_CALLBACK_SID;
  }
  try {
    var response = UrlFetchApp.fetch(twilioUrl, {
      method: 'post',
      headers: {
        Authorization: 'Basic ' + Utilities.base64Encode(HEADER_AUTH_TOKEN)
      },
      payload: {
        To: phoneNumber.toString(),
        Url: TWILIO_PHONE_CALLBACK_BASE_URL + phone_callback_sid,
        From: fromNum
      },
    });
    var responseText = 'sent: ' + new Date() + 'response from ' + phoneNumber +":"+response.getContentText();

    out.push(responseText );
    console.log(responseText);
  } catch (err) {
    console.error('error for number:' + phoneNumber +':err:' + err);
    return 'error for number:' + phoneNumber +':err:' + err;
  }

  return  out;
}
