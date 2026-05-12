import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'

// ─── THEME ────────────────────────────────────────────────
const C = {
  bg:'#07090f', card:'#0e1420', surface:'#141c2e', surface2:'#1a2438',
  border:'#1f2d42', accent:'#1d4ed8', accentBr:'#3b82f6',
  text:'#e8eaf0', textSec:'#8896aa', textMut:'#3d4f66',
  green:'#10b981', red:'#ef4444', yellow:'#f59e0b', purple:'#a78bfa',
  danger:'rgba(239,68,68,0.15)', warn:'rgba(245,158,11,0.15)',
}

const CATS = [
  { name:'Chores',   color:'#ef4444', bg:'rgba(239,68,68,0.12)' },
  { name:'Personal', color:'#a78bfa', bg:'rgba(167,139,250,0.12)' },
  { name:'Work',     color:'#60a5fa', bg:'rgba(96,165,250,0.12)' },
  { name:'Health',   color:'#34d399', bg:'rgba(52,211,153,0.12)' },
  { name:'Shopping', color:'#fbbf24', bg:'rgba(251,191,36,0.12)' },
]
const PRIO_COLORS = { Low:C.green, Medium:C.yellow, High:C.red }
const PRIO_ORDER  = { High:0, Medium:1, Low:2 }
const RECUR_OPTS  = ['None','Daily','Weekly','Monthly']
const TIME_OPTS   = ['','5m','15m','30m','1h','2h']
const TABS = [
  { id:'home',     label:'Home',     icon:'⬡' },
  { id:'tasks',    label:'Tasks',    icon:'✦' },
  { id:'calendar', label:'Calendar', icon:'▦' },
  { id:'notes',    label:'Notes',    icon:'◈' },
  { id:'planner',  label:'Planner',  icon:'▤' },
]

// ─── HELPERS ──────────────────────────────────────────────
const ld = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const todayStr  = () => ld()
const fmtDate   = s  => s ? new Date(s+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}) : ''
const catFor    = n  => CATS.find(c=>c.name===n) || CATS[0]
const isOverdue = t  => !t.completed && t.dueDate && t.dueDate < todayStr()
const isToday   = t  => t.dueDate === todayStr()
const uid       = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6)

const parseQuickAdd = text => {
  let title=text, dueDate='', priority='Medium', category=''
  const lower=text.toLowerCase()
  const days=['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  const today=new Date()
  if (/\btoday\b/.test(lower))       { dueDate=ld(); title=title.replace(/\btoday\b/gi,'').trim() }
  else if (/\btomorrow\b/.test(lower)){ const d=new Date(today);d.setDate(d.getDate()+1);dueDate=ld(d);title=title.replace(/\btomorrow\b/gi,'').trim() }
  else if (/\bnext week\b/.test(lower)){ const d=new Date(today);d.setDate(d.getDate()+7);dueDate=ld(d);title=title.replace(/\bnext week\b/gi,'').trim() }
  else { for(let i=0;i<days.length;i++){ const re=new RegExp(`\\b${days[i]}\\b`,'i');if(re.test(lower)){const d=new Date(today),diff=(i-today.getDay()+7)%7||7;d.setDate(today.getDate()+diff);dueDate=ld(d);title=title.replace(re,'').trim();break} } }
  if      (/\bhigh\b/.test(lower))   { priority='High';   title=title.replace(/\bhigh\b/gi,'').trim() }
  else if (/\blow\b/.test(lower))    { priority='Low';    title=title.replace(/\blow\b/gi,'').trim() }
  else if (/\bmedium\b/.test(lower)) { priority='Medium'; title=title.replace(/\bmedium\b/gi,'').trim() }
  for(const cat of CATS){ if(new RegExp(`\\b${cat.name}\\b`,'i').test(lower)){ category=cat.name;title=title.replace(new RegExp(`\\b${cat.name}\\b`,'gi'),'').trim();break } }
  title=title.replace(/\s+/g,' ').replace(/,\s*$/,'').trim()
  return { title, dueDate, priority, category:category||'Personal', recurring:'None', notes:'', estimatedTime:'', subtasks:[] }
}

const getNextDue = task => {
  if(!task.dueDate||task.recurring==='None') return null
  const d=new Date(task.dueDate+'T00:00:00')
  if(task.recurring==='Daily')   d.setDate(d.getDate()+1)
  if(task.recurring==='Weekly')  d.setDate(d.getDate()+7)
  if(task.recurring==='Monthly') d.setMonth(d.getMonth()+1)
  return ld(d)
}

const sortTasks = tasks => [...tasks].sort((a,b)=>{
  if(isOverdue(a)!==isOverdue(b)) return isOverdue(a)?-1:1
  if(isToday(a)!==isToday(b))     return isToday(a)?-1:1
  const po=(PRIO_ORDER[a.priority||'Medium'])-(PRIO_ORDER[b.priority||'Medium'])
  if(po!==0) return po
  if(a.dueDate&&b.dueDate) return a.dueDate.localeCompare(b.dueDate)
  return 0
})

const motivational = () => {
  const msgs=['Make today count. 🌟','Small steps, big progress. 🚀',"You've got this. 💪",
    'Focus on what matters most. 🎯','One task at a time. ⚡','Clarity beats urgency. 🧘',
    'Your future self will thank you. 🙌','Progress over perfection. ✨']
  return msgs[new Date().getDate()%msgs.length]
}

// ─── STYLE HELPERS ────────────────────────────────────────
const card = (x={}) => ({ background:C.card, borderRadius:14, padding:14, marginBottom:10, border:`1px solid ${C.border}`, boxShadow:'0 2px 12px rgba(0,0,0,0.35)', ...x })
const inp  = (x={}) => ({ width:'100%', border:`1.5px solid ${C.border}`, borderRadius:11, padding:'11px 13px', fontSize:16, boxSizing:'border-box', outline:'none', fontFamily:'inherit', background:C.surface, color:C.text, ...x })
const btn  = (bg,x={}) => ({ background:bg, color:'#fff', border:'none', borderRadius:11, padding:'11px 18px', fontSize:14, fontWeight:700, cursor:'pointer', minHeight:44, display:'inline-flex', alignItems:'center', justifyContent:'center', ...x })
const pill = (active,col=C.accent) => ({ background:active?col:C.surface2, color:active?'#fff':C.textSec, border:`1px solid ${active?col:C.border}`, borderRadius:8, padding:'7px 14px', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', minHeight:36, display:'inline-flex', alignItems:'center' })
const secHdr = label => (
  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, marginTop:4 }}>
    <span style={{ fontSize:11, fontWeight:700, color:C.textMut, textTransform:'uppercase', letterSpacing:1 }}>{label}</span>
    <div style={{ flex:1, height:1, background:C.border }}/>
  </div>
)

const BLANK_TASK = { title:'', category:'Personal', priority:'Medium', dueDate:'', recurring:'None', notes:'', estimatedTime:'', subtasks:[] }

// ─── QUICK ADD ────────────────────────────────────────────
function QuickAdd({ onAdd, placeholder="Add task… try 'Call mom tomorrow high'" }) {
  const [val,setVal] = useState('')
  const submit = () => { const t=val.trim(); if(!t) return; onAdd(parseQuickAdd(t)); setVal('') }
  return (
    <div style={{ display:'flex', gap:8, marginBottom:16 }}>
      <input value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}
        placeholder={placeholder} style={{ ...inp(), flex:1, fontSize:14, padding:'11px 14px' }}/>
      <button onClick={submit} style={{ ...btn(C.accent), padding:'0 18px', fontSize:20, flexShrink:0 }}>+</button>
    </div>
  )
}

