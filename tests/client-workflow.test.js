import { describe,it,expect } from "vitest";
import { canTransition, nextStatuses } from "../src/lib/workflow.js";
describe("client workflow",()=>{
  it("exposes only valid next states",()=>expect(nextStatuses("Submitted")).toEqual(["Assigned","Rejected"]));
  it("does not allow arbitrary state changes",()=>expect(canTransition("Draft","Resolved")).toBe(false));
});
