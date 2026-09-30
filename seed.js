import 'dotenv/config'; import mongoose from 'mongoose'; import bcrypt from 'bcryptjs'; import {User,Quiz} from './models.js';
await mongoose.connect(process.env.MONGO_URI||'mongodb://127.0.0.1:27017/quizzard');
await User.deleteMany({email:'admin@quiz.com'}); await User.create({name:'Admin',email:'admin@quiz.com',password:await bcrypt.hash('admin123',10),role:'admin'});
await Quiz.deleteMany({}); await Quiz.create({title:'JavaScript Basics',description:'Core language concepts',duration:5,passMark:60,questions:[
 {text:'Which keyword declares a block-scoped variable?',options:['var','let','define','dim'],answer:1},
 {text:'What does typeof null return?',options:['null','undefined','object','number'],answer:2},
 {text:'Which method adds an item to the end of an array?',options:['push','pop','shift','unshift'],answer:0}]});
console.log('Seeded. Admin: admin@quiz.com / admin123'); process.exit();
