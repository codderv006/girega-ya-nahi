import { describe, expect, it } from "vitest";
import { isOverloaded, suggestedModel } from "@/lib/vision/gemini";
import { isBiscuitColour } from "@/lib/client/image";

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

describe("isBiscuitColour", () => {
  it("accepts baked-golden biscuit tones", () => {
    expect(isBiscuitColour(226, 176, 108)).toBe(true); // face of a glucose biscuit
    expect(isBiscuitColour(201, 143, 62)).toBe(true); // darker baked edge
  });
  it("rejects white ceramic, black, blue and green", () => {
    expect(isBiscuitColour(240, 238, 232)).toBe(false);
    expect(isBiscuitColour(20, 20, 20)).toBe(false);
    expect(isBiscuitColour(40, 90, 200)).toBe(false);
    expect(isBiscuitColour(60, 160, 70)).toBe(false);
  });
});

describe("isOverloaded", () => {
  it("spots capacity errors but not retirements or bad keys", () => {
    expect(isOverloaded("The model is overloaded. Please try again later.")).toBe(true);
    expect(isOverloaded("429 RESOURCE_EXHAUSTED")).toBe(true);
    expect(isOverloaded("models/gemini-2.5-flash is no longer available to new users")).toBe(false);
    expect(isOverloaded("API key not valid")).toBe(false);
  });
});
