(() => {
  const $ = id => document.getElementById(id);
  const embeddedEvaluation = new URLSearchParams(window.location.search).get('embed') === '1';
  if (embeddedEvaluation) document.body.classList.add('evaluation-embedded');
  const resultLabels = {dat:'Đậu',can_nhac:'Cân nhắc',rot:'Rớt',vong_tiep:'Sang vòng tiếp'};
  let storedUser = {}; try { storedUser = JSON.parse(localStorage.getItem('nguoi_dung') || '{}'); } catch {}
  const user = window.appUser || storedUser || {};
  const role = String(user.vai_tro || user.role || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[\s-]+/g,'_');
  const isManager = ['admin','administrator','manager','quan_ly','leader','team_leader'].includes(role);
  const isHR = isManager || ['hr','recruiter','nhan_su','nhan_su_tuyen_dung'].includes(role);
  const isInterviewer = ['interviewer','interview','nguoi_phong_van','nguoiphongvan','phong_van'].includes(role);
  let feedbacks = [], schedules = [], criteria = [], campaigns = [], selectedCampaignId = 0;
  const esc = window.escapeHtml || (v => String(v ?? ''));
  const rowsFrom = window.rowsFrom || (v => Array.isArray(v) ? v : v?.data || []);
  const api = window.api || (async (url, options={}) => {
    const token=localStorage.getItem('token');
    const response=await fetch(url,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(options.headers||{})}});
    const raw=await response.text();let data={};try{data=raw?JSON.parse(raw):{}}catch{throw new Error('Máy chủ trả về dữ liệu không hợp lệ');}
    if(!response.ok)throw new Error(data.message||'Yêu cầu không thành công');return data;
  });
  const label = value => resultLabels[value] || value || '—';
  const date = value => { if(!value) return ''; const d = new Date(String(value).replace(' ','T')); return Number.isNaN(d.getTime()) ? esc(value) : d.toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}); };
  function notice(message,type='error',id='notice'){const el=$(id);el.textContent=message;el.className='notice '+type;el.hidden=false;}
  function clearNotice(id){const el=$(id);el.hidden=true;el.textContent='';}
  function renderInterviewReadonly(schedule){
    const box=$('interviewReadonly'); if(!box) return;
    if(!schedule){box.textContent='Chưa chọn lịch phỏng vấn';return;}
    const mode=String(schedule.hinh_thuc||'').toLowerCase(); const modeLabel=mode==='online'||mode.includes('truc_tuyen')||mode.includes('trực tuyến')?'Trực tuyến (Online)':mode==='offline'||mode.includes('truc_tiep')||mode.includes('trực tiếp')?'Trực tiếp (Offline)':(schedule.hinh_thuc||''); const items=[['Ứng viên',schedule.ten_ung_vien||''],['Đợt tuyển dụng',schedule.ten_dot_tuyen||''],['Vòng',schedule.vong_phong_van||''],['Ngày phỏng vấn',date(schedule.thoi_gian)],['Hình thức phỏng vấn',modeLabel],['Địa điểm / Link phỏng vấn',schedule.dia_diem||'']];
    box.innerHTML=items.map(([k,v])=>`<label class="readonly-item"><span>${esc(k)}</span><input type="text" readonly aria-readonly="true" value="${esc(v)}"></label>`).join('');
  }
  function openModal(id){$(id).classList.add('show');$(id).setAttribute('aria-hidden','false');}
  function closeModal(id){$(id).classList.remove('show');$(id).setAttribute('aria-hidden','true');if(embeddedEvaluation&&id==='feedbackModal'&&window.parent!==window)window.parent.postMessage({type:'tuyendung-ai-close-evaluation'},window.location.origin);}
  function grouped(){
    const map=new Map();
    for(const f of feedbacks){const id=Number(f.phong_van_id);if(!map.has(id))map.set(id,{...f,phong_van_id:id,feedbacks:[]});const g=map.get(id);g.feedbacks.push(f);g.ten_ung_vien=g.ten_ung_vien||f.ten_ung_vien;g.vong_phong_van=g.vong_phong_van||f.vong_phong_van;g.quyet_dinh_cuoi=g.quyet_dinh_cuoi||f.quyet_dinh_cuoi;g.ghi_chu_quyet_dinh=g.ghi_chu_quyet_dinh||f.ghi_chu_quyet_dinh;g.email_trang_thai=g.email_trang_thai||f.email_trang_thai;g.email_da_gui_luc=g.email_da_gui_luc||f.email_da_gui_luc;}
    return [...map.values()].map(g=>{const scores=g.feedbacks.map(f=>Number(f.diem_tong)).filter(Number.isFinite);g.diem_trung_binh=scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null;g.ten_nguoi_danh_gia_tong=g.feedbacks.map(f=>f.ten_nguoi_danh_gia||('Tài khoản #'+f.nguoi_danh_gia_id)).join(', ');g.de_xuat_tong=[...new Set(g.feedbacks.map(f=>f.de_xuat).filter(Boolean))];return g;});
  }
  function render(){
    const q=$('q').value.trim().toLocaleLowerCase('vi'), proposal=$('locDeXuat').value, decision=$('locQuyetDinh').value;
    const all=grouped();
    const data=all.filter(g=>{
      const text=[g.ten_ung_vien,g.email_ung_vien,g.ten_nguoi_danh_gia_tong,g.vong_phong_van].join(' ').toLocaleLowerCase('vi');
      return (!q||text.includes(q))&&(!proposal||g.de_xuat_tong.includes(proposal))&&(!decision||(decision==='chua'?!g.quyet_dinh_cuoi:g.quyet_dinh_cuoi===decision));
    });
    $('rows').innerHTML=data.map(g=>{
      const suggestions=g.de_xuat_tong.map(v=>`<span class="badge ${v==='dat'?'green':v==='rot'?'red':'amber'}">${esc(label(v))}</span>`).join(' ');
      const decisionBadge=g.quyet_dinh_cuoi?`<span class="badge ${g.quyet_dinh_cuoi==='dat'?'green':g.quyet_dinh_cuoi==='rot'?'red':'amber'}">${esc(label(g.quyet_dinh_cuoi))}</span>`:'<span class="badge">Chưa quyết định</span>';
      const emailBadge=g.email_trang_thai==='da_gui'?`<span class="badge green">Đã gửi</span><div class="muted">${esc(date(g.email_da_gui_luc))}</div>`:g.email_trang_thai==='loi'?'<span class="badge red">Gửi lỗi</span>':'<span class="badge">Chưa gửi</span>';
      const actions=[];
      if(isInterviewer||isManager) actions.push(`<button class="btn mini" data-feedback="${g.phong_van_id}">Feedback</button>`);
      if(isManager) actions.push(`<button class="btn mini" data-decision="${g.phong_van_id}">Quyết định</button>`);
      if(isHR&&g.quyet_dinh_cuoi) actions.push(`<button class="btn mini primary" data-email="${g.phong_van_id}">${g.email_trang_thai==='da_gui'?'Gửi lại email':'Gửi kết quả'}</button>`);
      return `<tr><td><div class="candidate">${esc(g.ten_ung_vien||('Ứng viên #'+g.ung_vien_id))}</div><div class="muted">${esc(g.vong_phong_van||'Vòng phỏng vấn')} · Lịch #${g.phong_van_id}</div><div class="muted">${g.feedbacks.length} lượt đánh giá</div></td><td>${esc(g.ten_nguoi_danh_gia_tong||'—')}</td><td><strong>${g.diem_trung_binh===null?'—':g.diem_trung_binh.toFixed(2)+'/10'}</strong>${g.feedbacks.length?`<div class="muted">${g.feedbacks.map(f=>esc((f.ten_nguoi_danh_gia||'Người đánh giá')+': '+Number(f.diem_tong).toFixed(1))).join('<br>')}</div>`:''}</td><td>${suggestions||'—'}</td><td>${decisionBadge}${g.ghi_chu_quyet_dinh?`<div class="muted">${esc(g.ghi_chu_quyet_dinh)}</div>`:''}</td><td>${emailBadge}</td><td><div class="row-actions">${actions.join('')||'—'}</div></td></tr>`;
    }).join('');
    $('empty').hidden=data.length>0;
    $('statFeedback').textContent=feedbacks.length;
    $('statSchedules').textContent=all.length;
    $('statPending').textContent=all.filter(g=>!g.quyet_dinh_cuoi).length;
    $('statSent').textContent=all.filter(g=>g.email_trang_thai==='da_gui').length;
  }
  function renderCriteria(){
    $('criteriaList').innerHTML=criteria.filter(c=>Number(c.dang_dung)!==0).map(c=>`<div class="criteria-item"><b>${esc(c.ten)}</b><span class="criteria-status">Đang áp dụng</span><p class="criteria-desc">${esc(c.mo_ta||'Tiêu chí đánh giá phỏng vấn')}</p><span>Trọng số ${Number(c.trong_so)}% · Tối đa ${Number(c.diem_toi_da)}/10</span></div>`).join('')||'<p class="muted">Chưa có tiêu chí.</p>';
    const activeCriteria=criteria.filter(c=>Number(c.dang_dung)!==0); const total=activeCriteria.reduce((sum,c)=>sum+Number(c.trong_so||0),0);
    $('criteriaSummary').innerHTML=`<span class="summary-chip"><strong>${activeCriteria.length}</strong> tiêu chí đang dùng</span><span class="summary-chip"><strong>${Number(total.toFixed(2))}%</strong> tổng trọng số</span>`;
    $('btnCriteria').hidden=!isManager;
    $('scoreFields').innerHTML=criteria.filter(c=>Number(c.dang_dung)!==0).map(c=>`<div class="score-field"><div class="score-field-head"><label for="score_${c.id}">${esc(c.ten)} <em>*</em></label><span class="score-weight">${Number(c.trong_so)}%</span></div><small>${esc(c.mo_ta||'Tiêu chí đánh giá')} · Thang điểm 0–${Number(c.diem_toi_da)}</small><div class="score-row"><input id="score_${c.id}" data-score-id="${c.id}" type="number" min="0" max="${Number(c.diem_toi_da)}" step="0.1" value="" placeholder="0 – ${Number(c.diem_toi_da)}" required><span class="score-max">/ ${Number(c.diem_toi_da)}</span></div></div>`).join('');
    let totalBox=$('interviewScoreTotal');
    if(!totalBox){totalBox=document.createElement('div');totalBox.id='interviewScoreTotal';totalBox.className='interview-score-total';$('scoreFields').insertAdjacentElement('afterend',totalBox);}
    updateInterviewScore();
  }
  function updateInterviewScore(){
    const active=criteria.filter(c=>Number(c.dang_dung)!==0);
    let weighted=0,weightTotal=0,complete=true;
    for(const c of active){
      const input=document.querySelector(`[data-score-id="${c.id}"]`);
      const raw=input?.value?.trim()??'';
      const weight=Number(c.trong_so)||0, max=Number(c.diem_toi_da)||10;
      if(raw===''||!Number.isFinite(Number(raw))){complete=false;continue;}
      weighted+=(Number(raw)/max)*weight; weightTotal+=weight;
    }
    const box=$('interviewScoreTotal');
    if(box)box.innerHTML=`<span>Điểm phỏng vấn</span><strong>${complete&&active.length?((weighted/100)*10).toFixed(2):weightTotal?((weighted/100)*10).toFixed(2):'—'} / 10</strong>`;
  }
  function findExistingFeedback(scheduleId){
    const matches=feedbacks.filter(f=>Number(f.phong_van_id)===Number(scheduleId));
    return matches.find(f=>Number(f.nguoi_danh_gia_id)===Number(user.id)) || matches[0] || null;
  }
  function restoreFeedback(existing){
    if(!existing)return;
    const saved=existing.diem_json&&typeof existing.diem_json==='object'?existing.diem_json:{};
    for(const input of document.querySelectorAll('[data-score-id]')){
      const item=saved[input.dataset.scoreId];
      const value=item&&typeof item==='object'?item.diem:item;
      input.value=value===undefined||value===null?'':String(value);
    }
    $('de_xuat').value=existing.de_xuat||'can_nhac';
    $('nhan_xet').value=existing.nhan_xet||'';
    updateInterviewScore();
  }
  function criterionRow(c={}){
    const active=c.active!==false && Number(c.dang_dung)!==0;
    return `<div class="criteria-editor-row ${active?'':'inactive'}" data-criterion-row data-id="${c.id||''}" data-active="${active?'1':'0'}"><div class="criterion-main"><input data-criterion-name maxlength="150" placeholder="Tên tiêu chí, ví dụ: Giao tiếp" value="${esc(c.ten||'')}" ${active?'required':''}><textarea data-criterion-desc maxlength="500" rows="2" placeholder="Mô tả cách đánh giá">${esc(c.mo_ta||'')}</textarea></div><div class="field"><label>Trọng số (%)</label><input data-criterion-weight type="number" min="0.1" max="100" step="0.1" value="${Number(c.trong_so??10)}" ${active?'required':''}></div><div class="field"><label>Điểm tối đa</label><input data-criterion-max type="number" min="0.1" max="10" step="0.1" value="${Number(c.diem_toi_da??10)}" ${active?'required':''}></div><div class="criterion-state"><span class="state-label">${active?'Đang dùng':'Ngừng dùng'}</span><button type="button" class="btn mini" data-toggle-criterion>${active?'Ngừng dùng':'Khôi phục'}</button></div></div>`;
  }
  function renderCriteriaEditor(){
    $('criteriaEditorList').innerHTML=criteria.map(c=>criterionRow(c)).join('');
    updateWeightTotal();
  }
  function updateWeightTotal(){
    const total=[...document.querySelectorAll('[data-criterion-row]')].filter(row=>row.dataset.active==='1').reduce((sum,row)=>sum+Number(row.querySelector('[data-criterion-weight]').value||0),0);
    $('criteriaWeightTotal').textContent=`Tổng trọng số tiêu chí đang dùng: ${Number(total.toFixed(2))}%`;
    $('criteriaWeightTotal').style.color=Math.abs(total-100)<0.001?'#087443':'#b42318';
  }
  function campaignOptions(){
    campaigns=campaigns.map(c=>({id:Number(c.id),name:c.ten||c.name||('Đợt tuyển dụng #'+c.id)}));
    const options='<option value="">-- Chọn đợt tuyển dụng --</option>'+campaigns.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
    for(const id of ['criteriaCampaign','editorCampaign']){const el=$(id);if(!el)continue;const old=el.value;el.innerHTML=options;el.value=campaigns.some(c=>String(c.id)===String(old))?old:(campaigns.some(c=>c.id===selectedCampaignId)?String(selectedCampaignId):(campaigns[0]?String(campaigns[0].id):''));}
    selectedCampaignId=Number($('criteriaCampaign')?.value||$('editorCampaign')?.value||0);
    return campaigns;
  }
  async function loadCriteria(campaignId){
    selectedCampaignId=Number(campaignId||0);
    if(!selectedCampaignId){criteria=[];renderCriteria();return;}
    criteria=rowsFrom(await api('/api/danh-gia/tieu-chi?dot_tuyen_id='+selectedCampaignId)).map(c=>({...c,diem_toi_da:Number(c.diem_toi_da)===9.6?10:c.diem_toi_da}));
    renderCriteria();
  }
  async function load(){
    clearNotice('notice');
    try{const values=await Promise.all([api('/api/danh-gia'),api('/api/danh-gia/lich'),api('/api/danh-gia/dot-tuyen')]);feedbacks=rowsFrom(values[0]);schedules=rowsFrom(values[1]);campaigns=rowsFrom(values[2]);
      const select=$('phong_van_id'), old=select.value;select.innerHTML='<option value="">-- Chọn lịch phỏng vấn --</option>'+schedules.map(s=>`<option value="${s.phong_van_id}">${esc(s.ten_ung_vien||('Ứng viên #'+s.ung_vien_id))} · ${esc(s.ten_dot_tuyen||'Đợt tuyển dụng')} · ${esc(s.vong_phong_van||'Vòng 1')} · ${esc(date(s.thoi_gian))} · #${s.phong_van_id}</option>`).join('');if(old)select.value=old; renderInterviewReadonly(schedules.find(s=>Number(s.phong_van_id)===Number(select.value))); 
      campaignOptions(); await loadCriteria(selectedCampaignId);render();
      const requestedScheduleId = Number(new URLSearchParams(window.location.search).get('phong_van_id') || 0);
      if (requestedScheduleId && schedules.some(s => Number(s.phong_van_id) === requestedScheduleId) && (isInterviewer || isManager)) {
        $('feedbackForm').reset(); clearNotice('formNotice'); $('phong_van_id').value = String(requestedScheduleId);
        const selectedSchedule = schedules.find(s => Number(s.phong_van_id) === requestedScheduleId); renderInterviewReadonly(selectedSchedule);
        if (selectedSchedule) await loadCriteria(selectedSchedule.dot_tuyen_id);
        restoreFeedback(findExistingFeedback(requestedScheduleId));
        openModal('feedbackModal');
      }
    }catch(e){notice(e.message||'Không tải được dữ liệu.');}
  }
  $('btnTao').hidden=!(isInterviewer||isManager);
  $('btnTao').addEventListener('click',()=>{if(!schedules.length){notice('Không có lịch phỏng vấn khả dụng để đánh giá.');return;} $('feedbackForm').reset();clearNotice('formNotice');renderCriteria();openModal('feedbackModal');});
  $('phong_van_id').addEventListener('change',async()=>{const schedule=schedules.find(s=>Number(s.phong_van_id)===Number($('phong_van_id').value));renderInterviewReadonly(schedule);if(schedule)try{await loadCriteria(schedule.dot_tuyen_id);}catch(err){notice(err.message||'Không tải được tiêu chí của đợt tuyển dụng.','error','formNotice');}});
  $('criteriaCampaign').addEventListener('change',async()=>{selectedCampaignId=Number($('criteriaCampaign').value||0);$('editorCampaign').value=String(selectedCampaignId||'');try{await loadCriteria(selectedCampaignId);}catch(err){notice(err.message||'Không tải được tiêu chí.');}});
  $('editorCampaign').addEventListener('change',async()=>{selectedCampaignId=Number($('editorCampaign').value||0);$('criteriaCampaign').value=String(selectedCampaignId||'');try{await loadCriteria(selectedCampaignId);renderCriteriaEditor();}catch(err){notice(err.message||'Không tải được tiêu chí.','error','criteriaNotice');}});
  $('q').addEventListener('input',render);$('locDeXuat').addEventListener('change',render);$('locQuyetDinh').addEventListener('change',render);
  document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',()=>closeModal(btn.dataset.close)));
  document.querySelectorAll('.modal').forEach(modal=>modal.addEventListener('click',e=>{if(e.target===modal)closeModal(modal.id)}));
  $('feedbackForm').addEventListener('input',e=>{if(e.target.matches('[data-score-id]'))updateInterviewScore();});
  $('feedbackForm').addEventListener('submit',async e=>{e.preventDefault();clearNotice('formNotice');const scores={};for(const input of document.querySelectorAll('[data-score-id]')){const raw=input.value.trim(),score=Number(raw);if(raw===''||!Number.isFinite(score)||score<Number(input.min)||score>Number(input.max)){notice('Vui lòng nhập điểm cho tất cả tiêu chí trong khoảng 0–'+input.max+'.','error','formNotice');input.focus();return;}scores[input.dataset.scoreId]=score;}const body={phong_van_id:Number($('phong_van_id').value),diem:scores,de_xuat:$('de_xuat').value,nhan_xet:$('nhan_xet').value.trim()};try{const saveBtn=$('feedbackForm').querySelector('button[type="submit"]');saveBtn.disabled=true;const r=await api('/api/danh-gia',{method:'POST',body:JSON.stringify(body)});$('sendSuggestionEmail').hidden=false;$('sendSuggestionEmail').dataset.scheduleId=String(body.phong_van_id);if(embeddedEvaluation&&window.parent!==window){const savedSchedule=schedules.find(s=>Number(s.phong_van_id)===body.phong_van_id);window.parent.postMessage({type:'tuyendung-ai-feedback-saved',phong_van_id:body.phong_van_id,ten_ung_vien:savedSchedule?.ten_ung_vien||''},window.location.origin);}notice('Đã lưu đánh giá.','success','formNotice');await load();saveBtn.disabled=false;}catch(err){notice(err.message||'Không lưu được đánh giá.','error','formNotice');$('feedbackForm').querySelector('button[type="submit"]').disabled=false;}});
  $('sendSuggestionEmail').addEventListener('click',async()=>{
    const btn=$('sendSuggestionEmail'),id=Number(btn.dataset.scheduleId||$('phong_van_id').value);if(!id)return;
    btn.disabled=true;clearNotice('emailDraftNotice');
    try{const draft=await api(`/api/danh-gia/${id}/email-de-xuat`);$('emailDraftScheduleId').value=String(id);$('emailDraftMode').value='suggestion';$('emailDraftTo').value=draft.to||'';$('emailDraftSubject').value=draft.subject||'';$('emailDraftBody').value=draft.body||'';openModal('emailDraftModal');}
    catch(err){notice(err.message||'Không tạo được bản nháp email.','error','formNotice');}
    finally{btn.disabled=false;}
  });
  $('emailDraftForm').addEventListener('submit',async e=>{
    e.preventDefault();clearNotice('emailDraftNotice');
    const id=Number($('emailDraftScheduleId').value),subject=$('emailDraftSubject').value.trim(),body=$('emailDraftBody').value.trim(),btn=$('confirmSendDraft');
    if(!subject||!body){notice('Vui lòng nhập tiêu đề và nội dung email.','error','emailDraftNotice');return;}
    btn.disabled=true;btn.textContent='Đang gửi…';
    try{const mode=$('emailDraftMode').value;const endpoint=mode==='decision'?'gui-ket-qua':'gui-email-de-xuat';const r=await api(`/api/danh-gia/${id}/${endpoint}`,{method:'POST',body:JSON.stringify({subject,body})});closeModal('emailDraftModal');notice(r.message||'Đã gửi mail kết quả.','success','formNotice');if(mode==='decision')await load();}
    catch(err){notice(err.message||'Gửi mail kết quả thất bại.','error','emailDraftNotice');}
    finally{btn.disabled=false;btn.textContent='Gửi email';}
  });
  $('rows').addEventListener('click',async e=>{
    const feedbackBtn=e.target.closest('[data-feedback]');const decisionBtn=e.target.closest('[data-decision]');const emailBtn=e.target.closest('[data-email]');
    if(feedbackBtn){$('feedbackForm').reset();clearNotice('formNotice');$('phong_van_id').value=feedbackBtn.dataset.feedback;const selectedSchedule=schedules.find(s=>Number(s.phong_van_id)===Number(feedbackBtn.dataset.feedback));renderInterviewReadonly(selectedSchedule);if(selectedSchedule)await loadCriteria(selectedSchedule.dot_tuyen_id);restoreFeedback(findExistingFeedback(feedbackBtn.dataset.feedback));updateInterviewScore();openModal('feedbackModal');return;}
    if(decisionBtn){const id=Number(decisionBtn.dataset.decision),g=grouped().find(x=>x.phong_van_id===id);$('decisionScheduleId').value=id;$('decisionResult').value=g?.quyet_dinh_cuoi||'can_nhac';$('decisionNote').value=g?.ghi_chu_quyet_dinh||'';clearNotice('decisionNotice');openModal('decisionModal');return;}
    if(emailBtn){const id=Number(emailBtn.dataset.email);emailBtn.disabled=true;clearNotice('emailDraftNotice');try{const draft=await api(`/api/danh-gia/${id}/email-ket-qua`);$('emailDraftScheduleId').value=String(id);$('emailDraftMode').value='decision';$('emailDraftTo').value=draft.to||'';$('emailDraftSubject').value=draft.subject||'';$('emailDraftBody').value=draft.body||'';openModal('emailDraftModal');}catch(err){notice(err.message||'Không tạo được bản nháp email.');emailBtn.disabled=false;}}
  });
  $('decisionForm').addEventListener('submit',async e=>{e.preventDefault();clearNotice('decisionNotice');const id=Number($('decisionScheduleId').value);try{const r=await api(`/api/danh-gia/${id}/quyet-dinh`,{method:'POST',body:JSON.stringify({ket_qua:$('decisionResult').value,ghi_chu:$('decisionNote').value.trim()})});closeModal('decisionModal');notice(r.message||'Đã lưu quyết định.','success');await load();}catch(err){notice(err.message||'Không lưu được quyết định.','error','decisionNotice');}});
  $('btnCriteria').addEventListener('click',()=>{if(!isManager)return;if(!selectedCampaignId){notice('Hãy chọn đợt tuyển dụng trước khi chỉnh sửa tiêu chí.');return;}clearNotice('criteriaNotice');$('editorCampaign').value=String(selectedCampaignId);renderCriteriaEditor();openModal('criteriaModal');});
  $('btnAddCriterion').addEventListener('click',()=>{ $('criteriaEditorList').insertAdjacentHTML('beforeend',criterionRow({ten:'',mo_ta:'',trong_so:10,diem_toi_da:10,active:true})); updateWeightTotal(); });
  $('criteriaEditorList').addEventListener('input',e=>{if(e.target.matches('[data-criterion-weight]'))updateWeightTotal();});
  $('criteriaEditorList').addEventListener('click',e=>{
    const toggle=e.target.closest('[data-toggle-criterion]');if(!toggle)return;
    const row=toggle.closest('[data-criterion-row]');row.dataset.active=row.dataset.active==='1'?'0':'1';
    row.classList.toggle('inactive',row.dataset.active!=='1');row.querySelector('.state-label').textContent=row.dataset.active==='1'?'Đang dùng':'Ngừng dùng';toggle.textContent=row.dataset.active==='1'?'Ngừng dùng':'Khôi phục';
    row.querySelectorAll('[data-criterion-name],[data-criterion-weight],[data-criterion-max]').forEach(input=>{input.required=row.dataset.active==='1';});updateWeightTotal();
  });
  $('criteriaForm').addEventListener('submit',async e=>{
    e.preventDefault();clearNotice('criteriaNotice');
    const rows=[...document.querySelectorAll('[data-criterion-row]')];
    const active=rows.filter(row=>row.dataset.active==='1');
    if(!active.length){notice('Cần có ít nhất một tiêu chí đang sử dụng.','error','criteriaNotice');return;}
    const total=active.reduce((sum,row)=>sum+Number(row.querySelector('[data-criterion-weight]').value||0),0);
    if(Math.abs(total-100)>0.001){notice(`Tổng trọng số hiện là ${Number(total.toFixed(2))}%. Hãy điều chỉnh để tổng bằng 100%.`,'error','criteriaNotice');return;}
    for(const row of active){const name=row.querySelector('[data-criterion-name]').value.trim(),weight=Number(row.querySelector('[data-criterion-weight]').value),max=Number(row.querySelector('[data-criterion-max]').value);if(!name||!Number.isFinite(weight)||weight<=0||weight>100||!Number.isFinite(max)||max<=0||max>10){notice('Kiểm tra lại tên tiêu chí, trọng số (0–100%) và điểm tối đa (0–10).','error','criteriaNotice');return;}}
    const submit=e.submitter; if(submit)submit.disabled=true;
    try{
      for(const row of rows){
        const id=Number(row.dataset.id||0),activeNow=row.dataset.active==='1';
        if(!activeNow){if(id)await api('/api/danh-gia/tieu-chi/'+id+'?dot_tuyen_id='+selectedCampaignId,{method:'DELETE'});continue;}
        const body={dot_tuyen_id:selectedCampaignId,ten:row.querySelector('[data-criterion-name]').value.trim(),mo_ta:row.querySelector('[data-criterion-desc]').value.trim(),trong_so:Number(row.querySelector('[data-criterion-weight]').value),diem_toi_da:Number(row.querySelector('[data-criterion-max]').value)};
        await api(id?'/api/danh-gia/tieu-chi/'+id:'/api/danh-gia/tieu-chi',{method:id?'PUT':'POST',body:JSON.stringify(body)});
      }
      closeModal('criteriaModal');notice('Đã lưu cấu hình scorecard.','success');await load();
    }catch(err){notice(err.message||'Không lưu được cấu hình tiêu chí.','error','criteriaNotice');}
    finally{if(submit)submit.disabled=false;}
  });
  if(!localStorage.getItem('token') && !window.appToken){ notice('Chưa tìm thấy phiên đăng nhập. Vui lòng đăng nhập lại.'); } else load();
})();
