import * as fs from "fs";
import * as ts from "typescript";
import { assignNestedValue } from "./helpers";

const fetchArgConfigIdentifiers = [
  "url",
  "headers",
  "body",
  "params",
  "responseHandler",
];


export function parseConfigFromRtk(
  fileNames: string[],
  options: ts.CompilerOptions
) {
  console.log(fileNames);
  // Build a program using the set of root file names in fileNames
  let program = ts.createProgram(fileNames, options);

  // Get the checker, we will use it to find more about classes
  let checker = program.getTypeChecker();
  let output = "";
  // Visit every sourceFile in the program
  let endpoints: Record<string, unknown> = {};

  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      const code = sourceFile.getFullText();
      // Walk the tree
      ts.forEachChild(sourceFile, visit);
    }
  }


  return endpoints;

  function getIdentifier(node: ts.Node) {
    return node.getChildren().find((n) => ts.isIdentifier(n)) as ts.Identifier;
  }
  function findCreateApiCallExpression(node: ts.Node): ts.Node | undefined {
    if (
      ts.isVariableStatement(node) ||
      ts.isVariableDeclaration(node) ||
      ts.isVariableDeclarationList(node)
    ) {
      return ts.forEachChild(node, findCreateApiCallExpression);
    }
    if (ts.isCallExpression(node)) {
      const id = getIdentifier(node);
      if (id.escapedText === "createApi") {
        return node;
      }
    }
  }
  function getAssignmentValue(node: ts.Node): any {
    if (ts.isStringLiteralLike(node) || ts.isTemplateExpression(node)) {
      return node.getText();
    }

    if (ts.isArrowFunction(node)) {
      return node.parameters.map((p) => ({
        key: p.name.getText(),
        type: p.type?.getText() ?? "unknown",
      }));
    }
    return ts.forEachChild(node, getAssignmentValue);
  }

  function buildEndpoint(n: any, path?: string[]) {
    if (ts.isPropertyAssignment(n)) {
      const id = getIdentifier(n)?.escapedText as string;
      const value = getAssignmentValue(n);
      if (path) {
        assignNestedValue(endpoints as any, [...path, id], value);
      } else {
        endpoints[id] = value;
      }
    }

    return n.getChildren().map((node: ts.Node) => buildEndpoint(node, path));
  }

  function getEndpointConfig(node: ts.Node, path: string[]) {
    const id = getIdentifier(node)?.escapedText;
    if (id === "query") {
      buildEndpoint(node, path);
      return;
    }

    ts.forEachChild(node, (n) => {
      if (ts.isPropertyAssignment(n)) {
        let hookId = getIdentifier(n)?.escapedText as string;

        return getEndpointConfig(
          n,
          hookId !== "query" ? [...path, hookId] : path
        );
      }
      return getEndpointConfig(n, path);
    });
  }

  function createApiWalk(node: ts.Node) {
    if (ts.isPropertyAssignment(node)) {
      const id = getIdentifier(node);
      if (id.escapedText === "endpoints") {
        getEndpointConfig(node, ["endpoints"]);
      }
      if (id.escapedText === "baseUrl") {
        const value = getAssignmentValue(node);
        endpoints["baseUrl"] = value;
      }
    }
    ts.forEachChild(node, createApiWalk);
  }
  function visit(node: ts.Node) {
    if (ts.isModuleDeclaration(node)) {
      // This is a namespace, visit its children
      ts.forEachChild(node, visit);
      return;
    }
    const createApiCallNode = findCreateApiCallExpression(node);
    if (createApiCallNode) {
      ts.forEachChild(createApiCallNode, createApiWalk);
    }
  }

  /** True if this is visible outside this file, false otherwise */
  function isNodeExported(node: ts.Node): boolean {
    return (
      (ts.getCombinedModifierFlags(node as ts.Declaration) &
        ts.ModifierFlags.Export) !==
        0 ||
      (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
    );
  }
}
