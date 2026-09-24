const MAX_BODY_BYTES = 16000;

function clean(value, limit = 300) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function escapeHtml(value) {
  return clean(value, 3000).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function config() {
  const apiKey = process.env.PROPSTACK_API_KEY;
  const sourceId = Number(process.env.PROPSTACK_WEBSITE_SOURCE_ID);
  const noteTypeId = Number(process.env.PROPSTACK_INQUIRY_NOTE_TYPE_ID);
  return apiKey && Number.isSafeInteger(sourceId) && sourceId > 0 &&
    Number.isSafeInteger(noteTypeId) && noteTypeId > 0
    ? { apiKey, sourceId, noteTypeId } : null;
}

function bad(res, status, message) {
  return res.status(status).json({ error: message });
}

async function propstack(path, options, apiKey) {
  const response = await fetch('https://api.propstack.de/v1' + path, {
    ...options,
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) {
    throw new Error('Propstack ' + path + ' responded with ' + response.status);
  }
  return response.json();
}

function validate(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const kind = clean(raw.kind, 20);
  if (kind !== 'valuation' && kind !== 'contact') return null;
  if (raw.consent !== true || clean(raw.website, 100)) return null;

  const name = clean(raw.name, 120);
  const email = clean(raw.email, 254).toLowerCase();
  const phone = clean(raw.phone, 50);
  if (name.length < 3 || !name.includes(' ') ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length < 5) return null;
  const fields = {
    kind, name, email, phone,
    propertyType: clean(raw.propertyType, 80),
    postalCode: clean(raw.postalCode, 15),
    city: clean(raw.city, 120),
    livingArea: clean(raw.livingArea, 30),
    plotArea: clean(raw.plotArea, 30),
    intention: clean(raw.intention, 80),
    request: clean(raw.request, 80),
    message: clean(raw.message, 3000),
    appointmentWish: clean(raw.appointmentWish, 300)
  };
  if (kind === 'valuation' &&
      (!fields.propertyType || !/^\d{5}$/.test(fields.postalCode) || !fields.city)) return null;
  if (kind === 'contact' && !fields.request) return null;
  return fields;
}

function noteBody(data) {
  const rows = [
    ['Anliegen', data.kind === 'valuation' ? 'Immobilienbewertung' : data.request],
    ['Name', data.name], ['E-Mail', data.email], ['Telefon', data.phone],
    ['Immobilienart', data.propertyType], ['PLZ der Immobilie', data.postalCode],
    ['Ort der Immobilie', data.city], ['Wohnfläche ca.', data.livingArea],
    ['Grundstück ca.', data.plotArea], ['Absicht', data.intention],
    ['Terminwunsch', data.appointmentWish], ['Nachricht', data.message]
  ];
  return rows.filter(([, value]) => value).map(([label, value]) =>
    '<p><strong>' + escapeHtml(label) + ':</strong> ' +
    escapeHtml(value).replace(/\r?\n/g, '<br>') + '</p>'
  ).join('');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const settings = config();
  if (req.method === 'GET') {
    return res.status(settings ? 200 : 503).json({ available: !!settings });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return bad(res, 405, 'Methode nicht erlaubt.');
  }
  if (!settings) return bad(res, 503, 'Die Online-Anfrage ist noch nicht verfügbar.');
  if (!(req.headers['content-type'] || '').startsWith('application/json')) {
    return bad(res, 415, 'Ungültiges Anfrageformat.');
  }
  const bodySize = Number(req.headers['content-length'] || 0);
  if (bodySize > MAX_BODY_BYTES || JSON.stringify(req.body || {}).length > MAX_BODY_BYTES) {
    return bad(res, 413, 'Die Anfrage ist zu lang.');
  }
  const input = validate(req.body);
  if (!input) return bad(res, 400, 'Bitte prüfen Sie Ihre Angaben und die Datenschutzeinwilligung.');

  try {
    // A matching email may already exist: keep the existing contact's fields intact.
    const matches = await propstack('/contacts?email=' + encodeURIComponent(input.email), {}, settings.apiKey);
    const contacts = Array.isArray(matches) ? matches : (matches.data || matches.clients || []);
    const existing = contacts.find((contact) =>
      clean(contact.email, 254).toLowerCase() === input.email && Number.isSafeInteger(Number(contact.id)));
    let contactId = existing ? Number(existing.id) : null;

    if (!contactId) {
      const parts = input.name.split(/\s+/);
      const created = await propstack('/contacts', {
        method: 'POST',
        body: JSON.stringify({ client: {
          first_name: parts.shift(),
          last_name: parts.join(' '),
          email: input.email,
          home_cell: input.phone,
          client_source_id: settings.sourceId
        } })
      }, settings.apiKey);
      contactId = Number(created.id);
      if (!Number.isSafeInteger(contactId) || contactId <= 0) {
        throw new Error('Propstack returned no contact ID');
      }
    }

    // Propstack's website integration links the source to the inquiry note.
    const note = await propstack('/tasks', {
      method: 'POST',
      body: JSON.stringify({ task: {
        title: input.kind === 'valuation' ? 'Website: Immobilienbewertung' : 'Website: Kontaktanfrage',
        note_type_id: settings.noteTypeId,
        client_ids: [contactId],
        client_source_id: settings.sourceId,
        body: noteBody(input)
      } })
    }, settings.apiKey);
    if (!note.id) throw new Error('Propstack returned no inquiry ID');
    return res.status(201).json({ ok: true });
  } catch (error) {
    // Do not log contact details, API keys, or upstream response bodies.
    console.error('Website inquiry could not be saved:', error.message);
    return bad(res, 502, 'Die Anfrage konnte nicht übermittelt werden. Bitte rufen Sie uns an.');
  }
}
