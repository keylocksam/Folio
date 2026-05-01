// Folio API — Netlify Function v6
// Fixed firm lookup + email notifications via Netlify

const AT_TOKEN = 'patbY0nSxzUFw0ptV.974aebb5096477127e16d55af13c3e7c8082a4be9f4d391e495a080a8f19cd53';
const AT_BASE  = 'appqtbeYq7zl7x89u';
const AT_URL   = `https://api.airtable.com/v0/${AT_BASE}/`;
const FIRMS       = 'tblLRjsZVsRN1qTHX';
const SUBMISSIONS = 'tblCzFiFu6rtXT6oE';

// Field IDs
const FF = {
  name:'fldfzXfmMr9bpoXqK', slug:'fldItkXIagZXR22Pa', plan:'fldffezFiqb3txqy8',
  email:'fldOrY1ivOeb6uSTm', active:'fldBVESxOZZvSiewK',
  advname:'fldI2KWFNmEh5RCV1', passhash:'fldnz330tgkYX2CWV'
};
const SF = {
  name:'fldOCOX6iN1O1lpMf', firm:'fldXVvJXAFs3uTKhL', age:'fld3EJnTLBDLkEAtu',
  state:'fldPySCWPTikmqYFt', emp:'fldUZGOZ8B124Efal', income:'fldeowAsoGBTGyTwd',
  expenses:'fldaeSvWtn3lzMjkx', debt:'fld1ivL1OXOH2bsw5', savings:'fld5kp1PxueDxzkHl',
  surplus:'fldIcl308wivTUY4p', takehome:'fldfhcSCy6uwV1oO4', dti:'fldFmqbACHafg0ppz',
  score:'fldrABOY8ahxhEhlI', goals:'fldbjJAVDGktFV9Yq', budget:'fldrhyN6NK2AMykSP',
  challenge:'fldhLqhPlDXQnQ2ua', status:'fldIFCI5NOAsmOa4R', submitted:'fldDYsBw2G4UAVis4'
};

const CORS = {
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'Content-Type',
  'Access-Control-Allow-Methods':'GET, POST, PATCH, OPTIONS',
  'Content-Type':'application/json'
};
const ok  = d => ({ statusCode:200, headers:CORS, body:JSON.stringify(d) });
const err = (m,c=400) => ({ statusCode:c, headers:CORS, body:JSON.stringify({error:m}) });

// Fetch ALL records from a table (handles pagination)
async function atFetchAll(table) {
  let records = [], offset = null;
  do {
    let url = AT_URL + encodeURIComponent(table) + '?pageSize=100';
    if (offset) url += '&offset=' + offset;
    const r = await fetch(url, { headers:{'Authorization':'Bearer '+AT_TOKEN} });
    const d = await r.json();
    if (d.error) throw new Error('AT: ' + (d.error.message||JSON.stringify(d.error)));
    records = records.concat(d.records || []);
    offset = d.offset;
  } while (offset);
  return records;
}

// Fetch with formula filter (use field NAMES in formulas, not IDs)
async function atFetch(table, filter) {
  let url = AT_URL + encodeURIComponent(table);
  if (filter) url += '?filterByFormula=' + encodeURIComponent(filter);
  const r = await fetch(url, { headers:{'Authorization':'Bearer '+AT_TOKEN} });
  const d = await r.json();
  if (d.error) throw new Error('AT: ' + (d.error.message||JSON.stringify(d.error)));
  return d.records || [];
}

