import {useState,useEffect,useRef} from 'react';
import api,{API_URL,token} from './api';

function Auth({onDone}){
  const [reg,setReg]=useState(false),[f,setF]=useState({name:'',email:'',password:''}),[err,setErr]=useState('');
  const go=async()=>{try{const r=await api(reg?'/auth/register':'/auth/login','POST',f);localStorage.token=r.token;localStorage.user=JSON.stringify(r.user);onDone(r.user)}catch(e){setErr(e.message)}};
  const set=k=>e=>setF({...f,[k]:e.target.value});
  return <div className="card" style={{maxWidth:380,margin:'40px auto'}}><h2>{reg?'Create account':'Log in'}</h2>
    {reg&&<input placeholder="Name" value={f.name} onChange={set('name')}/>}<input placeholder="Email" value={f.email} onChange={set('email')}/>
    <input type="password" placeholder="Password" value={f.password} onChange={set('password')}/>{err&&<p className="err">{err}</p>}
    <button className="p" onClick={go}>{reg?'Sign up':'Log in'}</button> <button className="g" onClick={()=>setReg(!reg)}>{reg?'I have an account':'New here? Sign up'}</button></div>;
}

function Quizzes({onStart}){
  const [l,setL]=useState([]); useEffect(()=>{api('/quizzes').then(setL)},[]);
  return <><h2>Available quizzes</h2>{!l.length&&<p>No quizzes yet. An admin can create one.</p>}
    <div className="grid">{l.map(z=><div className="card" key={z._id}><h3>{z.title}</h3><p>{z.description}</p><span className="tag">{z.count} questions · {z.duration} min</span><p><button className="p" onClick={()=>onStart(z._id)}>Start exam</button></p></div>)}</div></>;
}

function Exam({id,onDone}){
  const [z,setZ]=useState(null),[ans,setAns]=useState([]),[left,setLeft]=useState(0),[err,setErr]=useState(''),sent=useRef(false),ansRef=useRef([]);
  useEffect(()=>{api(`/quizzes/${id}/start`,'POST').then(q=>{setZ(q);setLeft(q.duration*60)}).catch(e=>setErr(e.message))},[id]);
  const submit=async()=>{if(sent.current)return;sent.current=true;try{onDone(await api(`/quizzes/${id}/submit`,'POST',{answers:ansRef.current}))}catch(e){setErr(e.message)}};
  useEffect(()=>{if(!z)return;const t=setInterval(()=>setLeft(v=>v-1),1000);return()=>clearInterval(t)},[z]);
  useEffect(()=>{if(z&&left<=0)submit()},[left,z]);
  const pick=(i,j)=>{const a=[...ansRef.current];a[i]=j;ansRef.current=a;setAns(a)};
  if(err) return <p className="err">{err}</p>; if(!z) return <p>Loading exam…</p>;
  const m=String(Math.floor(left/60)).padStart(2,'0'),s=String(Math.max(left%60,0)).padStart(2,'0');
  return <><div className="row" style={{position:'sticky',top:0,background:'var(--bg)',padding:'8px 0'}}><h2>{z.title}</h2><b style={{fontSize:28,color:left<30?'#b00020':'inherit'}}>{m}:{s}</b></div>
    {z.questions.map((q,i)=><div className="card" key={q._id} style={{marginBottom:12}}><b>{i+1}. {q.text}</b>
      {q.options.map((o,j)=><label key={j} className={'opt'+(ans[i]===j?' sel':'')}><input type="radio" name={'q'+i} checked={ans[i]===j} onChange={()=>pick(i,j)}/>{o}</label>)}</div>)}
    <button className="p" onClick={submit}>Submit exam</button></>;
}

async function downloadCert(id){const r=await fetch(`${API_URL}/api/results/${id}/certificate`,{headers:{Authorization:'Bearer '+token()}});
  if(!r.ok) return alert((await r.json()).error); const a=document.createElement('a');a.href=URL.createObjectURL(await r.blob());a.download='certificate.pdf';a.click()}

function ResultCard({r,onHome}){return <div className="card" style={{maxWidth:460,margin:'30px auto',textAlign:'center'}}><h2>{r.passed?'You passed!':'Not passed this time'}</h2>
  <h1>{r.percent}%</h1><p>{r.score} of {r.total} correct · {r.timeTaken}s</p>
  {r.passed&&<button className="p" onClick={()=>downloadCert(r._id)}>Download certificate</button>} <button className="g" onClick={onHome}>Back to quizzes</button></div>}

