const titles={dashboard:'Dashboard',inventario:'WAREHOUSE',entrada:'Nueva entrada',salida:'Nueva salida',movimientos:'Movimientos',herramientas:'Herramientas'};
const KEY='farab_medjets_inventory_clean_v2', USERS_KEY='farab_medjets_users_v1', SESSION_KEY='farab_medjets_session_v1';
const componentConditions=['OVERHAUL','AS REMOVED','SERVICEABLE','SCRAP','NEW','TESTED','CORE','REPAIRED','INSPECTED','REPAIRABLE','QUARANTINE'];
const toolConditions=['CALIBRATED','NOT CALIBRATED'];
let movements=safeParse(localStorage.getItem(KEY),[]), currentUser=null, authMode='register';
function safeParse(v,fallback){try{return v?JSON.parse(v):fallback}catch{return fallback}}
function saveMovements(){localStorage.setItem(KEY,JSON.stringify(movements))}
function e(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function show(id){if(!id)return;document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.getElementById(id)?.classList.add('active');document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===id));document.getElementById('title').textContent=titles[id]||id}
document.querySelectorAll('.nav,.jump').forEach(b=>b.addEventListener('click',()=>show(b.dataset.view)));
const type=document.getElementById('inType'),cond=document.getElementById('inCondition');
function fillConditions(){const a=type?.value==='Herramienta'?toolConditions:componentConditions;if(cond)cond.innerHTML=a.map(x=>`<option>${x}</option>`).join('')}
type?.addEventListener('change',fillConditions);fillConditions();
function setToday(){const d=new Date();const local=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);if(document.getElementById('inDate'))document.getElementById('inDate').value=local;if(document.getElementById('outDate'))document.getElementById('outDate').value=local}setToday();

// Authentication (local demo; backend/MySQL will replace this storage in production)
const authForm=document.getElementById('authForm'),authSwitch=document.getElementById('authSwitch');
function setAuthMode(mode){authMode=mode;const reg=mode==='register';document.getElementById('nameField').style.display=reg?'block':'none';document.getElementById('authName').required=reg;document.getElementById('authTitle').textContent=reg?'Crear cuenta':'Iniciar sesión';document.getElementById('authSubtitle').textContent=reg?'Nombre, correo y contraseña para identificar cada movimiento.':'Ingresa con tu correo y contraseña.';document.getElementById('authSubmit').textContent=reg?'Crear cuenta y entrar':'Entrar';authSwitch.textContent=reg?'¿Ya tienes cuenta? Iniciar sesión':'¿No tienes cuenta? Crear cuenta';document.getElementById('authPassword').autocomplete=reg?'new-password':'current-password';document.getElementById('authError').textContent=''}
authSwitch?.addEventListener('click',()=>setAuthMode(authMode==='register'?'login':'register'));
authForm?.addEventListener('submit',ev=>{ev.preventDefault();const name=document.getElementById('authName').value.trim(),email=document.getElementById('authEmail').value.trim().toLowerCase(),password=document.getElementById('authPassword').value;const err=document.getElementById('authError');if(!email||!password||(authMode==='register'&&!name)){err.textContent='Completa todos los campos.';return}let users=safeParse(localStorage.getItem(USERS_KEY),[]);if(authMode==='register'){if(users.some(u=>u.email===email)){err.textContent='Ese correo ya está registrado. Inicia sesión.';return}const user={id:Date.now(),name,email,password};users.push(user);localStorage.setItem(USERS_KEY,JSON.stringify(users));startSession(user)}else{const user=users.find(u=>u.email===email&&u.password===password);if(!user){err.textContent='Correo o contraseña incorrectos.';return}startSession(user)}});
function startSession(user){currentUser={id:user.id,name:user.name,email:user.email};sessionStorage.setItem(SESSION_KEY,JSON.stringify(currentUser));applyUser();document.body.classList.remove('logged-out');document.body.classList.add('logged-in');render()}
function applyUser(){if(!currentUser)return;const initials=currentUser.name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();document.getElementById('userAvatar').textContent=initials||'U';document.getElementById('sideUserName').textContent=currentUser.name;document.getElementById('sideUserEmail').textContent=currentUser.email;document.getElementById('sideUserEmail').title=currentUser.email;document.getElementById('welcomeUser').textContent=`Hola, ${currentUser.name}.`}
document.getElementById('logoutBtn')?.addEventListener('click',()=>{sessionStorage.removeItem(SESSION_KEY);currentUser=null;document.body.classList.remove('logged-in');document.body.classList.add('logged-out');authForm.reset();setAuthMode('login')});
const savedSession=safeParse(sessionStorage.getItem(SESSION_KEY),null);if(savedSession){currentUser=savedSession;applyUser();document.body.classList.remove('logged-out');document.body.classList.add('logged-in')}else setAuthMode('register');

