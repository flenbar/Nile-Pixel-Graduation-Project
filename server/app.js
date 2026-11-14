import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import reportRoutes from "./routes/reports.js";
const app=express();
app.use(cors({origin:process.env.CLIENT_ORIGIN?.split(",")||true}));
app.use(express.json({limit:"100kb"}));
let connectionPromise;
async function connectDB(){
  if(mongoose.connection.readyState===1)return;
  if(!process.env.MONGODB_URI)throw new Error("MONGODB_URI is not configured.");
  if(!connectionPromise)connectionPromise=mongoose.connect(process.env.MONGODB_URI,{serverSelectionTimeoutMS:8000}).catch(e=>{connectionPromise=null;throw e;});
  await connectionPromise;
}
app.get("/api/health",async(_req,res)=>{
  try{await connectDB();res.json({ok:true,database:"connected"});}
  catch(e){res.status(503).json({ok:false,database:"disconnected",message:e.message});}
});
app.use("/api/reports",async(_req,_res,next)=>{try{await connectDB();next();}catch(e){next(e);}});
app.use("/api/reports",reportRoutes);
app.use((err,_req,res,_next)=>{
  const status=err.name==="ValidationError"?400:500;
  res.status(status).json({message:status===500?"Server error. Check database configuration and logs.":err.message});
});
export default app;