function History(){
  const [l,setL]=useState([]); useEffect(()=>{api('/results/mine').then(setL)},[]);
  return <><h2>My results</h2>{!l.length&&<p>You haven't taken any exams yet.</p>}<div className="card" style={{overflowX:'auto'}}><table><tbody>
    {l.map(r=><tr key={r._id}><td>{r.quiz?.title}</td><td>{r.percent}%</td><td>{new Date(r.createdAt).toLocaleDateString()}</td><td>{r.passed?<button className="g" onClick={()=>downloadCert(r._id)}>Certificate</button>:'—'}</td></tr>)}</tbody></table></div></>;
}

function Leaderboard(){
  const [qs,setQs]=useState([]),[sel,setSel]=useState('all'),[rows,setRows]=useState([]);
  useEffect(()=>{api('/quizzes').then(setQs)},[]);
  useEffect(()=>{api(sel==='all'?'/leaderboard':'/leaderboard/'+sel).then(setRows)},[sel]);
  return <><h2>Leaderboard</h2><select value={sel} onChange={e=>setSel(e.target.value)}><option value="all">Overall (average score)</option>{qs.map(z=><option key={z._id} value={z._id}>{z.title}</option>)}</select>
    <div className="card"><table><tbody>{rows.map((x,i)=><tr key={i}><td>#{i+1}</td><td>{x.name||x.user?.name}</td><td>{x.avg??x.percent}%</td><td>{x.attempts?x.attempts+' attempts':x.timeTaken+'s'}</td></tr>)}{!rows.length&&<tr><td>No results yet.</td></tr>}</tbody></table></div></>;
}

function Create(){
  const blank=()=>({text:'',options:['','','',''],answer:0}),[f,setF]=useState({title:'',description:'',duration:10,passMark:50}),[qs,setQs]=useState([blank()]),[msg,setMsg]=useState('');
  const upd=(i,fn)=>setQs(qs.map((q,k)=>k===i?fn(q):q));
  const save=async()=>{try{await api('/quizzes','POST',{...f,duration:+f.duration,passMark:+f.passMark,questions:qs.map(q=>({...q,options:q.options.filter(o=>o.trim())}))});setMsg('Quiz saved');setQs([blank()]);setF({title:'',description:'',duration:10,passMark:50})}catch(e){setMsg(e.message)}};
  return <><h2>Create quiz</h2><div className="card"><input placeholder="Title" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/><input placeholder="Description" value={f.description} onChange={e=>setF({...f,description:e.target.value})}/>
    <div className="row"><label>Duration (min)<input type="number" value={f.duration} onChange={e=>setF({...f,duration:e.target.value})}/></label><label>Pass mark (%)<input type="number" value={f.passMark} onChange={e=>setF({...f,passMark:e.target.value})}/></label></div></div>
    {qs.map((q,i)=><div className="card" key={i} style={{marginTop:12}}><input placeholder={`Question ${i+1}`} value={q.text} onChange={e=>upd(i,x=>({...x,text:e.target.value}))}/>
      {q.options.map((o,j)=><div className="row" key={j}><input placeholder={`Option ${j+1}`} value={o} onChange={e=>upd(i,x=>({...x,options:x.options.map((y,k)=>k===j?e.target.value:y)}))}/>
        <label style={{whiteSpace:'nowrap'}}><input type="radio" style={{width:'auto'}} checked={q.answer===j} onChange={()=>upd(i,x=>({...x,answer:j}))}/> correct</label></div>)}</div>)}
    <p><button className="g" onClick={()=>setQs([...qs,blank()])}>+ Add question</button> <button className="p" onClick={save}>Save quiz</button> {msg}</p></>;
}

function Analytics(){
  const [d,setD]=useState(null); useEffect(()=>{api('/analytics').then(setD)},[]); if(!d) return <p>Loading…</p>;
  return <><h2>Analytics</h2><p>{d.students} registered students</p>{d.quizzes.map(z=><div className="card" key={z.title} style={{marginBottom:12}}><h3>{z.title}</h3>
    <p>{z.attempts} attempts · average {z.avg}% · pass rate {z.passRate}%</p><div className="bar"><i style={{width:z.passRate+'%'}}/></div>
    {!!z.attempts&&<><p>Hardest questions (share answering correctly):</p>{z.hardest.map(h=><div key={h.text}><small>{h.text} — {h.correct}%</small><div className="bar"><i style={{width:h.correct+'%'}}/></div></div>)}</>}</div>)}</>;
}

export default function App(){
  const [user,setUser]=useState(()=>JSON.parse(localStorage.user||'null')),[page,setPage]=useState('quizzes'),[exam,setExam]=useState(null),[res,setRes]=useState(null);
  if(!user) return <main><Auth onDone={setUser}/></main>;
  const Tab=({id,children})=><button className={page===id?'on':''} onClick={()=>{setPage(id);setExam(null);setRes(null)}}>{children}</button>;
  return <><nav><b>Quizzard</b><Tab id="quizzes">Quizzes</Tab><Tab id="history">My results</Tab><Tab id="board">Leaderboard</Tab>
    {user.role==='admin'&&<><Tab id="create">Create quiz</Tab><Tab id="stats">Analytics</Tab></>}<button onClick={()=>{localStorage.clear();setUser(null)}}>Log out ({user.name})</button></nav>
    <main>{res?<ResultCard r={res} onHome={()=>{setRes(null);setExam(null);setPage('quizzes')}}/>:exam?<Exam id={exam} onDone={setRes}/>:
      <>{page==='quizzes'&&<Quizzes onStart={setExam}/>}{page==='history'&&<History/>}{page==='board'&&<Leaderboard/>}{page==='create'&&<Create/>}{page==='stats'&&<Analytics/>}</>}</main></>;
}