// ─── UNDO TOAST ───────────────────────────────────────────
function UndoToast({ item, onUndo, onDismiss }) {
  if(!item) return null
  const label = item.type==='task' ? item.item.title : (item.item.title||'Untitled note')
  return (
    <div className="slide-up" style={{ position:'fixed', bottom:90, left:'50%', transform:'translateX(-50%)', zIndex:500, background:C.surface2, border:`1px solid ${C.border}`, borderRadius:14, padding:'12px 16px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 8px 32px rgba(0,0,0,0.5)', maxWidth:360, width:'calc(100% - 32px)' }}>
      <span style={{ fontSize:13, color:C.textSec, flex:1 }}>Deleted "{label.slice(0,30)}{label.length>30?'…':''}"</span>
      <button onClick={onUndo} style={{ ...btn(C.accentBr), padding:'6px 14px', fontSize:13, borderRadius:9, minHeight:'auto' }}>Undo</button>
      <button onClick={onDismiss} style={{ background:'none', border:'none', color:C.textMut, cursor:'pointer', fontSize:18, minHeight:'auto', padding:'0 2px', width:'auto' }}>×</button>
    </div>
  )
}

// ─── CONFIRM MODAL ────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div className="scale-in" style={{ ...card(), padding:24, width:'100%', maxWidth:320, textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>🗑️</div>
        <div style={{ color:C.text, fontWeight:700, fontSize:16, marginBottom:8 }}>Delete?</div>
        <div style={{ color:C.textSec, fontSize:14, marginBottom:20 }}>{message}</div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel}  style={{ ...btn(C.surface), flex:1, border:`1px solid ${C.border}`, color:C.text }}>Cancel</button>
          <button onClick={onConfirm} style={{ ...btn(C.red), flex:1 }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

// ─── FOCUS TIMER ──────────────────────────────────────────
function FocusTimer({ task, onClose }) {
  const [secs,setSecs]       = useState(25*60)
  const [running,setRunning] = useState(false)
  const [done,setDone]       = useState(false)
  useEffect(()=>{
    if(!running) return
    const t=setInterval(()=>setSecs(s=>{ if(s<=1){clearInterval(t);setRunning(false);setDone(true);return 0} return s-1 }),1000)
    return ()=>clearInterval(t)
  },[running])
  const mm=String(Math.floor(secs/60)).padStart(2,'0'), ss=String(secs%60).padStart(2,'0')
  const r=54, circ=2*Math.PI*r
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:24 }}>
      <div style={{ color:C.textSec, fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>Focus Session</div>
      <div style={{ color:C.text, fontSize:17, fontWeight:700, textAlign:'center', maxWidth:260, lineHeight:1.4 }}>{task.title}</div>
      <svg width={140} height={140}>
        <circle cx={70} cy={70} r={r} fill="none" stroke={C.surface} strokeWidth={8}/>
        <circle cx={70} cy={70} r={r} fill="none" stroke={done?C.green:C.accentBr} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={circ*(1-(1-secs/(25*60)))}
          strokeLinecap="round" transform="rotate(-90 70 70)" style={{ transition:'stroke-dashoffset .5s' }}/>
        <text x={70} y={78} textAnchor="middle" fill={C.text} fontSize={28} fontWeight={700} fontFamily="system-ui">
          {done?'✓':`${mm}:${ss}`}
        </text>
      </svg>
      {done&&<div style={{ color:C.green, fontWeight:700, fontSize:16 }}>Session complete! 🎉</div>}
      <div style={{ display:'flex', gap:12 }}>
        {!done&&<button onClick={()=>setRunning(r=>!r)} style={{ ...btn(running?C.surface:C.accentBr), padding:'13px 28px', fontSize:15, borderRadius:14, border:`1px solid ${C.border}` }}>{running?'Pause':'Start'}</button>}
        <button onClick={onClose} style={{ ...btn(C.surface), padding:'13px 24px', fontSize:15, borderRadius:14, border:`1px solid ${C.border}`, color:C.text }}>Close</button>
      </div>
    </div>
  )
}

// ─── EXPORT / IMPORT MODAL ────────────────────────────────
function ExportImportModal({ tasks, notes, onImport, onClose }) {
  const fileRef=useRef()
  const exportData=()=>{
    const data=JSON.stringify({tasks,notes,exportedAt:new Date().toISOString(),version:2},null,2)
    const blob=new Blob([data],{type:'application/json'})
    const url=URL.createObjectURL(blob)
    const a=document.createElement('a'); a.href=url
    a.download=`commander-backup-${new Date().toISOString().split('T')[0]}.json`; a.click()
    URL.revokeObjectURL(url)
  }
  const importData=e=>{
    const file=e.target.files[0]; if(!file) return
    const reader=new FileReader()
    reader.onload=ev=>{ try{ const data=JSON.parse(ev.target.result); if(Array.isArray(data.tasks)&&Array.isArray(data.notes)){onImport(data);onClose()}else{alert('Invalid backup file.')} }catch{alert('Could not parse file.')} }
    reader.readAsText(file)
  }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:300, display:'flex', alignItems:'flex-end' }}>
      <div className="slide-up" style={{ background:C.card, borderRadius:'22px 22px 0 0', padding:24, width:'100%', border:`1px solid ${C.border}`, paddingBottom:'max(24px, env(safe-area-inset-bottom))' }}>
        <div style={{ width:36, height:4, background:C.border, borderRadius:2, margin:'0 auto 20px' }}/>
        <div style={{ fontSize:18, fontWeight:700, color:C.text, marginBottom:6 }}>Data & Backup</div>
        <div style={{ fontSize:13, color:C.textSec, marginBottom:20 }}>Export tasks and notes as JSON, or restore from a backup.</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={exportData} style={{ ...btn(`linear-gradient(135deg,${C.accent},#1e40af)`), width:'100%', padding:15, fontSize:15, borderRadius:13 }}>↓ Export Backup</button>
          <button onClick={()=>fileRef.current?.click()} style={{ ...btn(C.surface2), width:'100%', padding:15, fontSize:15, borderRadius:13, border:`1px solid ${C.border}`, color:C.text }}>↑ Import Backup</button>
          <input ref={fileRef} type="file" accept=".json" onChange={importData} style={{ display:'none' }}/>
          <div style={{ fontSize:11, color:C.textMut, textAlign:'center', marginTop:4 }}>{tasks.length} tasks · {notes.length} notes stored locally</div>
          <button onClick={onClose} style={{ ...btn('transparent'), width:'100%', padding:13, fontSize:14, color:C.textSec, borderRadius:13, border:`1px solid ${C.border}` }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── TASK MODAL ───────────────────────────────────────────
function TaskModal({ initial, onSave, onClose }) {
  const [f,setF]=useState(initial?{...BLANK_TASK,...initial,subtasks:initial.subtasks||[]}:{...BLANK_TASK})
  const [newSub,setNewSub]=useState('')
  const set=(k,v)=>setF(p=>({...p,[k]:v}))
  const addSub=()=>{ if(newSub.trim()){set('subtasks',[...f.subtasks,{id:uid(),title:newSub.trim(),done:false}]);setNewSub('')} }
  const lbl=t=><label style={{ fontSize:12, fontWeight:700, color:C.textSec, marginBottom:6, display:'block', textTransform:'uppercase', letterSpacing:0.5 }}>{t}</label>
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:100, display:'flex', alignItems:'flex-end' }}>
      <div className="slide-up" style={{ background:C.card, borderRadius:'22px 22px 0 0', padding:20, width:'100%', maxHeight:'92vh', overflowY:'auto', boxSizing:'border-box', border:`1px solid ${C.border}`, paddingBottom:'max(20px, env(safe-area-inset-bottom))' }}>
        <div style={{ width:36, height:4, background:C.border, borderRadius:2, margin:'0 auto 16px' }}/>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <span style={{ fontSize:17, fontWeight:700, color:C.text }}>{initial?'Edit Task':'New Task'}</span>
          <button onClick={onClose} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:9, width:32, height:32, minWidth:32, minHeight:32, cursor:'pointer', color:C.textSec, fontSize:16 }}>✕</button>
        </div>
        {lbl('Title')}
        <input style={{ ...inp(), marginBottom:16 }} value={f.title} onChange={e=>set('title',e.target.value)} placeholder="Task title…"/>
        {lbl('Category')}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
          {CATS.map(c=><button key={c.name} onClick={()=>set('category',c.name)} style={{ background:f.category===c.name?c.color:C.surface2, color:f.category===c.name?'#fff':c.color, border:`1px solid ${f.category===c.name?c.color:C.border}`, borderRadius:9, padding:'7px 13px', fontSize:13, fontWeight:700, cursor:'pointer', minHeight:36 }}>{c.name}</button>)}
        </div>
        {lbl('Priority')}
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          {['Low','Medium','High'].map(p=><button key={p} onClick={()=>set('priority',p)} style={{ flex:1, background:f.priority===p?PRIO_COLORS[p]:C.surface2, color:f.priority===p?'#fff':PRIO_COLORS[p], border:`1px solid ${f.priority===p?PRIO_COLORS[p]:C.border}`, borderRadius:9, padding:'10px 4px', fontSize:13, fontWeight:700, cursor:'pointer', minHeight:44 }}>{p}</button>)}
        </div>
        <div style={{ display:'flex', gap:10, marginBottom:16 }}>
          <div style={{ flex:1 }}>{lbl('Due Date')}<input type="date" style={{ ...inp() }} value={f.dueDate} onChange={e=>set('dueDate',e.target.value)}/></div>
          <div style={{ flex:1 }}>{lbl('Est. Time')}<select style={{ ...inp(), cursor:'pointer' }} value={f.estimatedTime} onChange={e=>set('estimatedTime',e.target.value)}>{TIME_OPTS.map(o=><option key={o} value={o}>{o||'None'}</option>)}</select></div>
        </div>
        {lbl('Recurring')}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
          {RECUR_OPTS.map(r=><button key={r} onClick={()=>set('recurring',r)} style={{ background:f.recurring===r?C.accent:C.surface2, color:f.recurring===r?'#fff':C.textSec, border:`1px solid ${f.recurring===r?C.accentBr:C.border}`, borderRadius:9, padding:'7px 14px', fontSize:13, fontWeight:600, cursor:'pointer', minHeight:36 }}>{r}</button>)}
        </div>
        {lbl('Checklist')}
        <div style={{ background:C.surface, borderRadius:11, padding:12, marginBottom:16, border:`1px solid ${C.border}` }}>
          {f.subtasks.map(s=>(
            <div key={s.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <button onClick={()=>set('subtasks',f.subtasks.map(x=>x.id===s.id?{...x,done:!x.done}:x))}
                style={{ background:s.done?C.accentBr:'transparent', border:`2px solid ${s.done?C.accentBr:C.border}`, borderRadius:'50%', width:22, height:22, minWidth:22, minHeight:22, cursor:'pointer' }}>
                {s.done&&<span style={{ color:'#fff', fontSize:10 }}>✓</span>}
              </button>
              <span style={{ flex:1, fontSize:14, color:s.done?C.textMut:C.text, textDecoration:s.done?'line-through':'none' }}>{s.title}</span>
              <button onClick={()=>set('subtasks',f.subtasks.filter(x=>x.id!==s.id))} style={{ background:'none', border:'none', color:C.textMut, cursor:'pointer', fontSize:18, minHeight:'auto', width:'auto' }}>×</button>
            </div>
          ))}
          <div style={{ display:'flex', gap:8, marginTop:f.subtasks.length?8:0 }}>
            <input value={newSub} onChange={e=>setNewSub(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addSub()} placeholder="Add checklist item…" style={{ ...inp(), flex:1, fontSize:14, padding:'8px 11px' }}/>
            <button onClick={addSub} style={{ ...btn(C.surface2), padding:'8px 14px', border:`1px solid ${C.border}`, borderRadius:9, minHeight:'auto', color:C.text }}>+</button>
          </div>
        </div>
        {lbl('Notes')}
        <textarea style={{ ...inp(), minHeight:70, resize:'vertical', marginBottom:20 }} value={f.notes} onChange={e=>set('notes',e.target.value)} placeholder="Optional notes…"/>
        <button onClick={()=>{ if(f.title.trim()){onSave(f);onClose()} }}
          style={{ ...btn(`linear-gradient(135deg,${C.accent},#1e40af)`), width:'100%', padding:15, fontSize:16, borderRadius:13 }}>
          {initial?'Save Changes':'Add Task'}
        </button>
      </div>
    </div>
  )
}

