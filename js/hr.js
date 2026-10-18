/* JMG HR Portal — hr.js */
(function () {
'use strict';
const A = App;
const { $, $$, esc, t, call, icon, toast, errMsg, setBusy, fmtNum } = A;

let me, data = null;
const uf = { q: '', dept: '', role: '' };            // users filter
const rf = { emp: '', dept: '', status: '' };        // requests filter

const CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
const opt = (v, l, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(l)}</option>`;
const deptOpts = (sel, label) => opt('', label, !sel) + data.departments.map(d => opt(d, d, d === sel)).join('');
const mgrOpts = (sel, exclude) => opt('', t('none_opt'), !sel) + data.managers.filter(m => m.id !== exclude).map(m => opt(m.id, m.name, m.id === sel)).join('');
const roleOpts = (sel, withAll) => (withAll ? opt('', t('flt_all_roles'), !sel) : '') + ['Employee', 'Manager', 'HR'].map(r => opt(r, t('role_' + r), r === sel)).join('');
const apprChecks = sel => data.departments.map(d => `<label class="check chk-sm"><input type="checkbox" value="${esc(d)}"${sel.indexOf(d) > -1 ? ' checked' : ''}><span class="box">${CHECK}</span><span>${esc(d)}</span></label>`).join('');
const checkBox = (id, label, on) => `<label class="check"><input type="checkbox" id="${id}"${on ? ' checked' : ''}><span class="box">${CHECK}</span><span>${esc(label)}</span></label>`;
function keepSel(el, html) { const v = el.value; el.innerHTML = html; if (Array.from(el.options).some(o => o.value === v)) el.value = v; }

/* ---------- render ---------- */
function renderStats() {
  const u = data.users;
  A.countUp($('#hTotal'), u.length);
  A.countUp($('#hActive'), u.filter(x => x.status === 'Active').length);
  A.countUp($('#hFrozen'), u.filter(x => x.status === 'Frozen').length);
  A.countUp($('#hPend'), data.requests.filter(r => r.status === 'Pending').length);
}

function renderSelects() {
  const checked = $$('#aAppr input:checked').map(i => i.value);
  keepSel($('#aDept'), deptOpts('', t('no_dept')));
  keepSel($('#aMgr'), mgrOpts('', ''));
  keepSel($('#aMgr2'), mgrOpts('', ''));
  $('#aAppr').innerHTML = apprChecks(checked);
  keepSel($('#uDept'), deptOpts('', t('flt_all_depts')));
  keepSel($('#uRole'), roleOpts('', true));
  keepSel($('#rDept'), deptOpts('', t('flt_all_depts')));
  keepSel($('#rEmp'), opt('', t('flt_all_emps'), true) + data.users.slice().sort((a, b) => a.name.localeCompare(b.name)).map(u => opt(u.id, u.name)).join(''));
  keepSel($('#rStat'), opt('', t('flt_all_status'), true) + ['Pending', 'Approved', 'Rejected', 'Cancelled'].map(s => opt(s, t('st_' + s))).join(''));
  uf.dept = $('#uDept').value; uf.role = $('#uRole').value; rf.emp = $('#rEmp').value; rf.dept = $('#rDept').value; rf.status = $('#rStat').value;
}

function renderDepts() {
  $('#deptList').innerHTML = data.departments.map(d => `<span class="chip">${esc(d)}<button type="button" data-dren="${esc(d)}" title="${esc(t('rename_dept_title'))}" aria-label="${esc(t('rename_dept_title'))}">${icon('edit', 14)}</button><button type="button" class="del" data-ddel="${esc(d)}" title="${esc(t('btn_delete'))}" aria-label="${esc(t('btn_delete'))}">${icon('trash', 14)}</button></span>`).join('');
}

function renderUsers() {
  const q = uf.q.trim().toLowerCase();
  const rows = data.users.filter(u => (!uf.dept || u.department === uf.dept) && (!uf.role || u.role === uf.role) && (!q || u.name.toLowerCase().indexOf(q) > -1 || u.id.toLowerCase().indexOf(q) > -1));
  $('#uBody').innerHTML = rows.length ? rows.map((u, i) => {
    const self = u.id === me.id, frozen = u.status === 'Frozen';
    const acts = `<div class="acts">
      <button class="btn btn-soft btn-xs" data-edit="${esc(u.id)}">${icon('edit', 14)}${esc(t('btn_edit_emp'))}</button>
      <button class="btn btn-soft btn-xs" data-bal="${esc(u.id)}">${icon('wallet', 14)}${esc(t('btn_edit_bal'))}</button>
      ${self ? '' : `<button class="btn ${frozen ? 'btn-ok' : 'btn-soft'} btn-xs" data-freeze="${esc(u.id)}">${icon(frozen ? 'play' : 'snow', 14)}${esc(t(frozen ? 'btn_unfreeze' : 'btn_freeze'))}</button>`}
      ${self ? '' : `<button class="btn btn-bad btn-xs" data-del="${esc(u.id)}">${icon('trash', 14)}${esc(t('btn_delete'))}</button>`}
      <button class="btn btn-soft btn-xs" data-pw="${esc(u.id)}" title="${esc(t('btn_reset_pw'))}" aria-label="${esc(t('btn_reset_pw'))}">${icon('key', 14)}</button>
    </div>`;
    const appr = u.approvalDepts && u.approvalDepts.length ? `<span class="sm">${esc(t('appr_label', { list: u.approvalDepts.join(', ') }))}</span>` : '';
    return `<tr style="--i:${Math.min(i, 12)}">
      <td><span class="nm">${esc(u.name)}</span><span class="sm">${esc(u.id)} - ${esc(t('role_' + u.role))}</span>${appr}</td>
      <td>${esc(u.department || '-')}</td>
      <td>${esc(u.managerName || '-')}${u.manager2Name ? `<span class="sm">+ ${esc(u.manager2Name)}</span>` : ''}</td>
      <td>${esc(t('left_of', { r: fmtNum(u.leaveRemaining), t: fmtNum(u.annualBalance) }))}</td>
      <td>${A.badge(u.status)}</td>
      <td>${acts}</td></tr>`;
  }).join('') : `<tr><td colspan="6"><div class="empty">${esc(data.users.length ? t('flt_none') : t('empty_users'))}</div></td></tr>`;
}

function renderRequests() {
  const rows = data.requests.filter(r => (!rf.emp || r.userId === rf.emp) && (!rf.dept || r.department === rf.dept) && (!rf.status || r.status === rf.status)).slice(0, 150);
  $('#rBody').innerHTML = rows.length ? rows.map((r, i) => {
    const act = r.status === 'Pending'
      ? `<div class="acts"><button class="btn btn-ok btn-xs" data-ok="${esc(r.reqId)}">${icon('check', 14)}${esc(t('btn_approve'))}</button><button class="btn btn-bad btn-xs" data-no="${esc(r.reqId)}">${icon('x', 14)}${esc(t('btn_reject'))}</button></div>`
      : A.lockedCell();
    const note = r.status === 'Rejected' && r.note ? `<div class="mnote">${esc(t('mgr_note', { note: r.note }))}</div>` : '';
    return `<tr style="--i:${Math.min(i, 12)}"><td><span class="nm">${esc(r.userName)}</span><span class="sm">${esc(r.reqId)}${r.department ? ' - ' + esc(r.department) : ''}</span></td><td>${A.typeCell(r.type)}</td><td class="dt">${A.describe(r)}${note}</td><td>${A.badge(r.status)}</td><td>${act}</td></tr>`;
  }).join('') : `<tr><td colspan="5"><div class="empty">${esc(t('flt_none'))}</div></td></tr>`;
}

function renderAll() {
  if (!data) return;
  renderStats(); renderSelects(); renderDepts(); renderUsers(); renderRequests();
  $('#exportBtn').innerHTML = icon('download', 18) + esc(t('btn_export'));
  $('#aApprWrap').hidden = $('#aRole').value !== 'Manager';
}

async function load() {
  const key = 'hr_' + me.id, cached = A.cache.get(key);
  if (cached && cached.departments) { data = cached; renderAll(); }
  try { data = await call('hrOverview'); A.cache.set(key, data); renderAll(); } catch (e) { toast(errMsg(e), 'err'); }
}

/* ---------- employees ---------- */
const findUser = id => data.users.find(u => u.id === id);

function showCreds(title, id, password) {
  A.modal({
    title,
    body: `<p>${esc(t('emp_created_body'))}</p><div class="cred">${id ? `<div><span>${esc(t('cred_id'))}</span><code>${esc(id)}</code></div>` : ''}<div><span>${esc(t('cred_pass'))}</span><code>${esc(password)}</code></div></div>`,
    actions: [
      { label: t('btn_copy'), cls: 'btn-soft', close: false, onClick: async () => { try { await navigator.clipboard.writeText(password); toast(t('copied')); } catch (e) { /* clipboard blocked */ } return false; } },
      { label: t('btn_close'), cls: 'btn-gold' }
    ]
  });
}

function editEmp(u) {
  const body = `<div class="form">
    <div class="field"><label for="eName">${esc(t('f_name'))}</label><input class="input" id="eName" maxlength="80" value="${esc(u.name)}"></div>
    <div class="field"><label for="eEmail">${esc(t('f_email'))}</label><input class="input" id="eEmail" type="email" dir="ltr" value="${esc(u.email)}"></div>
    ${checkBox('eOpt', t('f_email_optin'), u.emailOptIn)}
    <div class="row2">
      <div class="field"><label for="eBal">${esc(t('f_balance'))}</label><input class="input" id="eBal" type="number" min="0" max="365" step="0.5" value="${esc(u.annualBalance)}"></div>
      <div class="field"><label for="eDept">${esc(t('f_dept'))}</label><select class="input" id="eDept">${deptOpts(u.department, t('no_dept'))}</select></div>
    </div>
    <div class="row2">
      <div class="field"><label for="eMgr">${esc(t('f_manager'))}</label><select class="input" id="eMgr">${mgrOpts(u.manager, u.id)}</select></div>
      <div class="field"><label for="eMgr2">${esc(t('f_manager2'))}</label><select class="input" id="eMgr2">${mgrOpts(u.manager2, u.id)}</select></div>
    </div>
    <div class="field"><label for="eRole">${esc(t('f_role'))}</label><select class="input" id="eRole"${u.id === me.id ? ' disabled' : ''}>${roleOpts(u.role, false)}</select></div>
    <div class="field" id="eApprWrap"${u.role === 'Manager' ? '' : ' hidden'}>
      <label>${esc(t('f_approval_depts'))}</label>
      <div class="chk-grid" id="eAppr">${apprChecks(u.approvalDepts || [])}</div>
      <span class="hint">${esc(t('approval_hint'))}</span>
    </div></div>`;
  const m = A.modal({
    title: t('edit_emp_title', { name: u.name }), body,
    actions: [
      { label: t('btn_no'), cls: 'btn-soft' },
      { label: t('btn_save'), cls: 'btn-gold', onClick: async ov => {
        const p = {
          id: u.id, name: $('#eName', ov).value.trim(), email: $('#eEmail', ov).value.trim(), emailOptIn: $('#eOpt', ov).checked,
          annualBalance: Number($('#eBal', ov).value), department: $('#eDept', ov).value, manager: $('#eMgr', ov).value, manager2: $('#eMgr2', ov).value,
          role: $('#eRole', ov).value, approvalDepts: $$('#eAppr input:checked', ov).map(i => i.value)
        };
        if (!p.name) { toast(t('err_MISSING'), 'err'); return false; }
        try { await call('hrUpdateUser', p); toast(t('toast_emp_saved')); load(); } catch (ex) { toast(errMsg(ex), 'err'); return false; }
      } }
    ]
  });
  $('#eRole', m.el).addEventListener('change', e => { $('#eApprWrap', m.el).hidden = e.target.value !== 'Manager'; });
}

async function onUserClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  const id = b.dataset.edit || b.dataset.bal || b.dataset.freeze || b.dataset.del || b.dataset.pw;
  const u = id && findUser(id); if (!u) return;

  if (b.dataset.edit) editEmp(u);
  else if (b.dataset.bal) {
    A.modal({
      title: t('edit_bal_title', { name: u.name }),
      body: `<div class="field"><label for="nBal">${esc(t('f_new_balance'))}</label><input class="input" id="nBal" type="number" min="0" max="365" step="0.5" value="${esc(u.annualBalance)}"></div>`,
      actions: [
        { label: t('btn_no'), cls: 'btn-soft' },
        { label: t('btn_save'), cls: 'btn-gold', onClick: async ov => {
          try { await call('hrUpdateBalance', { id: u.id, annualBalance: Number($('#nBal', ov).value) }); toast(t('toast_saved')); load(); } catch (ex) { toast(errMsg(ex), 'err'); return false; }
        } }
      ]
    });
  } else if (b.dataset.freeze) {
    const frozen = u.status === 'Frozen';
    if (!(await A.confirmDialog(t(frozen ? 'confirm_unfreeze' : 'confirm_freeze', { name: u.name })))) return;
    u.status = frozen ? 'Active' : 'Frozen'; renderUsers(); renderStats();
    try { await call('hrSetStatus', { id: u.id, status: frozen ? 'Active' : 'Frozen' }); toast(t(frozen ? 'toast_unfrozen' : 'toast_frozen')); } catch (ex) { toast(errMsg(ex), 'err'); }
    load();
  } else if (b.dataset.del) {
    if (!(await A.confirmDialog(t('confirm_delete', { name: u.name }), { danger: true }))) return;
    data.users = data.users.filter(x => x.id !== u.id); renderUsers(); renderStats();
    try { await call('hrDeleteUser', { id: u.id }); toast(t('toast_deleted')); } catch (ex) { toast(errMsg(ex), 'err'); }
    load();
  } else if (b.dataset.pw) {
    try { const d = await call('hrResetPassword', { id: u.id }); showCreds(t('reset_done_title'), u.id, d.password); } catch (ex) { toast(errMsg(ex), 'err'); }
  }
}

function initAddForm() {
  $('#aRole').addEventListener('change', () => { $('#aApprWrap').hidden = $('#aRole').value !== 'Manager'; });
  $('#addForm').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#aErr'), btn = $('#aBtn'); err.textContent = '';
    const p = {
      name: $('#aName').value.trim(), email: $('#aEmail').value.trim(), emailOptIn: $('#aOptIn').checked, annualBalance: Number($('#aBal').value),
      department: $('#aDept').value, manager: $('#aMgr').value, manager2: $('#aMgr2').value, role: $('#aRole').value,
      approvalDepts: $$('#aAppr input:checked').map(i => i.value), password: $('#aPass').value
    };
    if (!p.name) { err.textContent = t('err_MISSING'); return; }
    setBusy(btn, true);
    try {
      const d = await call('hrAddUser', p);
      $('#addForm').reset(); $('#aBal').value = 21; $('#aOptIn').checked = true; $('#aApprWrap').hidden = true;
      await load();
      showCreds(t('emp_created_title'), d.id, d.password);
    } catch (ex) { err.textContent = errMsg(ex); }
    setBusy(btn, false);
  });
}

/* ---------- departments ---------- */
function initDepts() {
  $('#deptForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#dName').value.trim(); if (!name) return;
    try { await call('hrAddDept', { name }); $('#dName').value = ''; toast(t('toast_dept_added')); await load(); } catch (ex) { toast(errMsg(ex), 'err'); }
  });
  $('#deptList').addEventListener('click', async e => {
    const r = e.target.closest('[data-dren]'), d = e.target.closest('[data-ddel]');
    if (r) {
      const old = r.dataset.dren;
      A.modal({
        title: t('rename_dept_title'),
        body: `<div class="field"><label for="rnName">${esc(t('f_dept_name'))}</label><input class="input" id="rnName" maxlength="40" value="${esc(old)}"></div>`,
        actions: [
          { label: t('btn_no'), cls: 'btn-soft' },
          { label: t('btn_save'), cls: 'btn-gold', onClick: async ov => {
            const name = $('#rnName', ov).value.trim(); if (!name) return false;
            try { await call('hrRenameDept', { old, name }); toast(t('toast_dept_renamed')); load(); } catch (ex) { toast(errMsg(ex), 'err'); return false; }
          } }
        ]
      });
    } else if (d) {
      const name = d.dataset.ddel;
      if (!(await A.confirmDialog(t('confirm_del_dept', { name }), { danger: true }))) return;
      try { await call('hrDeleteDept', { name }); toast(t('toast_dept_deleted')); await load(); } catch (ex) { toast(errMsg(ex), 'err'); }
    }
  });
}

/* ---------- requests ---------- */
async function decideReq(reqId, decision, note) {
  const r = data.requests.find(x => x.reqId === reqId); if (!r) return;
  const prev = { status: r.status, note: r.note };
  r.status = decision; r.note = note || ''; renderRequests(); renderStats();      // instant feedback
  try { await call('decide', { reqId, decision, note }); toast(t(decision === 'Approved' ? 'toast_approved' : 'toast_rejected')); A.loadNotifs(); load(); }
  catch (ex) { r.status = prev.status; r.note = prev.note; renderRequests(); renderStats(); toast(errMsg(ex), 'err'); return false; }
}
function onReqClick(e) {
  const ok = e.target.closest('[data-ok]'), no = e.target.closest('[data-no]');
  if (ok) decideReq(ok.dataset.ok, 'Approved');
  else if (no) {
    A.modal({
      title: t('reject_title'),
      body: `<p>${esc(t('reject_hint'))}</p><div class="field"><textarea class="input" id="rejNote" maxlength="300" placeholder="${esc(t('reject_ph'))}" aria-label="${esc(t('reject_ph'))}"></textarea></div>`,
      actions: [
        { label: t('btn_no'), cls: 'btn-soft' },
        { label: t('btn_confirm_reject'), cls: 'btn-bad', onClick: ov => decideReq(no.dataset.no, 'Rejected', $('#rejNote', ov).value.trim()) }
      ]
    });
  }
}

/* ---------- Excel export (SheetJS): filter by employee / department / period, one sheet per month ---------- */
const HDR = {
  ar: {
    users: ['الكود', 'الاسم', 'الإيميل', 'الدور', 'القسم', 'المدير', 'الرصيد السنوي', 'المستهلك', 'المتبقي', 'الحالة'],
    reqs: ['رقم الطلب', 'الموظف', 'القسم', 'النوع', 'من تاريخ', 'إلى تاريخ', 'من ساعة', 'إلى ساعة', 'جهة المأمورية', 'سلفة / بدل', 'الحالة', 'المدة', 'ملاحظة المدير', 'تاريخ التقديم'],
    perms: ['كود الموظف', 'الاسم', 'الشهر', 'الساعات المستهلكة', 'الساعات المتبقية'],
    att: ['التاريخ', 'كود الموظف', 'الموظف', 'القسم', 'النوع', 'التفاصيل']
  },
  en: {
    users: ['ID', 'Name', 'Email', 'Role', 'Department', 'Manager', 'Annual balance', 'Used', 'Remaining', 'Status'],
    reqs: ['Request #', 'Employee', 'Department', 'Type', 'Start date', 'End date', 'Start time', 'End time', 'Mission destination', 'Needs expenses', 'Status', 'Duration', 'Manager note', 'Submitted'],
    perms: ['User ID', 'Name', 'Month', 'Used hours', 'Remaining hours'],
    att: ['Date', 'User ID', 'Employee', 'Department', 'Type', 'Details']
  }
};
const ym = s => String(s).slice(0, 7);
const inRange = (r, from, to) => (!to || r.startDate <= to) && (!from || (r.endDate || r.startDate) >= from);

function attendanceRows(reqs, from, to) {
  const out = [];
  reqs.filter(r => r.status === 'Approved').forEach(r => {
    const base = [r.userId, r.userName, r.department || '', t('t_' + r.type)];
    if (r.type === 'Leave') {
      const a = A.parseD(r.startDate), b = A.parseD(r.endDate);
      for (const x = new Date(a); x <= b; x.setDate(x.getDate() + 1)) {
        const day = A.isoDate(x);
        if (A.CFG.WEEKEND.indexOf(x.getDay()) > -1 || (from && day < from) || (to && day > to)) continue;
        out.push([day, ...base, `1 ${t('u_days')}`]);
      }
    } else {
      if ((from && r.startDate < from) || (to && r.startDate > to)) return;
      out.push([r.startDate, ...base, r.type === 'Permission' ? `${r.startTime} - ${r.endTime} (${fmtNum(r.duration)} ${t('u_hours')})` : r.mission + (r.needsExpenses ? ` (${t('exp_yes')})` : '')]);
    }
  });
  return out.sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
}
function groupByMonth(rows, getMonth) {
  const g = {};
  rows.forEach(r => { const m = getMonth(r); (g[m] = g[m] || []).push(r); });
  return Object.keys(g).sort().map(m => [m, g[m]]);
}
function sheetFrom(headers, rows, widths) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = widths.map(w => ({ wch: w }));
  return ws;
}

function openExport() {
  const emps = data.users.slice().sort((a, b) => a.name.localeCompare(b.name));
  const m = A.modal({
    title: t('export_title'),
    body: `<div class="form">
      <div class="field"><label for="exEmp">${esc(t('f_ex_emp'))}</label><select class="input" id="exEmp">${opt('', t('flt_all_emps'), true)}${emps.map(u => opt(u.id, `${u.name} (${u.id})`)).join('')}</select></div>
      <div class="field"><label for="exDept">${esc(t('f_ex_dept'))}</label><select class="input" id="exDept">${deptOpts('', t('flt_all_depts'))}</select></div>
      <div class="field"><label>${esc(t('f_ex_period'))}</label>
        <div class="tabs" id="exMode"><button type="button" class="on" data-m="all">${esc(t('ex_all'))}</button><button type="button" data-m="range">${esc(t('ex_range'))}</button></div></div>
      <div class="row2" id="exRange" hidden>
        <div class="field"><label for="exFrom">${esc(t('f_from'))}</label><input class="input" type="date" id="exFrom"></div>
        <div class="field"><label for="exTo">${esc(t('f_to'))}</label><input class="input" type="date" id="exTo"></div>
      </div>
      ${checkBox('exSplit', t('ex_split'), true)}
    </div>`,
    actions: [
      { label: t('btn_no'), cls: 'btn-soft' },
      { label: t('btn_download'), cls: 'btn-gold', onClick: ov => exportExcel(ov) }
    ]
  });
  $$('#exMode button', m.el).forEach(b => b.addEventListener('click', () => {
    $$('#exMode button', m.el).forEach(x => x.classList.toggle('on', x === b));
    $('#exRange', m.el).hidden = b.dataset.m !== 'range';
  }));
}

async function exportExcel(ov) {
  if (typeof XLSX === 'undefined') { toast(t('err_NETWORK'), 'err'); return false; }
  const emp = $('#exEmp', ov).value, dept = $('#exDept', ov).value, split = $('#exSplit', ov).checked;
  const range = $('#exMode .on', ov).dataset.m === 'range';
  const from = range ? $('#exFrom', ov).value : '', to = range ? $('#exTo', ov).value : '';
  if (from && to && from > to) { toast(t('err_BAD_RANGE'), 'err'); return false; }
  let d;
  try { d = await call('hrExport'); } catch (e) { toast(errMsg(e), 'err'); return false; }

  const users = d.users.filter(u => (!emp || u.id === emp) && (!dept || u.department === dept));
  const ids = new Set(users.map(u => u.id));
  const reqs = d.requests.filter(r => ids.has(r.userId) && inRange(r, from, to)).sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0));
  if (!users.length && !reqs.length) { toast(t('ex_empty'), 'err'); return false; }

  const H = HDR[A.State.lang], yes = A.State.lang === 'ar' ? 'نعم' : 'Yes', no = A.State.lang === 'ar' ? 'لا' : 'No';
  const reqRow = r => [r.reqId, r.userName, r.department || '', t('t_' + r.type), r.startDate, r.endDate, r.startTime, r.endTime, r.mission, r.type === 'Mission' ? (r.needsExpenses ? yes : no) : '', t('st_' + r.status), r.duration, r.note, String(r.createdAt || '').slice(0, 16).replace('T', ' ')];
  const reqW = [10, 22, 14, 12, 12, 12, 9, 9, 22, 12, 14, 8, 28, 18], attW = [12, 12, 24, 14, 12, 44];

  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: A.State.lang === 'ar' }] };
  XLSX.utils.book_append_sheet(wb, sheetFrom(H.users, users.map(u => [u.id, u.name, u.email, t('role_' + u.role), u.department, u.manager, u.annualBalance, u.leaveUsed, u.leaveRemaining, t('st_' + u.status)]), [10, 24, 28, 14, 16, 22, 14, 10, 10, 12]), t('sheet_users'));

  const agg = {};
  reqs.filter(r => r.type === 'Permission' && r.status === 'Approved').forEach(r => { const k = ym(r.startDate) + '|' + r.userId; agg[k] = (agg[k] || 0) + r.duration; });
  const permRows = Object.keys(agg).sort().map(k => { const [m, uid] = k.split('|'), u = d.users.find(x => x.id === uid), used = A.r2(agg[k]); return [uid, u ? u.name : uid, m, used, A.r2(Math.max(0, A.CFG.PERMISSION_HOURS - used))]; });
  XLSX.utils.book_append_sheet(wb, sheetFrom(H.perms, permRows, [12, 24, 10, 18, 18]), t('sheet_perms'));

  const att = attendanceRows(reqs, from, to);
  if (split) {
    groupByMonth(reqs, r => ym(r.startDate)).forEach(([m, rows]) => XLSX.utils.book_append_sheet(wb, sheetFrom(H.reqs, rows.map(reqRow), reqW), `${t('sheet_reqs')} ${m}`));
    groupByMonth(att, r => ym(r[0])).forEach(([m, rows]) => XLSX.utils.book_append_sheet(wb, sheetFrom(H.att, rows, attW), `${t('sheet_att')} ${m}`));
  } else {
    XLSX.utils.book_append_sheet(wb, sheetFrom(H.reqs, reqs.map(reqRow), reqW), t('sheet_reqs'));
    XLSX.utils.book_append_sheet(wb, sheetFrom(H.att, att, attW), t('sheet_att'));
  }
  const who = emp || (dept ? dept.replace(/[^\w]+/g, '_') : 'All');
  XLSX.writeFile(wb, `JMG-HR-${who}-${from || to ? (from || 'start') + '_' + (to || 'now') : 'AllData'}.xlsx`);
  toast(t('export_done'));
}

/* ---------- boot ---------- */
A.boot({
  page: 'hr',
  roles: ['HR'],
  onReady(u) {
    me = u;
    initAddForm(); initDepts();
    $('#exportBtn').addEventListener('click', () => { if (data) openExport(); });
    $('#uBody').addEventListener('click', onUserClick);
    $('#rBody').addEventListener('click', onReqClick);
    $('#uQ').addEventListener('input', e => { uf.q = e.target.value; renderUsers(); });
    $('#uDept').addEventListener('change', e => { uf.dept = e.target.value; renderUsers(); });
    $('#uRole').addEventListener('change', e => { uf.role = e.target.value; renderUsers(); });
    $('#rEmp').addEventListener('change', e => { rf.emp = e.target.value; renderRequests(); });
    $('#rDept').addEventListener('change', e => { rf.dept = e.target.value; renderRequests(); });
    $('#rStat').addEventListener('change', e => { rf.status = e.target.value; renderRequests(); });
    A.onLang(renderAll);
    load();
  }
});
})();
