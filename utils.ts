/**
 * Matches a request path against an array of path templates (using OpenAPI syntax for path parameters), returning the matched template and parameters, if any.
 */
export function matchPath(
  path: string,
  pathTemplates: string[]
): [null | string, Record<string, string>] {
  const normalize = (p: string) => (p.endsWith("/") ? p.slice(0, -1) : p);

  for (let template of pathTemplates) {
    const regex = new RegExp(
      `^${normalize(template)
        .split("/")
        .map((segment) =>
          segment.startsWith("{") && segment.endsWith("}")
            ? `(?<${segment.slice(1, -1)}>[^/]+)`
            : segment
        )
        .join("/")}$`
    );
    const match = regex.exec(normalize(path));
    if (match) {
      return [template, match.groups ?? {}];
    }
  }

  return [null, {}];
}