// ─── TASK CARD ────────────────────────────────────────────
function TaskCard({ task, onToggle, onDelete, onEdit, onFocus, onSnooze }) {
  const [expanded,setExpanded]=useState(false)
  const [confirm,setConfirm]=useState(false)
  const cat=catFor(task.category), ov=isOverdue(task)
  const subDone=(task.subtasks||[]).filter(s=>s.done).length
  const subTotal=(task.subtasks||[]).length
  return (
    <>
      <div className="fade-in" style={{ ...card(), borderLeft:`3px solid ${ov?C.red:cat.color}`, opacity:task.completed?0.5:1, marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
          <button onClick={()=>onToggle(task.id)} style={{ background:task.completed?cat.color:'transparent', border:`2px solid ${task.completed?cat.color:C.border}`, borderRadius:'50%', width:24, height:24, minWidth:24, minHeight:24, cursor:'pointer', marginTop:2, flexShrink:0 }}>
            {task.completed&&<span style={{ color:'#fff', fontSize:10 }}>✓</span>}
          </button>
          <div style={{ flex:1, minWidth:0 }} onClick={()=>setExpanded(e=>!e)}>
            <div style={{ fontWeight:600, fontSize:15, color:task.completed?C.textMut:C.text, textDecoration:task.completed?'line-through':'none', wordBreak:'break-word', lineHeight:1.3 }}>{task.title}</div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:5, alignItems:'center' }}>
              <span style={{ background:cat.bg, color:cat.color, borderRadius:6, padding:'2px 7px', fontSize:11, fontWeight:700 }}>{task.category}</span>
              <span style={{ background:ov?C.danger:C.surface2, color:PRIO_COLORS[task.priority||'Medium'], borderRadius:6, padding:'2px 7px', fontSize:11, fontWeight:700 }}>{task.priority||'Medium'}</span>
              {task.dueDate&&<span style={{ background:ov?C.danger:C.surface2, color:ov?C.red:C.textSec, borderRadius:6, padding:'2px 7px', fontSize:11 }}>{ov?'⚠️ ':''}{fmtDate(task.dueDate)}</span>}
              {task.estimatedTime&&<span style={{ background:C.surface2, color:C.textSec, borderRadius:6, padding:'2px 7px', fontSize:11 }}>⏱ {task.estimatedTime}</span>}
              {task.recurring&&task.recurring!=='None'&&<span style={{ background:C.surface2, color:C.purple, borderRadius:6, padding:'2px 7px', fontSize:11 }}>↻ {task.recurring}</span>}
              {subTotal>0&&<span style={{ background:C.surface2, color:C.accentBr, borderRadius:6, padding:'2px 7px', fontSize:11 }}>☑ {subDone}/{subTotal}</span>}
            </div>
            {subTotal>0&&(
              <div style={{ marginTop:7, height:3, background:C.border, borderRadius:2, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${(subDone/subTotal)*100}%`, background:C.accentBr, borderRadius:2, transition:'width .3s' }}/>
              </div>
            )}
          </div>
          <div style={{ fontSize:13, color:C.textMut, marginTop:4, flexShrink:0 }}>{expanded?'▲':'▼'}</div>
        </div>
        {expanded&&(
          <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
            {task.notes&&<div style={{ fontSize:13, color:C.textSec, marginBottom:10, lineHeight:1.5 }}>{task.notes}</div>}
            {(task.subtasks||[]).length>0&&(
              <div style={{ marginBottom:10 }}>
                {task.subtasks.map(s=>(
                  <div key={s.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <div style={{ width:14, height:14, borderRadius:'50%', border:`2px solid ${s.done?C.accentBr:C.border}`, background:s.done?C.accentBr:'transparent', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {s.done&&<span style={{ color:'#fff', fontSize:8 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:13, color:s.done?C.textMut:C.textSec, textDecoration:s.done?'line-through':'none' }}>{s.title}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
              {[['▶ Focus',()=>onFocus(task)],['💤 Tomorrow',()=>onSnooze(task,'tomorrow')],['💤 Next Week',()=>onSnooze(task,'nextweek')],['✏️ Edit',()=>onEdit(task)]].map(([label,action])=>(
                <button key={label} onClick={action} style={{ ...btn(C.surface2), padding:'7px 13px', fontSize:12, borderRadius:9, border:`1px solid ${C.border}`, minHeight:36, color:C.text }}>{label}</button>
              ))}
              <button onClick={()=>setConfirm(true)} style={{ ...btn('transparent'), padding:'7px 13px', fontSize:12, borderRadius:9, border:`1px solid ${C.border}`, color:C.red, minHeight:36 }}>🗑 Delete</button>
            </div>
          </div>
        )}
      </div>
      {confirm&&<ConfirmModal message={`Delete "${task.title}"?`} onConfirm={()=>{onDelete(task.id);setConfirm(false)}} onCancel={()=>setConfirm(false)}/>}
    </>
  )
}

// ─── HOME SCREEN ──────────────────────────────────────────
function HomeScreen({ tasks, addTask, updateTask, deleteTask, onBackup }) {
  const [showModal,setShowModal]=useState(false)
  const [editTask,setEditTask]=useState(null)
  const [focusTask,setFocusTask]=useState(null)
  const toggle=useCallback(id=>{
    const t=tasks.find(x=>x.id===id); if(!t) return
    if(!t.completed&&t.recurring&&t.recurring!=='None'){ const next=getNextDue(t); if(next) addTask({...t,id:uid(),dueDate:next,completed:false,createdAt:new Date().toISOString()}) }
    updateTask(id,{completed:!t.completed})
  },[tasks,addTask,updateTask])
  const snooze=(t,when)=>{ const d=new Date(); if(when==='tomorrow')d.setDate(d.getDate()+1); if(when==='nextweek')d.setDate(d.getDate()+7); updateTask(t.id,{dueDate:ld(d)}) }
  const active=tasks.filter(t=>!t.completed)
  const overdue=active.filter(isOverdue)
  const todayTasks=active.filter(isToday)
  const focus=sortTasks(active.filter(t=>t.priority==='High'||isToday(t)||isOverdue(t))).slice(0,3)
  const upcoming=sortTasks(active.filter(t=>t.dueDate>todayStr())).slice(0,5)
  const doneTodayCount=tasks.filter(t=>t.completed&&t.dueDate===todayStr()).length
  const todayTotal=todayTasks.length+doneTodayCount
  const h=new Date().getHours()
  const greet=h<5?'Up late 🌙':h<12?'Good morning ☀️':h<17?'Good afternoon ⚡':h<21?'Good evening 🌆':'Good night 🌙'
  const dayStr=new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})
  return (
    <div style={{ background:C.bg, minHeight:'100%' }}>
      <div style={{ background:'linear-gradient(160deg,#000 0%,#091120 60%,#0d1f48 100%)', padding:`max(48px,calc(20px + env(safe-area-inset-top))) 20px 24px` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:C.textMut, textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>{dayStr}</div>
            <div style={{ fontSize:26, fontWeight:700, color:C.text, marginBottom:4 }}>{greet}</div>
            <div style={{ fontSize:13, color:C.textSec, marginBottom:20 }}>{motivational()}</div>
          </div>
          <button onClick={onBackup} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'8px 10px', cursor:'pointer', fontSize:18, minHeight:44, minWidth:44 }}>⚙️</button>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          {[[overdue.length,'Overdue',C.red],[todayTasks.length,'Today',C.accentBr],[tasks.filter(t=>t.completed).length,'Done',C.green]].map(([n,lb,col])=>(
            <div key={lb} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:13, padding:'12px 0', flex:1, textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:700, color:col }}>{n}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginTop:2 }}>{lb}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding:'16px 16px 8px' }}>
        <QuickAdd onAdd={addTask}/>
        {todayTotal>0&&(
          <div style={{ ...card(), marginBottom:16, padding:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <span style={{ fontSize:13, fontWeight:700, color:C.textSec }}>Today's Progress</span>
              <span style={{ fontSize:13, fontWeight:700, color:C.accentBr }}>{doneTodayCount}/{todayTotal}</span>
            </div>
            <div style={{ height:6, background:C.border, borderRadius:4, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${(doneTodayCount/todayTotal)*100}%`, background:`linear-gradient(90deg,${C.accent},${C.accentBr})`, borderRadius:4, transition:'width .4s' }}/>
            </div>
          </div>
        )}
        {focus.length>0&&<div style={{ marginBottom:20 }}>{secHdr('✦ Focus Today')}{focus.map(t=><TaskCard key={t.id} task={t} onToggle={toggle} onDelete={deleteTask} onEdit={setEditTask} onFocus={setFocusTask} onSnooze={snooze}/>)}</div>}
        {overdue.length>0&&<div style={{ marginBottom:20 }}>{secHdr('⚠️ Overdue')}{overdue.map(t=><TaskCard key={t.id} task={t} onToggle={toggle} onDelete={deleteTask} onEdit={setEditTask} onFocus={setFocusTask} onSnooze={snooze}/>)}</div>}
        {todayTasks.length>0&&<div style={{ marginBottom:20 }}>{secHdr('📅 Today')}{todayTasks.map(t=><TaskCard key={t.id} task={t} onToggle={toggle} onDelete={deleteTask} onEdit={setEditTask} onFocus={setFocusTask} onSnooze={snooze}/>)}</div>}
        {upcoming.length>0&&<div style={{ marginBottom:20 }}>{secHdr('🔜 Upcoming')}{upcoming.map(t=><TaskCard key={t.id} task={t} onToggle={toggle} onDelete={deleteTask} onEdit={setEditTask} onFocus={setFocusTask} onSnooze={snooze}/>)}</div>}
        {active.length===0&&(
          <div style={{ textAlign:'center', padding:'48px 20px' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🎉</div>
            <div style={{ color:C.text, fontWeight:700, fontSize:18, marginBottom:8 }}>All clear!</div>
            <div style={{ color:C.textSec, fontSize:14, lineHeight:1.6 }}>No pending tasks. Use Quick Add above or tap + to get started.</div>
          </div>
        )}
      </div>
      <button onClick={()=>setShowModal(true)} style={{ position:'fixed', bottom:'calc(80px + env(safe-area-inset-bottom))', right:20, width:56, height:56, borderRadius:'50%', background:`linear-gradient(135deg,${C.accent},#1e40af)`, border:'none', cursor:'pointer', fontSize:28, color:'#fff', boxShadow:'0 4px 20px rgba(29,78,216,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:40 }}>+</button>
      {showModal&&<TaskModal onSave={addTask} onClose={()=>setShowModal(false)}/>}
      {editTask&&<TaskModal initial={editTask} onSave={u=>updateTask(editTask.id,u)} onClose={()=>setEditTask(null)}/>}
      {focusTask&&<FocusTimer task={focusTask} onClose={()=>setFocusTask(null)}/>}
    </div>
  )
}

// ─── TASKS SCREEN ─────────────────────────────────────────
function TasksScreen({ tasks, addTask, updateTask, deleteTask }) {
  const [showModal,setShowModal]=useState(false),[editTask,setEditTask]=useState(null),[focusTask,setFocusTask]=useState(null)
  const [view,setView]=useState('All'),[catF,setCatF]=useState('All')
  const toggle=useCallback(id=>{
    const t=tasks.find(x=>x.id===id); if(!t) return
    if(!t.completed&&t.recurring&&t.recurring!=='None'){ const next=getNextDue(t); if(next) addTask({...t,id:uid(),dueDate:next,completed:false,createdAt:new Date().toISOString()}) }
    updateTask(id,{completed:!t.completed})
  },[tasks,addTask,updateTask])
  const snooze=(t,when)=>{ const d=new Date(); if(when==='tomorrow')d.setDate(d.getDate()+1); if(when==='nextweek')d.setDate(d.getDate()+7); updateTask(t.id,{dueDate:ld(d)}) }
  const VIEWS=['All','Today','Overdue','High Priority','Inbox','Completed']
  const filtered=sortTasks(tasks.filter(t=>{
    if(catF!=='All'&&t.category!==catF) return false
    if(view==='Today')         return isToday(t)&&!t.completed
    if(view==='Overdue')       return isOverdue(t)
    if(view==='High Priority') return t.priority==='High'&&!t.completed
    if(view==='Inbox')         return !t.dueDate&&!t.completed
    if(view==='Completed')     return t.completed
    return !t.completed
  }))
  return (
    <div style={{ background:C.bg, minHeight:'100%' }}>
      <div style={{ padding:`max(52px,calc(16px + env(safe-area-inset-top))) 16px 10px`, background:C.card, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:C.text }}>Tasks</h1>
          <button onClick={()=>setShowModal(true)} style={{ ...btn(C.accent), padding:'8px 16px', fontSize:13, borderRadius:10, minHeight:36 }}>+ New</button>
        </div>
        <QuickAdd onAdd={addTask} placeholder="Quick add… 'Call dentist Friday high'"/>
        <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:6, marginBottom:8 }}>
          {VIEWS.map(v=><button key={v} onClick={()=>setView(v)} style={{ ...pill(view===v), minHeight:36 }}>{v}</button>)}
        </div>
        <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2 }}>
          {['All',...CATS.map(c=>c.name)].map(c=>{ const ci=CATS.find(x=>x.name===c); return <button key={c} onClick={()=>setCatF(c)} style={{ ...pill(catF===c,ci?.color||C.accent), minHeight:36 }}>{c}</button> })}
        </div>
      </div>
      <div style={{ padding:16 }}>
        {filtered.length===0
          ?<div style={{ textAlign:'center', color:C.textMut, padding:48 }}><div style={{ fontSize:44, marginBottom:12 }}>✦</div><div style={{ fontSize:15, color:C.textSec }}>{view==='Inbox'?'No unscheduled tasks':'Nothing here'}</div></div>
          :filtered.map(t=><TaskCard key={t.id} task={t} onToggle={toggle} onDelete={deleteTask} onEdit={setEditTask} onFocus={setFocusTask} onSnooze={snooze}/>)}
      </div>
      {showModal&&<TaskModal onSave={addTask} onClose={()=>setShowModal(false)}/>}
      {editTask&&<TaskModal initial={editTask} onSave={u=>updateTask(editTask.id,u)} onClose={()=>setEditTask(null)}/>}
      {focusTask&&<FocusTimer task={focusTask} onClose={()=>setFocusTask(null)}/>}
    </div>
  )
}