// Entries
document.getElementById('saveEntry')?.addEventListener('click',()=>{if(!currentUser)return;const m={id:Date.now(),createdAt:new Date().toISOString(),date:document.getElementById('inDate').value,pn:document.getElementById('inPn').value.trim(),desc:document.getElementById('inDesc').value.trim(),type:type.value,sn:document.getElementById('inSn').value.trim(),condition:cond.value,qty:+document.getElementById('inQty').value,loc:`Anaquel ${document.getElementById('inRack').value}-${document.getElementById('inSection').value}`,obs:document.getElementById('inObs').value.trim(),user:currentUser.name,userEmail:currentUser.email,movement:'Entrada'};if(!m.pn||!m.desc||!m.date||m.qty<1){alert('Completa P/N, descripción, cantidad y fecha.');return}movements.push(m);saveMovements();render();alert(`Entrada registrada por ${currentUser.name}.`)});
// Exits
document.getElementById('saveExit')?.addEventListener('click',()=>{if(!currentUser)return;const pn=document.getElementById('outPn').value.trim(),sn=document.getElementById('outSn').value.trim(),qty=+document.getElementById('outQty').value,date=document.getElementById('outDate').value,obs=document.getElementById('outObs').value.trim();if(!pn||!date||qty<1){alert('Completa P/N, cantidad y fecha.');return}const stock=getStock(pn,sn);if(qty>stock){alert(`Existencia insuficiente. Disponible: ${stock}.`);return}const src=[...movements].reverse().find(m=>m.pn===pn&&(sn?m.sn===sn:true));movements.push({id:Date.now(),createdAt:new Date().toISOString(),date,pn,desc:src?.desc||'',type:src?.type||'Componente',sn,condition:src?.condition||'',qty,loc:src?.loc||'',obs,user:currentUser.name,userEmail:currentUser.email,movement:'Salida'});saveMovements();render();alert(`Salida registrada por ${currentUser.name}.`)});
function getStock(pn,sn=''){return movements.filter(m=>m.pn===pn&&(sn?m.sn===sn:true)).reduce((a,m)=>a+(m.movement==='Salida'?-m.qty:m.qty),0)}
function editMovement(id){
  const i=movements.findIndex(m=>String(m.id)===String(id));
  if(i<0)return;
  const m=movements[i];
  const parts=(m.loc||'').match(/^Anaquel\s+(\d+)-([A-F])$/i);
  const rack=parts?parts[1]:'1', section=parts?parts[2].toUpperCase():'A';
  const conditions=m.type==='Herramienta'?toolConditions:componentConditions;
  const overlay=document.createElement('div');
  overlay.className='edit-overlay';
  overlay.innerHTML=`<div class="edit-modal">
    <div class="edit-modal-head"><div><span>EDITAR REGISTRO</span><h3>${e(m.movement)} · ${e(m.pn)}</h3></div><button type="button" class="edit-close" aria-label="Cerrar">×</button></div>
    <form id="editMovementForm">
      <div class="edit-grid">
        <label>Movimiento<select id="editMovement"><option ${m.movement==='Entrada'?'selected':''}>Entrada</option><option ${m.movement==='Salida'?'selected':''}>Salida</option></select></label>
        <label>Fecha<input id="editDate" type="date" value="${e(m.date)}" required></label>
        <label>P/N<input id="editPn" value="${e(m.pn)}" required></label>
        <label>S/N<input id="editSn" value="${e(m.sn||'')}"></label>
        <label class="edit-wide">Descripción<input id="editDesc" value="${e(m.desc||'')}" required></label>
        <label>Tipo<select id="editType"><option ${m.type==='Componente'?'selected':''}>Componente</option><option ${m.type==='Consumible'?'selected':''}>Consumible</option><option ${m.type==='Herramienta'?'selected':''}>Herramienta</option></select></label>
        <label>Condición<select id="editCondition">${conditions.map(c=>`<option ${m.condition===c?'selected':''}>${c}</option>`).join('')}</select></label>
        <label>Cantidad<input id="editQty" type="number" min="1" value="${Number(m.qty)||1}" required></label>
        <label>Anaquel<select id="editRack">${Array.from({length:13},(_,n)=>`<option value="${n+1}" ${String(n+1)===rack?'selected':''}>Anaquel ${n+1}</option>`).join('')}</select></label>
        <label>Sección<select id="editSection">${['A','B','C','D','E','F'].map(x=>`<option ${x===section?'selected':''}>${x}</option>`).join('')}</select></label>
        <label class="edit-wide">Observación<textarea id="editObs" rows="3">${e(m.obs||'')}</textarea></label>
      </div>
      <div class="edit-audit">Registrado por <b>${e(m.user||'—')}</b>${m.userEmail?` · ${e(m.userEmail)}`:''}</div>
      <div class="edit-actions"><button type="button" class="edit-cancel">Cancelar</button><button type="submit" class="edit-save">Guardar cambios</button></div>
    </form>
  </div>`;
  document.body.appendChild(overlay);
  const close=()=>overlay.remove();
  overlay.querySelector('.edit-close').onclick=close;
  overlay.querySelector('.edit-cancel').onclick=close;
  overlay.addEventListener('click',ev=>{if(ev.target===overlay)close()});
  const typeEl=overlay.querySelector('#editType'), conditionEl=overlay.querySelector('#editCondition');
  typeEl.addEventListener('change',()=>{const arr=typeEl.value==='Herramienta'?toolConditions:componentConditions;conditionEl.innerHTML=arr.map(c=>`<option>${c}</option>`).join('')});
  overlay.querySelector('#editMovementForm').addEventListener('submit',ev=>{
    ev.preventDefault();
    const qty=Number(overlay.querySelector('#editQty').value);
    const pn=overlay.querySelector('#editPn').value.trim();
    const desc=overlay.querySelector('#editDesc').value.trim();
    if(!pn||!desc||!Number.isFinite(qty)||qty<1){alert('Completa P/N, descripción y una cantidad válida.');return}
    movements[i]={...m,
      movement:overlay.querySelector('#editMovement').value,
      date:overlay.querySelector('#editDate').value,
      pn, desc,
      sn:overlay.querySelector('#editSn').value.trim(),
      type:typeEl.value,
      condition:conditionEl.value,
      qty,
      loc:`Anaquel ${overlay.querySelector('#editRack').value}-${overlay.querySelector('#editSection').value}`,
      obs:overlay.querySelector('#editObs').value.trim(),
      modifiedBy:currentUser?.name||'', modifiedByEmail:currentUser?.email||'', modifiedAt:new Date().toISOString()
    };
    saveMovements();render();close();
  });
}
function deleteMovement(id){const m=movements.find(x=>String(x.id)===String(id));if(!m)return;if(!confirm(`¿Eliminar el registro ${m.movement} de ${m.pn}?`))return;movements=movements.filter(x=>String(x.id)!==String(id));saveMovements();render()}
window.editMovement=editMovement;window.deleteMovement=deleteMovement;



