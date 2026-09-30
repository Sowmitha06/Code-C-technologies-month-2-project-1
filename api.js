const BASE=(import.meta.env.VITE_API||'http://localhost:5000')+'/api';
export const API_URL=import.meta.env.VITE_API||'http://localhost:5000';
export const token=()=>localStorage.getItem('token');
export default async function api(path,method='GET',body){
  const r=await fetch(BASE+path,{method,headers:{'Content-Type':'application/json',...(token()?{Authorization:'Bearer '+token()}:{})},body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>({})); if(!r.ok) throw new Error(j.error||'Request failed'); return j;
}
