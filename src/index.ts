import * as ts from "typescript";
import { parseConfigFromRtk as parseEndpointsFromRtk } from "./parseRtkQuery";
import { buildMsw } from "./buildMsw";
import { EndpointConfigForMsw } from "./types";
import * as fs from "fs";
import { formatCode } from "./helpers";
const fileNames = process.argv.slice(2);

const endpoints = parseEndpointsFromRtk(fileNames, {
  target: ts.ScriptTarget.ES5,
  module: ts.ModuleKind.CommonJS,
});

let generatedCode = buildMsw(endpoints as unknown as EndpointConfigForMsw);

console.log(generatedCode);
const mockPath = `__mocks__/${fileNames[0]}`;
const resultFile = ts.createSourceFile(
  mockPath,
  generatedCode,
  ts.ScriptTarget.Latest,
  /*setParentNodes*/ false,
  ts.ScriptKind.TS
);

fs.mkdirSync(resultFile.fileName.split("/").slice(0, -1).join("/"), {
  recursive: true,
});
fs.writeFileSync(resultFile.fileName, resultFile.getFullText());

fs.writeFileSync(resultFile.fileName, formatCode(generatedCode, mockPath));
