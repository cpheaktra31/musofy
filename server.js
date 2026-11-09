(() => {
  'use strict';

  const http = require('http');
  const fs = require('fs');
  const path = require('path');

  const DATA_FILE = path.join(__dirname, 'assets/data/contact.json');
  const PORT = process.env.PORT || 3000;
  const HOST = process.env.HOST || '127.0.0.1';

  function readContacts() {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf8').trim();
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function writeContacts(contacts) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(contacts, null, 2) + '\n', 'utf8');
  }

  function jsonResponse(res, status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(payload),
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(payload);
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    // Handle preflight CORS
    if (req.method === 'OPTIONS') {
      jsonResponse(res, 204, {});
      return;
    }

    // POST /api/contact — save a contact form submission to contact.json
    if (req.method === 'POST' && url.pathname === '/api/contact') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        let submission;
        try {
          submission = JSON.parse(body || '{}');
        } catch (err) {
          jsonResponse(res, 400, { error: 'Invalid JSON body.' });
          return;
        }
        const { name, email, subject, message } = submission;
        try {
          if (!name || !email || !subject || !message) {
            jsonResponse(res, 400, { error: 'All fields are required.' });
            return;
          }
          const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRe.test(email)) {
            jsonResponse(res, 400, { error: 'Please enter a valid email address.' });
            return;
          }
          const contacts = readContacts();
          const entry = {
            name: String(name).trim(),
            email: String(email).trim(),
            subject: String(subject).trim(),
            message: String(message).trim(),
            submittedAt: new Date().toISOString()
          };
          contacts.push(entry);
          writeContacts(contacts);
          jsonResponse(res, 201, { ok: true, message: 'Message saved.' });
        } catch (err) {
          console.error('Failed to save contact submission:', err);
          jsonResponse(res, 500, { error: 'Could not save your message. Please try again later.' });
        }
      });
      return;
    }

    jsonResponse(res, 404, { error: 'Not found.' });
  });

  server.listen(PORT, HOST, () => {
    console.log(`Contact form server listening on http://${HOST}:${PORT}`);
    console.log(`Saving submissions to ${DATA_FILE}`);
  });

})();
