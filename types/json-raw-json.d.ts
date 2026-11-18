// JSON.rawJSON (Node 21+) is not in TypeScript's lib yet.
interface JSON {
  rawJSON(text: string): unknown;
}
