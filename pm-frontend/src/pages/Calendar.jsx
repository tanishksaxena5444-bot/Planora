import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

function keyForDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function isDone(t){ return t?.status === "done" || t?.status === "completed" || t?.completed === true; }

export default function Calendar({ projects = [] }) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(null);
  const [tasksByProject, setTasksByProject] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    let cancelled=false;
    async function load(){
      if(!projects.length){setTasksByProject({});return;}
      setLoading(true);
      const rs=await Promise.allSettled(projects.map(async p=>[p._id,(await api.getTasks(p._id)).data || []]));
      if(cancelled)return;
      const next={}; rs.forEach((r,i)=>next[projects[i]._id]=r.status==="fulfilled"?r.value[1]:[]);
      setTasksByProject(next); setLoading(false);
    }
    load(); return()=>{cancelled=true};
  },[projects]);

  const year=cursor.getFullYear(), month=cursor.getMonth();
  const monthName=cursor.toLocaleString(undefined,{month:"long"});
  const first=new Date(year,month,1).getDay();
  const days=new Date(year,month+1,0).getDate();
  const cells=Array.from({length:first+days},(_,i)=>i<first?null:i-first+1);

  const dueMap=useMemo(()=>{
    const map={};
    projects.forEach(p=>(tasksByProject[p._id]||[]).forEach(t=>{
      if(!t.dueDate)return; const k=keyForDate(t.dueDate); if(!k)return;
      (map[k] ||= []).push({...t,__project:p});
    }));
    return map;
  },[projects,tasksByProject]);

  const selectedKey=selectedDate?keyForDate(selectedDate):"";
  const selectedTasks=selectedKey?(dueMap[selectedKey]||[]):[];
  const selectedProjects=[...new Map(selectedTasks.map(t=>[t.__project._id,t.__project])).values()];
  const isTodayDate=(day)=>day===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
  const changeMonth=(delta)=>setCursor(new Date(year,month+delta,1));

  return <div className="p-10 max-w-7xl mobile-page-padding">
    <p className="section-kicker mb-1">Schedule</p>
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8"><div><h1 className="font-display text-4xl">Calendar</h1><p className="text-paper-dim mt-1">Click any date to inspect deadlines and jump directly into the related project.</p></div><Link to="/" className="btn-secondary">← Dashboard</Link></div>
    <div className="grid xl:grid-cols-[1.55fr_.85fr] gap-4">
      <section className="glass-panel rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-5"><div><p className="section-kicker">Monthly plan</p><h2 className="font-display text-2xl">{monthName} {year}</h2></div><div className="flex items-center gap-2"><button className="calendar-nav" onClick={()=>changeMonth(-1)} aria-label="Previous month">←</button><button className="calendar-nav calendar-today" onClick={()=>setCursor(new Date(today.getFullYear(),today.getMonth(),1))}>Today</button><button className="calendar-nav" onClick={()=>changeMonth(1)} aria-label="Next month">→</button></div></div>
        <div className="grid grid-cols-7 gap-1.5 mb-2">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><span key={d} className="font-mono text-[9px] uppercase tracking-widest text-paper-dim text-center py-2">{d}</span>)}</div>
        <div className="grid grid-cols-7 gap-1.5">{cells.map((day,i)=>{
          if(!day)return <div key={i} className="min-h-24 rounded-xl border border-transparent"/>;
          const date=new Date(year,month,day); const key=keyForDate(date); const tasks=dueMap[key]||[]; const active=isTodayDate(day);
          const overdue=date < new Date(today.getFullYear(),today.getMonth(),today.getDate()) && tasks.some(t=>!isDone(t));
          return <button key={i} type="button" onClick={()=>setSelectedDate(date)} className={`calendar-day min-h-24 rounded-xl border p-2 text-left ${active?"calendar-day-today":""} ${overdue?"calendar-day-overdue":""}`}>
            <div className="flex justify-between items-center"><span className={`font-mono text-xs ${active?"text-progress":"text-paper-dim"}`}>{day}</span>{tasks.length>0&&<span className="calendar-count">{tasks.length}</span>}</div>
            <div className="space-y-1 mt-2">{tasks.slice(0,3).map(t=><div key={t._id} className={`calendar-task-chip ${isDone(t)?"is-done":""}`} title={t.title}><span className="calendar-task-dot"/><span className="truncate">{t.title}</span></div>)}{tasks.length>3&&<p className="font-mono text-[9px] text-paper-dim">+{tasks.length-3} more</p>}</div>
          </button>;
        })}</div>
        {loading&&<p className="text-xs text-paper-dim mt-3">Loading task deadlines…</p>}
      </section>

      <section className="glass-panel rounded-2xl p-5"><p className="section-kicker">Deadline radar</p><h2 className="font-display text-2xl mb-5">This month</h2><div className="space-y-2">{Object.entries(dueMap).filter(([k])=>k.startsWith(`${year}-${String(month+1).padStart(2,"0")}`)).sort(([a],[b])=>a.localeCompare(b)).slice(0,10).map(([k,tasks])=><button key={k} className="quick-action block w-full" onClick={()=>setSelectedDate(new Date(`${k}T12:00:00`))}><div className="flex justify-between gap-3"><span className="text-sm">{new Date(`${k}T12:00:00`).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span><span className="font-mono text-[10px] text-progress">{tasks.length} task{tasks.length>1?"s":""}</span></div><p className="text-xs text-paper-dim mt-1 truncate">{tasks.map(t=>t.title).join(" · ")}</p></button>)}{!Object.keys(dueMap).some(k=>k.startsWith(`${year}-${String(month+1).padStart(2,"0")}`))&&<p className="text-sm text-paper-dim">No task deadlines in this month yet.</p>}</div></section>
    </div>

    {selectedDate && <div className="calendar-modal-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)setSelectedDate(null)}}><div className="calendar-modal" role="dialog" aria-modal="true"><div className="flex items-start justify-between gap-4 mb-5"><div><p className="section-kicker">Selected date</p><h2 className="font-display text-3xl">{selectedDate.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</h2></div><button className="calendar-modal-close" onClick={()=>setSelectedDate(null)}>×</button></div>
      <div className="mb-5"><p className="font-mono text-[10px] uppercase tracking-widest text-paper-dim mb-2">Tasks due</p>{selectedTasks.length?<div className="space-y-2">{selectedTasks.map(t=><Link key={t._id} to={`/projects/${t.__project._id}`} className="calendar-modal-task"><div className="min-w-0"><p className={`text-sm truncate ${isDone(t)?"line-through text-paper-dim":""}`}>{t.title}</p><p className="text-xs text-paper-dim">{t.__project.name} · {t.priority || "medium"} priority · {isDone(t)?"Done":(t.status||"todo").replaceAll("_"," ")}</p></div><span className="text-progress">→</span></Link>)}</div>:<div className="calendar-empty-date"><p className="font-display text-xl">Nothing due here</p><p className="text-sm text-paper-dim mt-1">Use this date as a planning point, or open a project and assign a task deadline.</p></div>}</div>
      <div className="border-t border-line pt-4"><p className="font-mono text-[10px] uppercase tracking-widest text-paper-dim mb-2">Quick actions</p><div className="flex flex-wrap gap-2">{selectedProjects.map(p=><Link key={p._id} to={`/projects/${p._id}`} className="btn-secondary">Open {p.name}</Link>)}{!selectedProjects.length&&projects.slice(0,3).map(p=><Link key={p._id} to={`/projects/${p._id}`} className="btn-secondary">Plan in {p.name}</Link>)}</div></div>
    </div></div>}
  </div>;
}