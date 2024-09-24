import { describe, expect, test } from "vitest";
import { matchPath } from "./utils";

describe("matchPath", () => {
  test("should match exact path", () => {
    const result = matchPath("/test", ["/test"]);
    expect(result).toEqual(["/test", {}]);
  });

  test("should match path with trailing slash", () => {
    const result = matchPath("/test/", ["/test"]);
    expect(result).toEqual(["/test", {}]); // returns a path that matches the template exactly
  });

  test("should match path template with parameter", () => {
    const result = matchPath("/test/123", ["/test/{id}"]);
    expect(result).toEqual(["/test/{id}", { id: "123" }]);
  });

  test("should match path template with multiple parameters", () => {
    const result = matchPath("/test/123/action", ["/test/{id}/{action}"]);
    expect(result).toEqual(["/test/{id}/{action}", { id: "123", action: "action" }]);
  });

  test("should return null for non-matching path", () => {
    const result = matchPath("/non-matching", ["/test"]);
    expect(result).toEqual([null, {}]);
  });

  test("should match path with multiple templates", () => {
    const result = matchPath("/test/123", ["/test", "/test/{id}"]);
    expect(result).toEqual(["/test/{id}", { id: "123" }]);
  });

  test("should match path with nested templates", () => {
    const result = matchPath("/test/123/nested/456", ["/test/{id}/nested/{nestedId}"]);
    expect(result).toEqual(["/test/{id}/nested/{nestedId}", { id: "123", nestedId: "456" }]);
  });
});
