import { describe, expect, it } from "vitest";
import { normalizePlate, formatPlate, plateSchema } from "./plates";
describe("Dutch plate handling", () => {
  it.each(["AB-123-C", "AB123C", "ab123c", "AB 123 C"])(
    "normalizes %s",
    (input) => {
      expect(plateSchema.parse(input)).toBe("AB123C");
      expect(formatPlate(input)).toBe("AB-123-C");
    },
  );
  it.each([
    ["GZS88X", "GZS-88-X"],
    ["J643BB", "J-643-BB"],
    ["45AB67", "45-AB-67"],
    ["12ABC3", "12-ABC-3"],
    ["1AB234", "1-AB-234"],
  ])("formats sidecode %s", (input, output) =>
    expect(formatPlate(input)).toBe(output),
  );
  it.each(["", "ABC", "123456", "ABCDEF", "AB!23C", "AB'23C", "AB/23C"])(
    "rejects malformed %s",
    (input) => expect(plateSchema.safeParse(input).success).toBe(false),
  );
  it("does not remove unexpected punctuation", () =>
    expect(normalizePlate("ab/123/c")).toBe("AB/123/C"));
});
