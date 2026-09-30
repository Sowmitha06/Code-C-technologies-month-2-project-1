import {Router} from 'express'; import bcrypt from 'bcryptjs'; import jwt from 'jsonwebtoken'; import PDFDocument from 'pdfkit'; import mongoose from 'mongoose';
import {User,Quiz,Result} from './models.js';
const r=Router(), S=()=>process.env.JWT_SECRET||'dev', wrap=f=>(q,s,n)=>f(q,s,n).catch(e=>s.status(400).json({error:e.message}));
const auth=(q,s,n)=>{try{q.user=jwt.verify((q.headers.authorization||'').slice(7),S());n()}catch{s.status(401).json({error:'Login required'})}};
const admin=(q,s,n)=>q.user.role==='admin'?n():s.status(403).json({error:'Admin only'});
const sign=u=>({token:jwt.sign({id:u._id,role:u.role,name:u.name},S(),{expiresIn:'7d'}),user:{name:u.name,role:u.role}});
const started=new Map(); // "userId:quizId" -> start timestamp (server-side timer; use Redis/DB in production)
const hide=q=>({...q.toObject(),questions:q.questions.map(x=>({_id:x._id,text:x.text,options:x.options}))});

r.post('/auth/register',wrap(async(q,s)=>{const {name,email,password}=q.body; if(!name||!email||!password||password.length<6) throw Error('Name, email and 6+ char password required');
 s.json(sign(await User.create({name,email:email.toLowerCase(),password:await bcrypt.hash(password,10)})))}));
r.post('/auth/login',wrap(async(q,s)=>{const u=await User.findOne({email:(q.body.email||'').toLowerCase()});
 if(!u||!await bcrypt.compare(q.body.password||'',u.password)) throw Error('Invalid email or password'); s.json(sign(u))}));

r.get('/quizzes',auth,wrap(async(q,s)=>s.json((await Quiz.find().sort('-createdAt')).map(z=>({_id:z._id,title:z.title,description:z.description,duration:z.duration,count:z.questions.length})))));
r.post('/quizzes',auth,admin,wrap(async(q,s)=>{const b=q.body; if(!b.title||!b.questions?.length) throw Error('Title and at least one question required');
 for(const x of b.questions) if(!x.text||x.options.length<2||x.answer<0||x.answer>=x.options.length) throw Error('Every question needs text, 2+ options and a correct answer');
 s.json(await Quiz.create(b))}));
r.delete('/quizzes/:id',auth,admin,wrap(async(q,s)=>{await Quiz.findByIdAndDelete(q.params.id);s.json({ok:1})}));
// Starting an exam records the start time; questions are sent WITHOUT answers
r.post('/quizzes/:id/start',auth,wrap(async(q,s)=>{const z=await Quiz.findById(q.params.id); started.set(q.user.id+':'+z._id,Date.now()); s.json(hide(z))}));
r.post('/quizzes/:id/submit',auth,wrap(async(q,s)=>{const z=await Quiz.findById(q.params.id),k=q.user.id+':'+z._id,t0=started.get(k);
 if(!t0) throw Error('Start the exam first'); const secs=Math.round((Date.now()-t0)/1000); started.delete(k);
 if(secs>z.duration*60+15) throw Error('Time is up — submission rejected');
 const ans=q.body.answers||[]; const score=z.questions.reduce((a,x,i)=>a+(ans[i]===x.answer?1:0),0), total=z.questions.length, percent=Math.round(score/total*100);
 s.json(await Result.create({user:q.user.id,quiz:z._id,score,total,percent,passed:percent>=z.passMark,timeTaken:secs,answers:ans}))}));
r.get('/results/mine',auth,wrap(async(q,s)=>s.json(await Result.find({user:q.user.id}).populate('quiz','title').sort('-createdAt'))));

r.get('/leaderboard/:quizId',auth,wrap(async(q,s)=>s.json(await Result.find({quiz:q.params.quizId}).sort({percent:-1,timeTaken:1}).limit(10).populate('user','name'))));
r.get('/leaderboard',auth,wrap(async(q,s)=>s.json(await Result.aggregate([{$group:{_id:'$user',avg:{$avg:'$percent'},attempts:{$sum:1}}},{$sort:{avg:-1}},{$limit:10},
 {$lookup:{from:'users',localField:'_id',foreignField:'_id',as:'u'}},{$project:{name:{$arrayElemAt:['$u.name',0]},avg:{$round:['$avg',1]},attempts:1}}]))));

r.get('/analytics',auth,admin,wrap(async(q,s)=>{const quizzes=await Quiz.find(),out=[];
 for(const z of quizzes){const rs=await Result.find({quiz:z._id}),n=rs.length;
  out.push({title:z.title,attempts:n,avg:n?Math.round(rs.reduce((a,x)=>a+x.percent,0)/n):0,passRate:n?Math.round(rs.filter(x=>x.passed).length/n*100):0,
   hardest:z.questions.map((x,i)=>({text:x.text,correct:n?Math.round(rs.filter(y=>y.answers[i]===x.answer).length/n*100):0})).sort((a,b)=>a.correct-b.correct).slice(0,3)})}
 s.json({students:await User.countDocuments({role:'student'}),quizzes:out})}));

r.get('/results/:id/certificate',auth,wrap(async(q,s)=>{const x=await Result.findById(q.params.id).populate('quiz','title').populate('user','name');
 if(!x||String(x.user._id)!==q.user.id) throw Error('Not found'); if(!x.passed) throw Error('Certificate is only issued for passed quizzes');
 const d=new PDFDocument({size:'A4',layout:'landscape',margin:50}); s.setHeader('Content-Type','application/pdf'); s.setHeader('Content-Disposition','attachment; filename=certificate.pdf'); d.pipe(s);
 d.rect(30,30,782,535).lineWidth(3).stroke('#1f6feb');
 d.fontSize(38).fillColor('#10233a').text('Certificate of Achievement',0,120,{align:'center'});
 d.fontSize(16).fillColor('#444').text('This certifies that',0,200,{align:'center'});
 d.fontSize(32).fillColor('#1f6feb').text(x.user.name,0,235,{align:'center'});
 d.fontSize(16).fillColor('#444').text(`has passed "${x.quiz.title}" with a score of ${x.percent}%`,0,300,{align:'center'});
 d.fontSize(12).text(`Issued ${x.createdAt.toDateString()}  •  Certificate ID ${x._id}`,0,470,{align:'center'}); d.end()}));
export default r;
