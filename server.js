import 'dotenv/config'; import express from 'express'; import cors from 'cors'; import mongoose from 'mongoose'; import routes from './routes.js';
const app=express(); app.use(cors()); app.use(express.json()); app.use('/api',routes);
mongoose.connect(process.env.MONGO_URI||'mongodb://127.0.0.1:27017/quizzard').then(()=>app.listen(process.env.PORT||5000,()=>console.log('API on :'+(process.env.PORT||5000)))).catch(e=>console.error(e));
