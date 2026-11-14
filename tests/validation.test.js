import { describe,it,expect } from "vitest";
import { validateReport } from "../src/lib/validation.js";
const valid={category:"Water point",description:"Pump is damaged and needs inspection.",location:"Kebele 04",priority:"High"};
describe("report validation",()=>{
  it("accepts a valid report",()=>expect(validateReport(valid)).toEqual({}));
  it("requires a meaningful description",()=>expect(validateReport({...valid,description:"short"})).toHaveProperty("description"));
  it("requires a location",()=>expect(validateReport({...valid,location:""})).toHaveProperty("location"));
  it("rejects unsupported categories",()=>expect(validateReport({...valid,category:"Unknown"})).toHaveProperty("category"));
  it("rejects unsupported priorities",()=>expect(validateReport({...valid,priority:"Urgent"})).toHaveProperty("priority"));
});
