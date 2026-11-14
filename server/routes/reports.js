import { Router } from "express";
import { z } from "zod";
import Report from "../models/Report.js";
import { canTransition } from "../workflow.js";
const router = Router();
const createSchema = z.object({
  clientId: z.string().uuid(),
  category: z.enum(["Water point","Equipment damage","Service interruption","Safety concern","Maintenance","Other"]),
  description: z.string().trim().min(12).max(1500),
  location: z.string().trim().min(3).max(180),
  priority: z.enum(["Low","Medium","High","Critical"]),
  status: z.enum(["Draft","Submitted"]).default("Submitted"),
  reporter: z.string().max(80).optional(),
  reportedAt: z.coerce.date()
});
router.get("/", async (_req,res,next) => {
  try { const reports=await Report.find().sort({reportedAt:-1}).limit(500).lean(); res.json({reports}); } catch(e){next(e);}
});
router.post("/", async (req,res,next) => {
  try {
    const parsed=createSchema.safeParse(req.body);
    if(!parsed.success) return res.status(400).json({message:"Invalid report data.",errors:parsed.error.flatten().fieldErrors});
    const existing=await Report.findOne({clientId:parsed.data.clientId});
    if(existing) return res.status(200).json({report:existing,duplicate:true});
    const data={...parsed.data,history:[{type:"created",message:"Report received by server",actor:"System"}]};
    try { const report=await Report.create(data); return res.status(201).json({report,duplicate:false}); }
    catch(error) {
      if(error.code===11000){const report=await Report.findOne({clientId:parsed.data.clientId});return res.status(200).json({report,duplicate:true});}
      throw error;
    }
  } catch(e){next(e);}
});
router.patch("/:id/status", async (req,res,next) => {
  try {
    const schema=z.object({status:z.enum(["Draft","Submitted","Assigned","In Progress","Resolved","Rejected"]),actor:z.string().max(80).optional()});
    const parsed=schema.safeParse(req.body);
    if(!parsed.success)return res.status(400).json({message:"Invalid status update."});
    const report=await Report.findById(req.params.id);
    if(!report)return res.status(404).json({message:"Report not found."});
    if(!canTransition(report.status,parsed.data.status))return res.status(409).json({message:`Invalid status transition: ${report.status} → ${parsed.data.status}`});
    const previous=report.status;report.status=parsed.data.status;
    report.history.push({type:"status",message:`Status changed from ${previous} to ${report.status}`,actor:parsed.data.actor||"Coordinator"});
    await report.save();res.json({report});
  }catch(e){next(e);}
});
export default router;