function splitLocation(loc){const m=String(loc||'').match(/^Anaquel\s+(\d+)-([A-F])$/i);return {rack:m?m[1]:'',section:m?m[2].toUpperCase():''}}
function excelRows(){return movements.map(m=>{const l=splitLocation(m.loc);return {
  'Movimiento':m.movement||'Entrada','Fecha':m.date||'','P/N':m.pn||'','S/N':m.sn||'','Descripción':m.desc||'',
  'Tipo':m.type||'Componente','Condición':m.condition||'','Cantidad':Number(m.qty)||1,'Anaquel':l.rack,'Sección':l.section,
  'Observación':m.obs||'','Usuario':m.user||'','Correo':m.userEmail||''
}})}
function exportExcel(){
  if(typeof XLSX==='undefined'){alert('No se pudo cargar el módulo de Excel. Verifica tu conexión a internet.');return}
  const rows=excelRows();
  const headers=['Movimiento','Fecha','P/N','S/N','Descripción','Tipo','Condición','Cantidad','Anaquel','Sección','Observación','Usuario','Correo'];
  const ws=XLSX.utils.json_to_sheet(rows,{header:headers});
  ws['!cols']=[14,12,20,18,36,16,18,10,10,10,34,22,30].map(w=>({wch:w}));
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'WAREHOUSE');
  XLSX.writeFile(wb,'FARAB_MEDJETS_WAREHOUSE.xlsx');
}
function norm(v){return String(v??'').trim()}
function normalizeMovement(v){const x=norm(v).toLowerCase();return x==='salida'||x==='exit'?'Salida':'Entrada'}
function normalizeType(v){const x=norm(v).toLowerCase();if(x.startsWith('herr'))return 'Herramienta';if(x.startsWith('cons'))return 'Consumible';return 'Componente'}
function importExcelFile(file){
  if(typeof XLSX==='undefined'){alert('No se pudo cargar el módulo de Excel. Verifica tu conexión a internet.');return}
  const reader=new FileReader();
  reader.onload=ev=>{
    try{
      const wb=XLSX.read(ev.target.result,{type:'array',cellDates:false});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
      if(!rows.length){alert('El archivo no contiene registros.');return}
      let added=0, skipped=0;
      const now=Date.now();
      rows.forEach((r,k)=>{
        const get=(...names)=>{for(const n of names)if(Object.prototype.hasOwnProperty.call(r,n))return r[n];return ''};
        const pn=norm(get('P/N','PN','Part Number','Part number'));
        const desc=norm(get('Descripción','Descripcion','Description'));
        const qty=Number(get('Cantidad','Quantity','Qty'));
        if(!pn||!desc||!Number.isFinite(qty)||qty<1){skipped++;return}
        const movement=normalizeMovement(get('Movimiento','Movement','Tipo de movimiento'));
        const type=normalizeType(get('Tipo','Type'));
        let condition=norm(get('Condición','Condicion','Condition')).toUpperCase();
        const allowed=type==='Herramienta'?toolConditions:componentConditions;
        if(!allowed.includes(condition))condition=allowed[0];
        let rack=norm(get('Anaquel','Rack')).replace(/[^0-9]/g,'');if(!rack||+rack<1||+rack>13)rack='1';
        let section=norm(get('Sección','Seccion','Section')).toUpperCase();if(!['A','B','C','D','E','F'].includes(section))section='A';
        let date=norm(get('Fecha','Date'));if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)){const [d,m,y]=date.split('/');date=`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`}
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date))date=new Date().toISOString().slice(0,10);
        movements.push({id:now+k+1,createdAt:new Date().toISOString(),date,pn,desc,type,sn:norm(get('S/N','SN','Serial Number')),condition,qty,loc:`Anaquel ${rack}-${section}`,obs:norm(get('Observación','Observacion','Observation')),user:currentUser?.name||norm(get('Usuario','User'))||'Importación Excel',userEmail:currentUser?.email||norm(get('Correo','Email')),movement,importedFromExcel:true});added++;
      });
      saveMovements();render();alert(`Importación terminada. ${added} registro(s) cargados${skipped?` y ${skipped} omitido(s) por datos incompletos.`:'.'}`);
    }catch(err){console.error(err);alert('No se pudo leer el archivo. Usa el mismo formato que genera “Exportar Excel”.')}
  };
  reader.readAsArrayBuffer(file);
}
document.getElementById('exportExcelBtn')?.addEventListener('click',exportExcel);
document.getElementById('importExcelBtn')?.addEventListener('click',()=>document.getElementById('excelFileInput')?.click());
document.getElementById('excelFileInput')?.addEventListener('change',ev=>{const f=ev.target.files?.[0];if(f)importExcelFile(f);ev.target.value=''});