// ─── CALENDAR SCREEN ──────────────────────────────────────
function CalendarScreen({ tasks, addTask }) {
  const [vd,setVd]=useState(new Date()),[sel,setSel]=useState(todayStr()),[showAdd,setShowAdd]=useState(false)
  const yr=vd.getFullYear(),mo=vd.getMonth()
  const first=new Date(yr,mo,1).getDay(),dim=new Date(yr,mo+1,0).getDate()
  const byDay={}; tasks.forEach(t=>{ if(t.dueDate){(byDay[t.dueDate]=byDay[t.dueDate]||[]).push(t)} })
  const ds=d=>`${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  const selTasks=tasks.filter(t=>t.dueDate===sel)
  return (
    <div style={{ background:C.bg, minHeight:'100%' }}>
      <div style={{ padding:`max(52px,calc(16px + env(safe-area-inset-top))) 16px 10px`, background:C.card, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:C.text }}>Calendar</h1>
          <button onClick={()=>{setVd(new Date());setSel(todayStr())}} style={{ ...btn(C.surface2), padding:'7px 14px', fontSize:13, border:`1px solid ${C.border}`, borderRadius:9, minHeight:36, color:C.text }}>Today</button>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <button onClick={()=>setVd(new Date(yr,mo-1,1))} style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:C.accentBr, padding:'4px 10px', minHeight:44 }}>‹</button>
          <span style={{ fontWeight:700, fontSize:16, color:C.text }}>{vd.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</span>
          <button onClick={()=>setVd(new Date(yr,mo+1,1))} style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:C.accentBr, padding:'4px 10px', minHeight:44 }}>›</button>
        </div>
      </div>
      <div style={{ padding:'12px 12px 0' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:6 }}>
          {['S','M','T','W','T','F','S'].map((d,i)=><div key={i} style={{ textAlign:'center', fontSize:11, fontWeight:700, color:C.textMut, padding:'4px 0' }}>{d}</div>)}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
          {Array.from({length:first}).map((_,i)=><div key={'e'+i}/>)}
          {Array.from({length:dim}).map((_,i)=>{
            const d=i+1,dss=ds(d),isT=dss===todayStr(),isSel=dss===sel
            const dt=byDay[dss]||[],hasOv=dt.some(t=>isOverdue(t)),hasHi=dt.some(t=>t.priority==='High')
            return (
              <button key={d} onClick={()=>setSel(dss)} style={{ background:isSel?C.accent:isT?C.surface2:C.surface, color:isSel?'#fff':isT?C.accentBr:C.text, border:`2px solid ${isSel?C.accentBr:isT?C.accentBr:C.border}`, borderRadius:11, padding:'7px 2px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:3, minHeight:46 }}>
                <span style={{ fontSize:13, fontWeight:isT||isSel?700:400 }}>{d}</span>
                {dt.length>0&&<div style={{ display:'flex', gap:2 }}>{dt.slice(0,3).map((_,ti)=><div key={ti} style={{ width:5, height:5, borderRadius:'50%', background:isSel?'rgba(255,255,255,0.8)':hasOv?C.red:hasHi?C.yellow:C.accentBr }}/>)}</div>}
              </button>
            )
          })}
        </div>
        <div style={{ marginTop:18, paddingBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <span style={{ fontSize:12, fontWeight:700, color:C.textMut, textTransform:'uppercase', letterSpacing:0.8 }}>{new Date(sel+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</span>
            <button onClick={()=>setShowAdd(true)} style={{ ...btn(C.accent), padding:'6px 13px', fontSize:12, borderRadius:9, minHeight:36 }}>+ Add</button>
          </div>
          {selTasks.length===0
            ?<div style={{ textAlign:'center', color:C.textMut, padding:20, fontSize:14 }}>No tasks — tap + Add to schedule one</div>
            :selTasks.map(t=>{ const cat=catFor(t.category); return (
              <div key={t.id} style={{ ...card(), borderLeft:`3px solid ${cat.color}`, display:'flex', gap:10, alignItems:'center', marginBottom:8 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:t.completed?C.green:cat.color, flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, color:t.completed?C.textMut:C.text, textDecoration:t.completed?'line-through':'none', fontSize:14 }}>{t.title}</div>
                  <div style={{ fontSize:11, color:C.textSec, marginTop:2 }}>{t.category} · {t.priority}{t.estimatedTime?` · ${t.estimatedTime}`:''}</div>
                </div>
                <span style={{ fontSize:11, fontWeight:700, color:PRIO_COLORS[t.priority||'Medium'], background:C.surface2, borderRadius:6, padding:'2px 7px' }}>{t.priority}</span>
              </div>
            )})}
        </div>
      </div>
      {showAdd&&<TaskModal onSave={t=>addTask({...t,dueDate:sel})} onClose={()=>setShowAdd(false)}/>}
    </div>
  )
}

// ─── NOTE EDITOR ──────────────────────────────────────────
function NoteEditor({ form, setForm, subjects, onSave, onClose }) {
  const [showSug,setShowSug]=useState(false)
  const set=(k,v)=>setForm(p=>({...p,[k]:v}))
  const tags=form.tags?form.tags.split(',').map(t=>t.trim()).filter(Boolean):[]
  const filtSub=subjects.filter(s=>s.toLowerCase().includes(form.subject.toLowerCase())&&s!==form.subject)
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:C.bg }}>
      <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:`max(52px,calc(12px + env(safe-area-inset-top))) 16px 12px`, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <button onClick={onClose} style={{ background:'none', border:'none', fontSize:15, cursor:'pointer', color:C.accentBr, fontWeight:700, minHeight:44 }}>‹ Cancel</button>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>set('pinned',!form.pinned)} style={{ background:form.pinned?C.warn:C.surface2, border:`1px solid ${C.border}`, borderRadius:9, padding:'7px 12px', cursor:'pointer', fontSize:14, color:form.pinned?C.yellow:C.textSec, minHeight:36 }}>📌</button>
          <button onClick={()=>set('starred',!form.starred)} style={{ background:form.starred?C.warn:C.surface2, border:`1px solid ${C.border}`, borderRadius:9, padding:'7px 12px', cursor:'pointer', fontSize:14, color:form.starred?C.yellow:C.textSec, minHeight:36 }}>{form.starred?'⭐':'☆'}</button>
          <button onClick={onSave} style={{ ...btn(C.accent), padding:'7px 20px', fontSize:14, borderRadius:10, minHeight:36 }}>Save</button>
        </div>
      </div>
      <div style={{ overflowY:'auto', flex:1, WebkitOverflowScrolling:'touch' }}>
        <div style={{ padding:'16px 16px 0' }}>
          <input value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Note title…"
            style={{ width:'100%', border:'none', outline:'none', fontSize:22, fontWeight:700, fontFamily:'inherit', background:'transparent', color:C.text, boxSizing:'border-box' }}/>
        </div>
        <div style={{ padding:'10px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', flexDirection:'column', gap:9 }}>
          <div style={{ position:'relative' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, background:C.surface, borderRadius:10, border:`1px solid ${C.border}`, padding:'9px 12px' }}>
              <span style={{ fontSize:14 }}>📁</span>
              <input value={form.subject} onChange={e=>{set('subject',e.target.value);setShowSug(true)}}
                onFocus={()=>setShowSug(true)} onBlur={()=>setTimeout(()=>setShowSug(false),180)}
                placeholder="Subject / Person / Folder…"
                style={{ flex:1, border:'none', outline:'none', background:'transparent', color:C.text, fontSize:14, fontFamily:'inherit' }}/>
            </div>
            {showSug&&filtSub.length>0&&(
              <div style={{ position:'absolute', top:'100%', left:0, right:0, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, zIndex:20, marginTop:4, overflow:'hidden' }}>
                {filtSub.slice(0,5).map(s=><div key={s} onClick={()=>{set('subject',s);setShowSug(false)}} style={{ padding:'12px 14px', cursor:'pointer', color:C.text, fontSize:14, borderBottom:`1px solid ${C.border}` }}>📁 {s}</div>)}
              </div>
            )}
          </div>
          <div style={{ background:C.surface, borderRadius:10, border:`1px solid ${C.border}`, padding:'9px 12px' }}>
            <input value={form.tags} onChange={e=>set('tags',e.target.value)} placeholder="# Tags, comma separated…"
              style={{ width:'100%', border:'none', outline:'none', background:'transparent', color:C.text, fontSize:14, fontFamily:'inherit' }}/>
            {tags.length>0&&<div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:8 }}>{tags.map((t,i)=><span key={i} style={{ background:C.surface2, color:C.accentBr, border:`1px solid ${C.border}`, borderRadius:6, padding:'2px 9px', fontSize:11 }}>#{t}</span>)}</div>}
          </div>
          {form.updatedAt&&<div style={{ fontSize:11, color:C.textMut }}>{new Date(form.updatedAt).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>}
        </div>
        <textarea value={form.content} onChange={e=>set('content',e.target.value)}
          placeholder={"Start writing…\n\nTip: Lines starting with '- [ ]' or 'todo:' can be converted to tasks."}
          style={{ width:'100%', border:'none', outline:'none', padding:16, fontSize:15, fontFamily:'inherit', resize:'none', background:C.bg, color:C.text, lineHeight:1.8, minHeight:300, boxSizing:'border-box' }}/>
      </div>
    </div>
  )
}

// ─── NOTE CARD ────────────────────────────────────────────
function NoteCard({ note, onEdit, onDelete, onPin, onStar, onConvert, query }) {
  const [confirm,setConfirm]=useState(false)
  const tags=note.tags?note.tags.split(',').map(t=>t.trim()).filter(Boolean):[]
  const q=query.toLowerCase()
  const hi=text=>{ if(!q||!text) return text; const idx=text.toLowerCase().indexOf(q); if(idx===-1) return text; return <span>{text.slice(0,idx)}<mark>{text.slice(idx,idx+q.length)}</mark>{text.slice(idx+q.length)}</span> }
  const todoLines=(note.content||'').split('\n').filter(l=>/^-\s*\[\s*\]|^todo:/i.test(l.trim()))
  return (
    <>
      <div className="fade-in" style={{ ...card(), cursor:'pointer', marginBottom:8 }} onClick={()=>onEdit(note)}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
              {note.pinned&&<span style={{ fontSize:12 }}>📌</span>}
              {note.starred&&<span style={{ fontSize:12 }}>⭐</span>}
              <div style={{ fontWeight:700, fontSize:15, color:C.text, flex:1 }}>{hi(note.title||'Untitled')}</div>
            </div>
            {note.subject&&<div style={{ marginBottom:6 }}><span style={{ background:'rgba(29,78,216,0.2)', color:C.accentBr, border:'1px solid rgba(59,130,246,0.25)', borderRadius:7, padding:'2px 10px', fontSize:11, fontWeight:700 }}>📁 {hi(note.subject)}</span></div>}
            {tags.length>0&&<div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:7 }}>{tags.map((t,i)=><span key={i} style={{ background:C.surface2, color:C.textSec, border:`1px solid ${C.border}`, borderRadius:6, padding:'2px 8px', fontSize:11 }}>#{hi(t)}</span>)}</div>}
            <div style={{ color:C.textSec, fontSize:13, lineHeight:1.5, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{hi(note.content||'No content')}</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
              <div style={{ fontSize:11, color:C.textMut }}>{new Date(note.updatedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
              {todoLines.length>0&&<button onClick={e=>{e.stopPropagation();onConvert(note,todoLines)}} style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:7, padding:'3px 9px', fontSize:11, cursor:'pointer', color:C.accentBr, minHeight:'auto', width:'auto' }}>→ {todoLines.length} task{todoLines.length>1?'s':''}</button>}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:2, flexShrink:0 }}>
            <button onClick={e=>{e.stopPropagation();onPin(note.id)}} style={{ background:'none', border:'none', cursor:'pointer', fontSize:15, padding:4, opacity:note.pinned?1:0.3, minHeight:'auto', minWidth:'auto', width:28 }}>📌</button>
            <button onClick={e=>{e.stopPropagation();onStar(note.id)}} style={{ background:'none', border:'none', cursor:'pointer', fontSize:15, padding:4, opacity:note.starred?1:0.3, minHeight:'auto', minWidth:'auto', width:28 }}>⭐</button>
            <button onClick={e=>{e.stopPropagation();setConfirm(true)}} style={{ background:'none', border:'none', cursor:'pointer', fontSize:15, padding:4, color:C.textMut, minHeight:'auto', minWidth:'auto', width:28 }}>🗑️</button>
          </div>
        </div>
      </div>
      {confirm&&<ConfirmModal message={`Delete "${note.title||'Untitled'}"?`} onConfirm={()=>{onDelete(note.id);setConfirm(false)}} onCancel={()=>setConfirm(false)}/>}
    </>
  )
}

// ─── NOTES SCREEN ─────────────────────────────────────────
function NotesScreen({ notes, addNote, updateNote, deleteNote, addTask }) {
  const [view,setView]=useState('list'),[editId,setEditId]=useState(null)
  const [search,setSearch]=useState(''),[subjectF,setSubjectF]=useState('All'),[sort,setSort]=useState('newest')
  const [form,setForm]=useState({ title:'', subject:'', tags:'', content:'', pinned:false, starred:false, updatedAt:'' })
  const subjects=[...new Set(notes.map(n=>n.subject).filter(Boolean))].sort()
  const q=search.toLowerCase().trim()
  const filtered=notes.filter(n=>{ if(subjectF!=='All'&&n.subject!==subjectF) return false; if(!q) return true; return [n.title,n.content,n.subject,n.tags].some(f=>f?.toLowerCase().includes(q)) })
    .sort((a,b)=>{ if(a.pinned!==b.pinned) return a.pinned?-1:1; if(sort==='newest') return new Date(b.updatedAt)-new Date(a.updatedAt); if(sort==='oldest') return new Date(a.updatedAt)-new Date(b.updatedAt); if(sort==='title') return (a.title||'').localeCompare(b.title||''); if(sort==='subject') return (a.subject||'').localeCompare(b.subject||''); return 0 })
  const groupNotes=list=>{ const g={},now=new Date(),yest=new Date(now),week=new Date(now),month=new Date(now); yest.setDate(now.getDate()-1);week.setDate(now.getDate()-7);month.setDate(now.getDate()-30); list.forEach(n=>{ const d=new Date(n.updatedAt),ds=ld(d); let key; if(ds===ld(now)) key='Today'; else if(ds===ld(yest)) key='Yesterday'; else if(d>=week) key='Last 7 Days'; else if(d>=month) key='Last 30 Days'; else key=d.toLocaleDateString('en-US',{month:'long',year:'numeric'}); (g[key]=g[key]||[]).push(n) }); return g }
  const ORDER=['Today','Yesterday','Last 7 Days','Last 30 Days']
  const grouped=groupNotes(filtered)
  const sortedGroups=Object.keys(grouped).sort((a,b)=>{ const ai=ORDER.indexOf(a),bi=ORDER.indexOf(b); if(ai!==-1&&bi!==-1) return ai-bi; if(ai!==-1) return -1; if(bi!==-1) return 1; return new Date(b+' 1')-new Date(a+' 1') })
  const openNew=()=>{ setForm({title:'',subject:'',tags:'',content:'',pinned:false,starred:false,updatedAt:''});setEditId(null);setView('edit') }
  const openEdit=n=>{ setForm({title:n.title||'',subject:n.subject||'',tags:n.tags||'',content:n.content||'',pinned:!!n.pinned,starred:!!n.starred,updatedAt:n.updatedAt});setEditId(n.id);setView('edit') }
  const save=()=>{ if(form.title.trim()||form.content.trim()){ editId?updateNote(editId,form):addNote(form) } setView('list') }
  const pin=id=>updateNote(id,{pinned:!notes.find(n=>n.id===id)?.pinned})
  const star=id=>updateNote(id,{starred:!notes.find(n=>n.id===id)?.starred})
  const convert=(note,lines)=>{ lines.forEach(l=>{ const t=l.replace(/^-\s*\[\s*\]/,'').replace(/^todo:/i,'').trim(); if(t) addTask({title:t,category:'Personal',priority:'Medium',dueDate:'',recurring:'None',notes:`From note: ${note.title||'Untitled'}`,estimatedTime:'',subtasks:[]}) }) }
  if(view==='edit') return <NoteEditor form={form} setForm={setForm} subjects={subjects} onSave={save} onClose={()=>setView('list')}/>
  return (
    <div style={{ background:C.bg, minHeight:'100%' }}>
      <div style={{ padding:`max(52px,calc(16px + env(safe-area-inset-top))) 16px 10px`, background:C.card, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:C.text }}>Notes</h1>
          <button onClick={openNew} style={{ ...btn(C.accent), padding:'8px 16px', fontSize:13, borderRadius:10, minHeight:36 }}>+ New</button>
        </div>
        <div style={{ position:'relative', marginBottom:10 }}>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14, pointerEvents:'none', color:C.textSec }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search any name, word, subject…" style={{ ...inp(), paddingLeft:38, paddingRight:search?36:13 }}/>
          {search&&<button onClick={()=>setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:C.textMut, cursor:'pointer', fontSize:18, minHeight:'auto', padding:'0 2px', width:'auto' }}>×</button>}
        </div>
        <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:6, marginBottom:6 }}>
          {['All',...subjects].map(s=><button key={s} onClick={()=>setSubjectF(s)} style={{ ...pill(subjectF===s), minHeight:36 }}>{s==='All'?'All':'📁 '+s}</button>)}
        </div>
        <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2 }}>
          {[['newest','Newest'],['oldest','Oldest'],['title','A–Z'],['subject','Subject']].map(([v,l])=><button key={v} onClick={()=>setSort(v)} style={{ ...pill(sort===v,C.purple), minHeight:36 }}>{l}</button>)}
        </div>
      </div>
      <div style={{ padding:16 }}>
        {notes.length>0&&(
          <div style={{ display:'flex', gap:10, marginBottom:16 }}>
            {[[notes.length,'Notes',C.accentBr],[subjects.length,'Subjects',C.purple],[notes.filter(n=>n.starred).length,'Starred',C.yellow]].map(([n,lb,col])=>(
              <div key={lb} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:11, padding:'10px 0', flex:1, textAlign:'center' }}>
                <div style={{ fontSize:18, fontWeight:700, color:col }}>{n}</div>
                <div style={{ fontSize:11, color:C.textMut }}>{lb}</div>
              </div>
            ))}
          </div>
        )}
        {filtered.length===0
          ?<div style={{ textAlign:'center', color:C.textMut, padding:48 }}><div style={{ fontSize:44, marginBottom:12 }}>{q?'🔎':'◈'}</div><div style={{ fontSize:15, color:C.textSec }}>{q?`No notes match "${search}"`:'No notes yet. Tap + New!'}</div></div>
          :(sort==='newest'||sort==='oldest'
            ?sortedGroups.map(g=>(
              <div key={g} style={{ marginBottom:22 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <div style={{ flex:1, height:1, background:C.border }}/><span style={{ fontSize:11, fontWeight:700, color:C.textMut, textTransform:'uppercase', letterSpacing:0.8, whiteSpace:'nowrap' }}>{g}</span><div style={{ flex:1, height:1, background:C.border }}/>
                </div>
                {grouped[g].map(n=><NoteCard key={n.id} note={n} onEdit={openEdit} onDelete={deleteNote} onPin={pin} onStar={star} onConvert={convert} query={search}/>)}
              </div>
            ))
            :filtered.map(n=><NoteCard key={n.id} note={n} onEdit={openEdit} onDelete={deleteNote} onPin={pin} onStar={star} onConvert={convert} query={search}/>)
          )
        }
      </div>
    </div>
  )
}

// ─── PLANNER SCREEN ───────────────────────────────────────
function PlannerScreen({ tasks, addTask }) {
  const [wk,setWk]=useState(0),[addDay,setAddDay]=useState(null)
  const getWeekDays=offset=>{ const now=new Date(),day=now.getDay(),diff=day===0?-6:1-day,mon=new Date(now); mon.setDate(now.getDate()+diff+offset*7);mon.setHours(0,0,0,0); return Array.from({length:7},(_,i)=>{ const d=new Date(mon);d.setDate(mon.getDate()+i);return d }) }
  const days=getWeekDays(wk)
  const wkLabel=`${days[0].toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${days[6].toLocaleDateString('en-US',{month:'short',day:'numeric'})}`
  return (
    <div style={{ background:C.bg, minHeight:'100%' }}>
      <div style={{ padding:`max(52px,calc(16px + env(safe-area-inset-top))) 16px 10px`, background:C.card, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:C.text }}>Planner</h1>
          <button onClick={()=>setWk(0)} style={{ ...btn(C.surface2), padding:'7px 14px', fontSize:13, border:`1px solid ${C.border}`, borderRadius:9, minHeight:36, color:C.text }}>This Week</button>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <button onClick={()=>setWk(w=>w-1)} style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:C.accentBr, padding:'4px 10px', minHeight:44 }}>‹</button>
          <span style={{ fontWeight:600, fontSize:13, color:C.textSec }}>{wkLabel}</span>
          <button onClick={()=>setWk(w=>w+1)} style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:C.accentBr, padding:'4px 10px', minHeight:44 }}>›</button>
        </div>
      </div>
      <div style={{ padding:14 }}>
        {days.map(d=>{ const dss=ld(d),isT=dss===todayStr(),dt=sortTasks(tasks.filter(t=>t.dueDate===dss&&!t.completed)),done=tasks.filter(t=>t.dueDate===dss&&t.completed).length; return (
          <div key={dss} style={{ display:'flex', gap:10, marginBottom:16, alignItems:'flex-start' }}>
            <div style={{ background:isT?C.accent:C.surface, color:isT?'#fff':C.textSec, border:`1px solid ${isT?C.accentBr:C.border}`, borderRadius:13, padding:'10px 8px', minWidth:50, textAlign:'center', flexShrink:0 }}>
              <div style={{ fontSize:11, fontWeight:700 }}>{d.toLocaleDateString('en-US',{weekday:'short'})}</div>
              <div style={{ fontSize:20, fontWeight:700, lineHeight:1.2 }}>{d.getDate()}</div>
              {done>0&&<div style={{ fontSize:10, color:isT?'rgba(255,255,255,0.7)':C.green, marginTop:2 }}>✓{done}</div>}
            </div>
            <div style={{ flex:1, paddingTop:2 }}>
              {dt.length===0?<div style={{ color:C.textMut, fontSize:13, paddingTop:6 }}>No tasks</div>
                :dt.map(t=>{ const cat=catFor(t.category); return (
                  <div key={t.id} style={{ background:cat.bg, borderLeft:`3px solid ${cat.color}`, borderRadius:9, padding:'8px 11px', marginBottom:6, display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:14, color:C.text }}>{t.title}</div>
                      <div style={{ fontSize:11, color:cat.color, fontWeight:700, marginTop:2 }}>{t.category}{t.priority?` · ${t.priority}`:''}{t.estimatedTime?` · ${t.estimatedTime}`:''}</div>
                    </div>
                    <span style={{ fontSize:10, color:PRIO_COLORS[t.priority||'Medium'], fontWeight:700 }}>{t.priority?.[0]}</span>
                  </div>
                )})}
              <button onClick={()=>setAddDay(dss)} style={{ background:'none', border:`1px dashed ${C.border}`, borderRadius:9, padding:'6px 12px', cursor:'pointer', color:C.textMut, fontSize:12, width:'100%', marginTop:4, textAlign:'left', minHeight:'auto' }}>+ Add task</button>
            </div>
          </div>
        )})}
      </div>
      {addDay&&<TaskModal onSave={t=>addTask({...t,dueDate:addDay})} onClose={()=>setAddDay(null)}/>}
    </div>
  )
}

// ─── BOTTOM NAV ───────────────────────────────────────────
function BottomNav({ tab, setTab, tasks, visible }) {
  const ov=tasks.filter(t=>isOverdue(t)).length
  return (
    <div style={{
      position:'fixed', bottom:0, left:'50%',
      // Slide off-screen when hidden; combine with the X-centering translate
      transform:`translateX(-50%) translateY(${visible?'0%':'110%'})`,
      transition:'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
      width:'100%', maxWidth:430, background:`${C.card}f0`,
      borderTop:`1px solid ${C.border}`, display:'flex', zIndex:50,
      backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
      paddingBottom:'env(safe-area-inset-bottom)',
    }}>
      {TABS.map(t=>(
        <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, background:'none', border:'none', padding:'10px 4px 12px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:3, position:'relative', minHeight:56 }}>
          <span style={{ fontSize:18, color:tab===t.id?C.accentBr:C.textMut }}>{t.icon}</span>
          <span style={{ fontSize:10, fontWeight:tab===t.id?700:500, color:tab===t.id?C.accentBr:C.textMut }}>{t.label}</span>
          {t.id==='tasks'&&ov>0&&<div style={{ position:'absolute', top:6, right:'20%', background:C.red, color:'#fff', borderRadius:'50%', width:16, height:16, fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{ov}</div>}
          {tab===t.id&&<div style={{ position:'absolute', bottom:0, left:'25%', right:'25%', height:2, background:C.accentBr, borderRadius:'2px 2px 0 0' }}/>}
        </button>
      ))}
    </div>
  )
}

// ─── APP ──────────────────────────────────────────────────
export default function App() {
  const [tab,setTab]       = useState('home')
  const [tasks,setTasks]   = useState([])
  const [notes,setNotes]   = useState([])
  const [loaded,setLoaded] = useState(false)
  const [undoItem,setUndoItem]   = useState(null)
  const [showUndo,setShowUndo]   = useState(false)
  const [showBackup,setShowBackup] = useState(false)
  const undoTimerRef = useRef(null)

  useEffect(()=>{
    try { const t=localStorage.getItem('ppa_tasks_v2'); if(t) setTasks(JSON.parse(t)) } catch {}
    try { const n=localStorage.getItem('ppa_notes_v2'); if(n) setNotes(JSON.parse(n)) } catch {}
    setLoaded(true)
  },[])

  useEffect(()=>{ if(!loaded) return; try{ localStorage.setItem('ppa_tasks_v2',JSON.stringify(tasks)) }catch{} },[tasks,loaded])
  useEffect(()=>{ if(!loaded) return; try{ localStorage.setItem('ppa_notes_v2',JSON.stringify(notes)) }catch{} },[notes,loaded])

  const triggerUndo=(type,item)=>{ setUndoItem({type,item}); setShowUndo(true); clearTimeout(undoTimerRef.current); undoTimerRef.current=setTimeout(()=>setShowUndo(false),5000) }
  const handleUndo=()=>{ if(!undoItem) return; if(undoItem.type==='task') setTasks(p=>[undoItem.item,...p]); if(undoItem.type==='note') setNotes(p=>[undoItem.item,...p]); setShowUndo(false); setUndoItem(null); clearTimeout(undoTimerRef.current) }

  const addTask    = t  => setTasks(p=>[{...BLANK_TASK,...t,id:uid(),completed:false,createdAt:new Date().toISOString(),subtasks:t.subtasks||[]},...p])
  const updateTask = (id,u) => setTasks(p=>p.map(t=>t.id===id?{...t,...u}:t))
  const deleteTask = id  => { const item=tasks.find(t=>t.id===id); if(item) triggerUndo('task',item); setTasks(p=>p.filter(t=>t.id!==id)) }
  const addNote    = n  => setNotes(p=>[{...n,id:uid(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},...p])
  const updateNote = (id,u) => setNotes(p=>p.map(n=>n.id===id?{...n,...u,updatedAt:new Date().toISOString()}:n))
  const deleteNote = id  => { const item=notes.find(n=>n.id===id); if(item) triggerUndo('note',item); setNotes(p=>p.filter(n=>n.id!==id)) }
  const handleImport = data => { if(data.tasks) setTasks(data.tasks); if(data.notes) setNotes(data.notes) }

  if(!loaded) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'system-ui', flexDirection:'column', gap:14, background:C.bg }}>
      <div style={{ fontSize:40 }}>⬡</div>
      <div style={{ color:C.accentBr, fontWeight:700, fontSize:16, letterSpacing:0.5 }}>Loading your command center…</div>
    </div>
  )

  const props={tasks,notes,addTask,updateTask,deleteTask,addNote,updateNote,deleteNote,setTab}
  const screens={home:HomeScreen,tasks:TasksScreen,calendar:CalendarScreen,notes:NotesScreen,planner:PlannerScreen}
  const Screen=screens[tab]

  return (
    <div style={{ fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',Arial,sans-serif", maxWidth:430, margin:'0 auto', height:'100vh', display:'flex', flexDirection:'column', background:C.bg, overflow:'hidden', position:'relative' }}>
      <div className="scroll-container" style={{ flex:1, overflowY:'auto', paddingBottom:`calc(76px + env(safe-area-inset-bottom))` }}>
        <Screen {...props} onBackup={()=>setShowBackup(true)}/>
      </div>
      <BottomNav tab={tab} setTab={setTab} tasks={tasks}/>
      {showUndo&&<UndoToast item={undoItem} onUndo={handleUndo} onDismiss={()=>setShowUndo(false)}/>}
      {showBackup&&<ExportImportModal tasks={tasks} notes={notes} onImport={handleImport} onClose={()=>setShowBackup(false)}/>}
    </div>
  )
}
