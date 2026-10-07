async function getGraphAccessToken() {
  const tenantId = process.env.MS_GRAPH_TENANT_ID;
  const clientId = process.env.MS_GRAPH_CLIENT_ID;
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) {
    const error = new Error('Microsoft Graph credentials missing');
    error.code = 'GRAPH_CONFIG_MISSING';
    throw error;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const response = await fetch('https://login.microsoftonline.com/' + encodeURIComponent(tenantId) + '/oauth2/v2.0/token', {
    method: 'POST',signal:AbortSignal.timeout(10000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    console.error(JSON.stringify({event:'m365_token_failed',status:response.status}));
    const error = new Error('Microsoft Graph token unavailable');
    error.code = 'GRAPH_AUTH_FAILED';
    throw error;
  }
  return data.access_token;
}

export async function sendViaMicrosoftGraph({ to, subject, html, attachmentBase64 }) {
  const sender = 'service@sls.de';
  const accessToken = await getGraphAccessToken();
  const payload = {
    message: {
      subject,
      body: { contentType: 'HTML', content: html },
      toRecipients: [{ emailAddress: { address: to } }],
      ...(attachmentBase64 ? {attachments: [{
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: 'SLS-Verkaufsanalyse.pdf',
        contentType: 'application/pdf',
        contentBytes: attachmentBase64
      }]} : {})
    },
    saveToSentItems: true
  };

  const response = await fetch('https://graph.microsoft.com/v1.0/users/' + encodeURIComponent(sender) + '/sendMail', {
    method: 'POST',signal:AbortSignal.timeout(15000),
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    console.error(JSON.stringify({event:'m365_mail_failed',status:response.status}));
    const error = new Error('Microsoft Graph send failed');
    error.code = 'GRAPH_SEND_FAILED';
    throw error;
  }
}

