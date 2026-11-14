import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, AlertTriangle, ArrowDownToLine, ArrowUpRight, Bell, Check, CheckCircle2, ChevronDown, CircleDot, ClipboardList, Cloud, CloudOff, Compass, Filter, HardHat, LayoutDashboard, MapPin, Menu, Plus, RefreshCw, Search, ShieldCheck, Signal, Wifi, WifiOff, X } from "lucide-react";
import { CATEGORIES, PRIORITIES, validateReport } from "./lib/validation";
import { getReports, saveReport } from "./lib/db";
import { syncPending } from "./lib/sync";
import { api } from "./lib/api";
import { STATUSES, transitionReport } from "./lib/workflow";

const demo = [
  { clientId:"demo-001", category:"Water point", description:"Community borehole pump is producing unusually low pressure and intermittent flow.", location:"Kebele 04 · Bishoftu", priority:"Critical", status:"In Progress", reportedAt:new Date(Date.now()-3600000*3).toISOString(), syncState:"Synchronized", reporter:"Abebe T.", history:[] },
  { clientId:"demo-002", category:"Equipment damage", description:"Protective casing around the distribution control panel is damaged.", location:"North service station", priority:"High", status:"Submitted", reportedAt:new Date(Date.now()-3600000*8).toISOString(), syncState:"Synchronized", reporter:"Mimi K.", history:[] },
  { clientId:"demo-003", category:"Safety concern", description:"A section of the footpath beside the maintenance site has an exposed cable.", location:"Main road · Zone B", priority:"High", status:"Assigned", reportedAt:new Date(Date.now()-86400000).toISOString(), syncState:"Synchronized", reporter:"Dawit M.", history:[] },
  { clientId:"demo-004", category:"Service interruption", description:"Street lighting has been unavailable for two consecutive evenings.", location:"Market district", priority:"Medium", status:"Resolved", reportedAt:new Date(Date.now()-86400000*2).toISOString(), syncState:"Synchronized", reporter:"Sara H.", history:[] }
];
const timeAgo = (date) => {
  const mins = Math.max(0, Math.floor((Date.now()-new Date(date))/60000));
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
  return `${Math.floor(mins/1440)}d ago`;
};
const statusClass = s => s.toLowerCase().replaceAll(" ","-");
function App() {
  const [reports,setReports] = useState(demo);
  const [view,setView] = useState("Overview");
  const [query,setQuery] = useState("");
  const [filter,setFilter] = useState("All");
  const [online,setOnline] = useState(navigator.onLine);
  const [syncing,setSyncing] = useState(false);
  const [modal,setModal] = useState(false);
  const [role,setRole] = useState("Field worker");
  const [toast,setToast] = useState("");
  const [form,setForm] = useState({category:"Water point",description:"",location:"",priority:"Medium"});
  const [errors,setErrors] = useState({});
  const [serverReady,setServerReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const local = await getReports();
      if (local.length) setReports(prev => [...local, ...prev.filter(p => p.clientId?.startsWith("demo-"))]);
    } catch { /* IndexedDB may be unavailable in private browsing; keep session data usable. */ }
  }, []);
  useEffect(() => {
    refresh();
    const onOnline = () => { setOnline(true); runSync(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online",onOnline); window.addEventListener("offline",onOffline);
    const timer = setInterval(() => { if(navigator.onLine) runSync(); },30000);
    api.list().then(data => { setServerReady(true); if(data.reports?.length) setReports(prev => [...data.reports,...prev.filter(p=>p.clientId?.startsWith("demo-"))]); }).catch(()=>setServerReady(false));
    return () => { window.removeEventListener("online",onOnline); window.removeEventListener("offline",onOffline); clearInterval(timer); };
  },[refresh]);
  const runSync = async () => {
    setSyncing(true);
    try { const result = await syncPending(refresh); if(result.synced) notify(`${result.synced} report${result.synced===1?"":"s"} synchronized.`); }
    finally { setSyncing(false); }
  };
  const notify = msg => { setToast(msg); setTimeout(()=>setToast(""),3500); };
  const allReports = useMemo(()=>reports,[reports]);
  const pending = allReports.filter(r=>r.syncState==="Pending"||r.syncState==="Failed").length;
  const active = allReports.filter(r=>!["Resolved","Rejected"].includes(r.status)).length;
  const critical = allReports.filter(r=>r.priority==="Critical" && !["Resolved","Rejected"].includes(r.status)).length;
  const filtered = allReports.filter(r => {
    const matches = `${r.category} ${r.description} ${r.location} ${r.reporter||""}`.toLowerCase().includes(query.toLowerCase());
    return matches && (filter==="All" || r.status===filter) && (view!=="My reports" || r.reporter==="You");
  });
  const submitReport = async e => {
    e.preventDefault();
    const nextErrors=validateReport(form); setErrors(nextErrors);
    if(Object.keys(nextErrors).length) return;
    const now=new Date().toISOString();
    const report={...form,clientId:crypto.randomUUID(),reportedAt:now,updatedAt:now,status:"Submitted",syncState:"Pending",reporter:"You",retryCount:0,history:[{id:crypto.randomUUID(),type:"created",message:"Report created on this device",actor:"You",at:now}]};
    try { await saveReport(report); } catch { notify("Local storage is unavailable. Your report is kept for this session only."); }
    setReports(prev=>[report,...prev]); setModal(false); setForm({category:"Water point",description:"",location:"",priority:"Medium"}); setErrors({});
    notify("Report saved on this device. Sync will start when online.");
    if(navigator.onLine) setTimeout(()=>runSync(),200);
  };
  const changeStatus = async (report,next) => {
    try {
      const updated=transitionReport(report,next,role);
      const serverId=report._id;
      if(serverId && navigator.onLine) await api.updateStatus(serverId,next,role);
      setReports(prev=>prev.map(r=>r.clientId===report.clientId||r._id===report._id?updated:r));
      if(report.clientId) await saveReport(updated);
      notify(`Report moved to ${next}.`);
    } catch(error) { notify(error.message); }
  };
  const syncLabel = r => r.syncState || "Synchronized";
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><span>n</span></div><div><b>niletrack</b><small>FIELD OPERATIONS</small></div></div>
      <div className="workspace"><div className="workspace-icon"><Compass size={17}/></div><div><b>Operations team</b><small>East Africa region</small></div><ChevronDown size={14}/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>
        {[["Overview",LayoutDashboard],["All reports",ClipboardList],["My reports",HardHat],["Activity log",Activity]].map(([name,Icon])=><button key={name} className={`nav-item ${view===name?"selected":""}`} onClick={()=>setView(name)}><Icon size={18}/><span>{name}</span>{name==="All reports"&&<em>{allReports.length}</em>}</button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className={`connection-card ${online?"connected":"disconnected"}`}><div className="connection-icon">{online?<Wifi size={17}/>:<WifiOff size={17}/>}</div><div><b>{online?"You're online":"Working offline"}</b><small>{online?"Sync is available":"Reports saved on device"}</small></div><span className="pulse-dot"/></div>
        <div className="profile"><div className="avatar">FT</div><div><b>Field team</b><small>Local workspace</small></div><button title="Switch role" onClick={()=>setRole(role==="Field worker"?"Coordinator":"Field worker")}><ChevronDown size={16}/></button></div>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">Operations <span>/</span> <b>{view}</b></div><div className="top-actions"><div className={`network-pill ${online?"online":"offline"}`}>{online?<Wifi size={14}/>:<WifiOff size={14}/>} {online?"Online":"Offline"}</div><button className="icon-button" aria-label="Notifications"><Bell size={18}/><i/></button><div className="top-avatar">FT</div></div></header>
      <div className="page-content">
        <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> FIELD INTELLIGENCE / 01</div><h1>{view==="Overview"?"Good work starts on the ground.":view}</h1><p>{view==="Overview"?"A clear view of every issue, every location, every next step.":"Track, review and coordinate field issues across your operations."}</p></div><div className="welcome-actions"><div className="role-switch"><span>Viewing as</span><button onClick={()=>setRole(role==="Field worker"?"Coordinator":"Field worker")}>{role}<ChevronDown size={14}/></button></div><button className="primary-button" onClick={()=>setModal(true)}><Plus size={17}/> New report</button></div></section>
        <section className="metric-grid">
          <Metric icon={ClipboardList} label="Total reports" value={allReports.length} detail="Across your workspace" tone="blue"/>
          <Metric icon={CircleDot} label="Active issues" value={active} detail="Need attention" tone="mint"/>
          <Metric icon={AlertTriangle} label="Critical priority" value={critical} detail="Requires urgent action" tone="orange"/>
          <Metric icon={Cloud} label="Awaiting sync" value={pending} detail={online?"Ready to synchronize":"Saved locally"} tone="purple"/>
        </section>
        <section className="content-grid">
          <div className="panel reports-panel">
            <div className="panel-heading"><div><div className="section-kicker">FIELD REGISTER</div><h2>{view==="Overview"?"Recent reports":view}</h2></div><button className="text-button" onClick={()=>setView("All reports")}>View all <ArrowUpRight size={15}/></button></div>
            <div className="toolbar"><div className="search-box"><Search size={16}/><input placeholder="Search reports, locations..." value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="filter-wrap"><Filter size={15}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div></div>
            <div className="report-list">{filtered.slice(0,6).map(r=><ReportRow key={r.clientId||r._id} report={r} role={role} onStatus={changeStatus}/>)}
              {!filtered.length&&<div className="empty-state"><ClipboardList size={28}/><b>No reports found</b><span>Try changing your search or filters.</span></div>}
            </div>
            <div className="panel-footer"><span>Showing {Math.min(filtered.length,6)} of {filtered.length} reports</span><span className="live-indicator"><i/> LIVE REGISTER</span></div>
          </div>
          <div className="right-column">
            <div className="panel sync-panel"><div className="panel-heading"><div><div className="section-kicker">DEVICE STATUS</div><h2>Sync center</h2></div><div className={`sync-symbol ${online?"":"muted"}`}>{online?<RefreshCw size={18}/>:<CloudOff size={18}/>}</div></div><div className="sync-status"><div className={`big-status ${online?"good":"warn"}`}>{online?"Connected":"Offline mode"}</div><p>{online?"Your device can reach the server. Pending reports will upload automatically.":"You can keep working. New reports are stored securely on this device."}</p></div><div className="sync-stats"><div><b>{pending}</b><span>Pending</span></div><div><b>{allReports.filter(r=>syncLabel(r)==="Synchronized").length}</b><span>Synced</span></div><div><b>{allReports.filter(r=>syncLabel(r)==="Failed").length}</b><span>Failed</span></div></div><button className="sync-button" disabled={!online||syncing} onClick={runSync}>{syncing?<RefreshCw className="spin" size={16}/>:<Cloud size={16}/>} {syncing?"Synchronizing...":"Sync now"}</button><div className="sync-foot"><ShieldCheck size={14}/> Duplicate-safe uploads · Automatic retry</div></div>
            <div className="panel workflow-panel"><div className="section-kicker">RESOLUTION PIPELINE</div><h2>Issue lifecycle</h2><div className="pipeline">{STATUSES.slice(0,5).map((s,i)=><div className="pipeline-step" key={s}><div className={`pipeline-node ${i===4?"last":""}`}>{i===4?<Check size={13}/>:i+1}</div><span>{s}</span><b>{allReports.filter(r=>r.status===s).length}</b></div>)}</div><div className="workflow-note"><AlertCircle size={15}/> Status changes are recorded in each report's activity history.</div></div>
            <div className="tip-card"><div className="tip-icon"><Signal size={18}/></div><div><b>Built for the field</b><p>Keep reporting through weak connectivity. NileTrack will take care of the sync when you're back online.</p></div></div>
          </div>
        </section>
        <footer className="page-footer"><span>© 2025 NileTrack · Built for teams in the field</span><span><span className="footer-dot"/> {serverReady?"API connected":"Demo / local mode"} · {role}</span></footer>
      </div>
    </main>
    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><form className="report-modal" onSubmit={submitReport}><div className="modal-head"><div><div className="section-kicker">FIELD REPORT / NEW ENTRY</div><h2>Log an issue</h2><p>Capture what happened. It will be saved even if you're offline.</p></div><button type="button" className="icon-button" onClick={()=>setModal(false)}><X size={19}/></button></div><label>Issue category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>{errors.category&&<small className="error">{errors.category}</small>}</label><label>What happened?<textarea rows="4" maxLength="1500" placeholder="Describe the issue, its impact, and anything a coordinator should know..." value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><small className={errors.description?"error":"hint"}>{errors.description||`${form.description.length}/1500 characters · minimum 12`}</small></label><label>Location<input placeholder="e.g. Kebele 04, near the health centre" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/>{errors.location&&<small className="error">{errors.location}</small>}</label><label>Priority<div className="priority-options">{PRIORITIES.map(p=><button type="button" key={p} className={`priority-option ${form.priority===p?"active":""} ${p.toLowerCase()}`} onClick={()=>setForm({...form,priority:p})}><i/>{p}</button>)}</div>{errors.priority&&<small className="error">{errors.priority}</small>}</label><div className="modal-info"><CloudOff size={16}/> Offline-ready · Timestamp captured automatically</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setModal(false)}>Cancel</button><button className="primary-button" type="submit"><ArrowDownToLine size={16}/> Save report</button></div></form></div>}
    {toast&&<div className="toast"><CheckCircle2 size={17}/>{toast}</div>}
  </div>;
}
function Metric({icon:Icon,label,value,detail,tone}) { return <div className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={19}/></div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-detail">{detail}</div></div>; }
function ReportRow({report,role,onStatus}) {
  const [expanded,setExpanded]=useState(false);
  const options=role==="Coordinator"?STATUSES.filter(s=>s!==report.status):[];
  return <div className="report-row-wrap"><div className="report-row"><div className={`category-icon ${report.category==="Water point"?"water":report.category==="Safety concern"?"safety":report.category==="Equipment damage"?"equipment":"service"}`}>{report.category==="Water point"?"≈":report.category==="Safety concern"?"!":report.category==="Equipment damage"?"⌁":"◈"}</div><div className="report-main"><div className="report-title-line"><b>{report.category}</b><span className={`priority-tag ${report.priority.toLowerCase()}`}>{report.priority}</span></div><p>{report.description}</p><div className="report-meta"><span><MapPin size={12}/>{report.location}</span><span>·</span><span>{timeAgo(report.reportedAt)}</span></div></div><div className="report-side"><span className={`status-tag ${statusClass(report.status)}`}>{report.status}</span><span className={`sync-tag ${String(report.syncState||"Synchronized").toLowerCase()}`}><i/>{report.syncState||"Synchronized"}</span><button className="row-more" onClick={()=>setExpanded(!expanded)} aria-label="Report details"><ChevronDown size={17}/></button></div></div>{expanded&&<div className="report-expanded"><div><b>Reported by</b><span>{report.reporter||"Field worker"}</span></div><div><b>Reported at</b><span>{new Date(report.reportedAt).toLocaleString()}</span></div>{role==="Coordinator"&&options.length>0&&<div className="status-control"><b>Update status</b><select value="" onChange={e=>onStatus(report,e.target.value)}><option value="" disabled>Choose next status</option>{options.map(s=><option key={s}>{s}</option>)}</select></div>}<div className="history-line"><Activity size={14}/>{report.history?.length?report.history.map(h=>h.message).join(" · "):"No additional activity recorded yet."}</div></div>}</div>;
}
export default App;
