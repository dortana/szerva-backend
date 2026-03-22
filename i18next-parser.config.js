module.exports = {
  input: ["src/**/*.{ts,tsx,js,jsx}", "!src/generated/**/*"],
  output: "src/messages/$LOCALE.json",
  locales: ["en-US"],
  defaultValue: (lng, ns, key) => key,
  namespaceSeparator: false,
  keySeparator: false,
  keepRemoved: false,
  createOldCatalogs: false,
  lexers: {
    js: [
      {
        lexer: "JavascriptLexer",
        functions: ["t", "__"],
      },
    ],
    ts: [
      {
        lexer: "JavascriptLexer",
        functions: ["t", "__"],
      },
    ],
    tsx: [
      {
        lexer: "JsxLexer",
        functions: ["t", "__"],
      },
    ],
  },
};