function render(){
  const ib=document.getElementById('inventoryBody'),mb=document.getElementById('movementBody'),rb=document.getElementById('recentBody');
  const groups=new Map();
  movements.forEach(m=>{
    // WAREHOUSE only combines records when the inventory-defining fields match.
    // A change in condition, description, type, S/N or location creates a separate row.
    const normKey=v=>String(v||'').trim().toUpperCase();
    const k=[m.pn,m.sn,m.desc,m.type,m.condition,m.loc].map(normKey).join('|');
    const g=groups.get(k)||{...m,stock:0,lastEntry:''};
    g.stock+=m.movement==='Salida'?-m.qty:m.qty;
    if(m.movement==='Entrada'){
      g.desc=m.desc;g.type=m.type;g.condition=m.condition;g.loc=m.loc;
      if(!g.lastEntry || String(m.date)>String(g.lastEntry))g.lastEntry=m.date;
    }
    groups.set(k,g)
  });
  let allInv=[...groups.values()].filter(g=>g.stock!==0);
  let inv=[...allInv];
  const q=(document.getElementById('inventorySearch')?.value||'').trim().toLowerCase();
  const globalQ=(document.getElementById('globalSearch')?.value||'').trim().toLowerCase();
  const searchQ=q||globalQ;
  if(searchQ)inv=inv.filter(g=>[g.pn,g.sn,g.desc,g.type,g.condition,g.loc].some(v=>String(v||'').toLowerCase().includes(searchQ)));
  const typeFilter=document.getElementById('typeFilter')?.value||'Todos los tipos';
  if(typeFilter!=='Todos los tipos')inv=inv.filter(g=>g.type===typeFilter);
  const locFilter=document.getElementById('locationFilter')?.value||'';
  if(locFilter)inv=inv.filter(g=>g.loc===locFilter);
  if(ib)ib.innerHTML=inv.length?inv.map(g=>`<tr><td><b>${e(g.pn)}</b></td><td>${e(g.desc)}</td><td>${e(g.type)}</td><td>${e(g.sn)||'—'}</td><td><b>${g.stock}</b></td><td>${e(g.condition)||'—'}</td><td>${e(g.loc)||'—'}</td><td>${e(g.lastEntry)||'—'}</td></tr>`).join(''):`<tr><td colspan='8'>${searchQ||locFilter||typeFilter!=='Todos los tipos'?'No se encontraron coincidencias.':'Sin inventario registrado.'}</td></tr>`;
  if(mb)mb.innerHTML=movements.length?[...movements].reverse().map(m=>`<tr><td>${e(m.date)}</td><td><span class='badge ${m.movement==='Salida'?'out':'in'}'>${e(m.movement)}</span></td><td>${e(m.pn)}</td><td>${e(m.sn)||'—'}</td><td>${m.qty}</td><td>${e(m.condition)||'—'}</td><td title='${e(m.userEmail)}'>${e(m.user)}</td><td>${e(m.obs)}</td><td><div class='row-actions'><button class='mini-btn' onclick='editMovement(${JSON.stringify(m.id)})'>Modificar</button><button class='mini-btn danger' onclick='deleteMovement(${JSON.stringify(m.id)})'>Eliminar</button></div></td></tr>`).join(''):"<tr><td colspan='9'>Sin movimientos registrados.</td></tr>";
  if(rb)rb.innerHTML=movements.length?[...movements].reverse().slice(0,5).map(m=>`<tr><td>${e(m.date)}</td><td><span class='badge ${m.movement==='Salida'?'out':'in'}'>${e(m.movement)}</span></td><td><b>${e(m.pn)}</b></td><td>${e(m.sn)||'—'}</td><td>${m.qty}</td><td>${e(m.user)}</td></tr>`).join(''):"<tr><td colspan='6'>Sin movimientos registrados.</td></tr>";
  document.getElementById('statPn').textContent=allInv.length;document.getElementById('statUnits').textContent=allInv.reduce((a,g)=>a+g.stock,0);document.getElementById('statTools').textContent=allInv.filter(g=>g.type==='Herramienta').length;
  const today=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);document.getElementById('statToday').textContent=movements.filter(m=>m.date===today).length;
  const dl=document.getElementById('pnSuggestions');if(dl)dl.innerHTML=[...new Set(allInv.map(g=>g.pn))].sort().map(p=>`<option value="${e(p)}"></option>`).join('');
}
function openWarehouseSearch(query=''){
  show('inventario');const input=document.getElementById('inventorySearch');if(input){input.value=query;input.focus();}render();
}
document.getElementById('inventorySearch')?.addEventListener('input',render);
document.getElementById('typeFilter')?.addEventListener('change',render);
document.getElementById('locationFilter')?.addEventListener('change',render);
document.getElementById('globalSearch')?.addEventListener('input',ev=>{const q=ev.target.value;const input=document.getElementById('inventorySearch');if(input)input.value=q;if(q.trim())show('inventario');render();});
document.querySelectorAll('.quickbtn.jump[data-view="inventario"]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>document.getElementById('inventorySearch')?.focus(),0)));
document.getElementById('outPn')?.addEventListener('change',ev=>{const pn=ev.target.value.trim();const item=[...movements].reverse().find(m=>m.pn===pn&&m.movement==='Entrada');if(item&&document.getElementById('outSn')&&!document.getElementById('outSn').value)document.getElementById('outSn').placeholder=item.sn?`Disponible: ${item.sn}`:'Si aplica';});
render();
