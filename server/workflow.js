const transitions = {
  Draft:["Submitted"],
  Submitted:["Assigned","Rejected"],
  Assigned:["In Progress","Rejected"],
  "In Progress":["Resolved","Rejected"],
  Resolved:["In Progress"],
  Rejected:[]
};
export function canTransition(from,to){return Boolean(transitions[from]?.includes(to));}
