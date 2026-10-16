import { describe, expect, it } from "vitest";
import { suggestedModel } from "@/lib/vision/gemini";

describe("suggestedModel", () => {
  it("reads the replacement from Google's retirement 404", () => {
    const msg = "This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash for new projects.";
    expect(suggestedModel(msg)).toBe("gemini-3.8-flash");
  });
  it("handles a sentence-ending model name", () => {
    expect(suggestedModel("Please use gemini-3.8-flash.")).toBe("gemini-3.8-flash");
  });
  it("returns null when no replacement is named", () => {
    expect(suggestedModel("API key not valid")).toBeNull();
  });
});
