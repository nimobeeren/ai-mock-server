export function matchPath(path: string, pathTemplates: string[]) {
  const normalize = (p: string) => (p.endsWith("/") ? p.slice(0, -1) : p);

  for (let template of pathTemplates) {
    template = normalize(template);
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
    console.log(regex);
    const match = regex.exec(normalize(path));
    if (match) {
      console.log(match);
      return match.groups ?? {};
    }
  }

  return null;
}