async function atPost(table, fields) {
  const r = await fetch(AT_URL + encodeURIComponent(table), {
    method:'POST', headers:{'Authorization':'Bearer '+AT_TOKEN,'Content-Type':'application/json'},
    body: JSON.stringify({fields})
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message||JSON.stringify(d.error));
  return d;
}

async function atPatch(table, id, fields) {
  const r = await fetch(AT_URL + encodeURIComponent(table)+'/'+id, {
    method:'PATCH', headers:{'Authorization':'Bearer '+AT_TOKEN,'Content-Type':'application/json'},
    body: JSON.stringify({fields})
  });
  return r.json();
}

// Get field value — checks by ID first, then by any named fallbacks
function fv(fields, id, ...names) {
  if (fields[id] !== undefined && fields[id] !== null) return fields[id];
  for (const n of names) {
    if (n && fields[n] !== undefined && fields[n] !== null) return fields[n];
  }
  return '';
}

// Find firm by slug — fetches all and filters in JS (most reliable)
async function findFirmBySlug(slug) {
  if (!slug) return null;
  const all = await atFetchAll(FIRMS);
  const match = all.find(r => {
    // Check field ID first, then display name
    const byId   = r.fields[FF.slug];
    const byName = r.fields['Slug'] || r.fields['slug'];
    const s = (byId || byName || '').toString().trim().toLowerCase();
    return s === slug.trim().toLowerCase();
  });
  return match || null;
}

// Find firm by email — fetches all and filters in JS
async function findFirmByEmail(email) {
  const all = await atFetchAll(FIRMS);
  return all.find(r => {
    const e = fv(r.fields, FF.email, 'Billing Email', 'Email', 'email');
    return e.toLowerCase() === email.toLowerCase();
  }) || null;
}

// Send email notification via Netlify Forms webhook
async function sendEmailNotification(advisorEmail, advisorName, firmName, prospect) {
  // Use Netlify's built-in form submission for email notifications
  // This triggers the email notification Netlify sends for form submissions
  try {
    const body = new URLSearchParams({
      'form-name': 'prospect-notification',
      'advisor-email': advisorEmail,
      'advisor-name': advisorName,
      'firm-name': firmName,
      'prospect-name': prospect.name || 'Unknown',
      'prospect-score': String(prospect.score || 0),
      'prospect-income': String(prospect.income || 0),
      'prospect-debt': String(prospect.debt || 0),
      'prospect-surplus': String(prospect.surplus || 0),
      'prospect-goals': Array.isArray(prospect.goals) ? prospect.goals.join(', ') : (prospect.goals || ''),
      'prospect-state': prospect.state || '',
      'dashboard-link': `https://folioooooooo.netlify.app/dashboard.html?firm=${prospect.firmSlug || ''}`
    });

    // Post to Netlify forms
    await fetch('https://folioooooooo.netlify.app/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });
  } catch(e) {
    console.warn('Email notification failed:', e.message);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return {statusCode:200,headers:CORS,body:''};
  const action = event.queryStringParameters?.action;
  let body = {};
  try { body = event.body ? JSON.parse(event.body) : {}; } catch(e){}

  try {

    // ── DEBUG ─────────────────────────────────────────────────
    if (action === 'debug-firms') {
      const all = await atFetchAll(FIRMS);
      return ok({ count: all.length, first: all[0]?.fields || null });
    }

    if (action === 'debug-submissions') {
      const slug = event.queryStringParameters?.slug || 'samtest';
      const firm = await findFirmBySlug(slug);
      const firmId = firm ? firm.id : null;
      const allSubs = await atFetchAll(SUBMISSIONS);
      const firstSub = allSubs[0] || null;
      const filtered = allSubs.filter(r => {
        // Check both field ID and field name for the firm link
        const links = r.fields[SF.firm] || r.fields['Firm'] || r.fields['firm'] || [];
        return Array.isArray(links) && links.includes(firmId);
      });
      return ok({
        firmId,
        totalSubs: allSubs.length,
        filteredCount: filtered.length,
        firstSubFields: firstSub ? firstSub.fields : null,
        firstSubFirmField: firstSub ? firstSub.fields[SF.firm] : null,
        SF_firm: SF.firm
      });
    }

    // ── SIGNUP ────────────────────────────────────────────────
    if (action === 'signup') {
      const { name, email, firm, slug, passHash } = body;
      if (!slug) return err('Missing slug');
      // Check duplicate
      const existing = await findFirmBySlug(slug);
      if (existing) return err('DUPLICATE_SLUG');
      await atPost(FIRMS, {
        [FF.name]:firm, [FF.slug]:slug, [FF.email]:email,
        [FF.plan]:'Free', [FF.active]:true, [FF.advname]:name, [FF.passhash]:passHash
      });
      return ok({success:true, slug});
    }

    // ── LOGIN BY EMAIL ────────────────────────────────────────
    if (action === 'login-email') {
      const { email, passHash } = body;
      if (!email) return err('Email required');
      const record = await findFirmByEmail(email);
      if (!record) return err('NOT_FOUND');
      const f = record.fields;
      const slug       = fv(f, FF.slug,     'Slug',          'slug')     || '';
      const storedHash = fv(f, FF.passhash, 'Password Hash', 'password') || '';
      const firmName   = fv(f, FF.name,     'Firm Name',     'Name')     || '';
      if (passHash !== '__lookup__') {
        if (storedHash && storedHash !== passHash) return err('WRONG_PASSWORD');
      }
      return ok({success:true, slug, firmName});
    }

    // ── LOGIN BY SLUG ─────────────────────────────────────────
    if (action === 'login-slug') {
      const { slug, passHash } = body;
      if (!slug) return err('Slug required');
      const record = await findFirmBySlug(slug);
      if (!record) return err('NOT_FOUND');
      const f = record.fields;
      const storedHash = fv(f, FF.passhash, 'Password Hash') || '';
      const firmName   = fv(f, FF.name,     'Firm Name', 'Name') || '';
      if (storedHash && storedHash !== passHash) return err('WRONG_PASSWORD');
      return ok({success:true, slug, firmName});
    }

    // ── GET FIRM ──────────────────────────────────────────────
    if (action === 'get-firm') {
      const slug = event.queryStringParameters?.slug;
      if (!slug) return err('Slug required');
      const record = await findFirmBySlug(slug);
      if (!record) return ok({firm:null});
      const f = record.fields;
      return ok({firm:{
        id:       record.id,
        name:     fv(f, FF.name,    'Firm Name', 'Name') || '',
        slug:     fv(f, FF.slug,    'Slug')               || '',
        email:    fv(f, FF.email,   'Billing Email', 'Email') || '',
        advisorName: fv(f, FF.advname, 'Advisor Name')    || '',
        plan:     fv(f, FF.plan,    'Plan')               || 'Free'
      }});
    }

    // ── GET PROSPECTS ─────────────────────────────────────────
    if (action === 'get-prospects') {
      const slug = event.queryStringParameters?.slug;
      if (!slug) return err('Slug required');
      const firm = await findFirmBySlug(slug);
      if (!firm) return ok({prospects:[]});
      const firmId = firm.id;
      const allSubs = await atFetchAll(SUBMISSIONS);
      const filtered = allSubs.filter(r => {
        // Check both field ID and field name for the firm link
        const links = r.fields[SF.firm] || r.fields['Firm'] || r.fields['firm'] || [];
        return Array.isArray(links) && links.includes(firmId);
      });
      const prospects = filtered.map(r => {
        const f = r.fields;
        const goals = fv(f, SF.goals, 'Goals') || '';
        return {
          id:r.id,
          name:       fv(f,SF.name,     'Name')             || 'Unknown',
          age:        fv(f,SF.age,      'Age')              || 0,
          state:      fv(f,SF.state,    'State')            || '',
          employment: fv(f,SF.emp,      'Employment')       || '',
          income:     fv(f,SF.income,   'Income')           || 0,
          savings:    fv(f,SF.savings,  'Savings')          || 0,
          debt:       fv(f,SF.debt,     'Total Debt')       || 0,
          surplus:    fv(f,SF.surplus,  'Monthly Surplus')  || 0,
          takeHome:   fv(f,SF.takehome, 'Monthly Take-Home')|| 0,
          dti:        fv(f,SF.dti,      'DTI Percent')      || 0,
          score:      fv(f,SF.score,    'Health Score')     || 0,
          goals:      goals ? goals.split(',').map(g=>g.trim()).filter(Boolean) : [],
          budget:     fv(f,SF.budget,   'Budget Habits')    || '',
          challenge:  fv(f,SF.challenge,'Biggest Challenge')|| '',
          status:     fv(f,SF.status,   'Status')           || 'New',
          submitted:  fv(f,SF.submitted,'Submitted At')     || r.createdTime || ''
        };
      });
      return ok({prospects});
    }

    // ── SAVE SUBMISSION ───────────────────────────────────────
    if (action === 'save-submission') {
      const { slug, submission:s } = body;
      if (!slug || !s) return err('Missing data');

      // Find firm by slug to get the record ID for linking
      const firm = await findFirmBySlug(slug);
      const firmId = firm ? firm.id : null;

      // Get advisor email for notification
      const advisorEmail = firm ? fv(firm.fields, FF.email, 'Billing Email', 'Email') : null;
      const advisorName  = firm ? fv(firm.fields, FF.advname, 'Advisor Name') : null;
      const firmName     = firm ? fv(firm.fields, FF.name, 'Firm Name', 'Name') : slug;

      // Save to Airtable
      const result = await atPost(SUBMISSIONS, {
        [SF.name]:      s.name || '',
        [SF.age]:       s.age || 0,
        [SF.state]:     s.state || '',
        [SF.emp]:       s.employment || '',
        [SF.income]:    s.income || 0,
        [SF.expenses]:  s.expenses || 0,
        [SF.debt]:      s.debt || 0,
        [SF.savings]:   s.savings || 0,
        [SF.surplus]:   s.surplus || 0,
        [SF.takehome]:  s.takeHome || 0,
        [SF.dti]:       s.dti || 0,
        [SF.score]:     s.score || 0,
        [SF.goals]:     Array.isArray(s.goals) ? s.goals.join(', ') : (s.goals||''),
        [SF.budget]:    s.budget || '',
        [SF.challenge]: s.challenge || '',
        [SF.status]:    'New',
        [SF.submitted]: new Date().toISOString(),
        ...(firmId ? {[SF.firm]: [firmId]} : {})
      });

      // Send email notification to advisor
      if (advisorEmail) {
        await sendEmailNotification(advisorEmail, advisorName, firmName, {
          ...s, firmSlug: slug
        });
      }

      return ok({success:true, id: result.id});
    }

    // ── UPDATE STATUS ─────────────────────────────────────────
    if (action === 'update-status') {
      const {id, status} = body;
      if (!id||!status) return err('Missing data');
      await atPatch(SUBMISSIONS, id, {[SF.status]:status});
      return ok({success:true});
    }

    // ── GET ALL FIRMS (admin) ─────────────────────────────────
    if (action === 'get-all-firms') {
      const records = await atFetchAll(FIRMS);
      return ok({firms: records.map(r => ({
        id:r.id,
        name:        fv(r.fields, FF.name,    'Firm Name','Name') || '',
        slug:        fv(r.fields, FF.slug,    'Slug')              || '',
        email:       fv(r.fields, FF.email,   'Billing Email','Email') || '',
        advisorName: fv(r.fields, FF.advname, 'Advisor Name')     || '',
        plan:        fv(r.fields, FF.plan,    'Plan')             || 'Free',
        createdAt:   r.createdTime
      }))});
    }

    return err('Unknown action', 404);

  } catch(e) {
    console.error('API error:', e.message);
    return err(e.message, 500);
  }
};
