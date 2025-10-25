import type { NodeMap } from "@/algorithms/lca";

export const sampleNodes: NodeMap = {
  A: { id: "A", parentId: null },
  B: { id: "B", parentId: "A" },
  C: { id: "C", parentId: "A" },
  D: { id: "D", parentId: "B" },
  E: { id: "E", parentId: "B" },
  F: { id: "F", parentId: "B" },
  G: { id: "G", parentId: "C" },
  H: { id: "H", parentId: "C" },
  I: { id: "I", parentId: "C" },
};

export const sampleMessages: Record<string, { role: "user" | "assistant"; content: string }[]> = {
  A: [{ role: "user", content: "시작" }],
  B: [{ role: "assistant", content: "진로 관련" }],
  C: [{ role: "assistant", content: "대인 관계" }],
  D: [{ role: "assistant", content: "세부 주제 D" }],
  E: [{ role: "assistant", content: "세부 주제 E" }],
  F: [{ role: "assistant", content: "세부 주제 F" }],
  G: [{ role: "assistant", content: "세부 주제 G" }],
  H: [{ role: "assistant", content: "세부 주제 H" }],
  I: [{ role: "assistant", content: "세부 주제 I" }],
};








