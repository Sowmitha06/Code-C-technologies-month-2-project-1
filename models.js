import mongoose from 'mongoose'; const {Schema,model}=mongoose;
export const User=model('User',new Schema({name:String,email:{type:String,unique:true},password:String,role:{type:String,default:'student'}}));
export const Quiz=model('Quiz',new Schema({title:String,description:String,duration:{type:Number,default:10},passMark:{type:Number,default:50},
 questions:[{text:String,options:[String],answer:Number}]},{timestamps:true}));
export const Result=model('Result',new Schema({user:{type:Schema.Types.ObjectId,ref:'User'},quiz:{type:Schema.Types.ObjectId,ref:'Quiz'},
 score:Number,total:Number,percent:Number,passed:Boolean,timeTaken:Number,answers:[Number]},{timestamps:true}));
