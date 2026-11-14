import mongoose from "mongoose";
const historySchema = new mongoose.Schema({
  type: { type: String, required: true },
  message: { type: String, required: true, maxlength: 300 },
  actor: { type: String, default: "System" },
  at: { type: Date, default: Date.now }
}, { _id: true });
const reportSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true, index: true },
  category: { type: String, required: true, enum: ["Water point","Equipment damage","Service interruption","Safety concern","Maintenance","Other"] },
  description: { type: String, required: true, minlength: 12, maxlength: 1500 },
  location: { type: String, required: true, minlength: 3, maxlength: 180 },
  priority: { type: String, required: true, enum: ["Low","Medium","High","Critical"] },
  status: { type: String, required: true, enum: ["Draft","Submitted","Assigned","In Progress","Resolved","Rejected"], default: "Submitted" },
  reporter: { type: String, default: "Field worker" },
  reportedAt: { type: Date, required: true },
  history: { type: [historySchema], default: [] }
}, { timestamps: true });
export default mongoose.models.Report || mongoose.model("Report", reportSchema);
