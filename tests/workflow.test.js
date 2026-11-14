import { describe,it,expect } from "vitest";
import { canTransition } from "../server/workflow.js";
describe("report workflow",()=>{
  it("allows the normal forward workflow",()=>{
    expect(canTransition("Draft","Submitted")).toBe(true);
    expect(canTransition("Submitted","Assigned")).toBe(true);
    expect(canTransition("Assigned","In Progress")).toBe(true);
    expect(canTransition("In Progress","Resolved")).toBe(true);
  });
  it("allows rejection from submitted or active work",()=>{
    expect(canTransition("Submitted","Rejected")).toBe(true);
    expect(canTransition("In Progress","Rejected")).toBe(true);
  });
  it("rejects invalid transitions",()=>{
    expect(canTransition("Draft","Resolved")).toBe(false);
    expect(canTransition("Resolved","Submitted")).toBe(false);
    expect(canTransition("Rejected","Assigned")).toBe(false);
  });
  it("allows reopening a resolved issue into progress",()=>{
    expect(canTransition("Resolved","In Progress")).toBe(true);
  });
});
