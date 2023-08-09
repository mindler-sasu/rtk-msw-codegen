import { NestedObject } from "./types";
import * as fs from "fs";
import * as ts from "typescript";

export const assignNestedValue = (
  obj: NestedObject,
  keys: string[],
  value: string
) => {
  const lastKey = keys.pop();
  if (!lastKey) return;

  let nested: NestedObject = obj;
  for (const key of keys) {
    if (!nested[key]) {
      nested[key] = {};
    }
    nested = nested[key] as NestedObject;
  }
  nested[lastKey] = value;
};

export const formatCode = (generatedCode: string, mockPath: string) => {
  const currentDirectoryFiles = fs
    .readdirSync(process.cwd())
    .filter(
      (fileName) =>
        fileName.length >= 3 &&
        fileName.substr(fileName.length - 3, 3) === ".ts"
    );

  const servicesHost: ts.LanguageServiceHost = {
    getScriptFileNames: () => currentDirectoryFiles,
    getScriptVersion: (fileName) =>
      //@ts-ignore
      currentDirectoryFiles[fileName] &&
      //@ts-ignore
      currentDirectoryFiles[fileName].version.toString(),
    getScriptSnapshot: (fileName) => {
      if (!fs.existsSync(fileName)) {
        return undefined;
      }

      return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName).toString());
    },
    getCurrentDirectory: () => process.cwd(),
    getCompilationSettings: () => ({ module: ts.ModuleKind.CommonJS }),
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };

  // Create the language service files
  const languageService = ts.createLanguageService(
    servicesHost,
    ts.createDocumentRegistry()
  );
  const textChanges = languageService.getFormattingEditsForDocument(mockPath, {
    convertTabsToSpaces: true,
    insertSpaceAfterCommaDelimiter: true,
    insertSpaceAfterKeywordsInControlFlowStatements: true,
    insertSpaceBeforeAndAfterBinaryOperators: true,
    newLineCharacter: "\n",
    indentStyle: ts.IndentStyle.Smart,
    indentSize: 4,
    tabSize: 4,
  });

  const betterment = textChanges
    .sort((a, b) => a.span.start - b.span.start)
    // Apply the edits
    .reduce<[text: string, offset: number]>(
      ([text, offset], { span: { start, length }, newText }) => {
        // start: index (of original text) of text to replace
        // length: length of text to replace
        // newText: new text
        // Because newText.length does not necessarily === length, the second
        // element of the accumulator keeps track of the of offset
        const newStart = start + offset;
        return [
          text.slice(0, newStart) + newText + text.slice(newStart + length),
          offset + newText.length - length,
        ];
      },
      [generatedCode, 0]
    )[0];
  return betterment;
};
