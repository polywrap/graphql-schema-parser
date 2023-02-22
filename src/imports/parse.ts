import { SYNTAX_REFERENCE } from "./constants";
import { getDuplicates } from "./utils";

import { ExternalImportStatement, LocalImportStatement } from "@polywrap/abi-types";

export function parseExternalImportStrings(
  imports: RegExpMatchArray[]
): ExternalImportStatement[] {
  const externalImports: ExternalImportStatement[] = [];

  for (const importStatement of imports) {
    if (importStatement.length !== 4) {
      throw Error(
        `Invalid external import statement found:\n${importStatement[0]}\n` +
        `Please use the following syntax...\n${SYNTAX_REFERENCE}`
      );
    }

    const importedTypes = importStatement[1]
      .split(",")
      // Trim all whitespace and brackets
      .map((str) => str.replace(/(\s+|\{|\})/g, ""))
      // Remove empty strings
      .filter(Boolean);

    const importFromName = importStatement[3];

    // Make sure the developer does not import the same dependency more than once
    const duplicateimportedTypes = getDuplicates(importedTypes);
    if (duplicateimportedTypes.length > 0) {
      throw Error(
        `Duplicate type found: ${duplicateimportedTypes} \nIn import: ${importFromName}`
      );
    }

    // Make sure the developer does not try to import a dependencies dependency
    const index = importedTypes.findIndex((str) => str.indexOf("_") > -1);
    if (index > -1) {
      throw Error(
        `Importing a dependency's imported type is forbidden. Only import types that do not have an '_' in the typename.`
      );
    }

    const namespace = importStatement[2];
    const uri = importStatement[3];

    externalImports.push({
      kind: "external",
      importedTypes,
      namespace,
      uriOrPath: uri,
    });
  }

  // Make sure namespaces are unique
  const namespaces = externalImports.map((extImport) => extImport.namespace);
  const duplicateNamespaces = getDuplicates(namespaces);
  if (duplicateNamespaces.length > 0) {
    throw Error(`Duplicate namespaces found: ${duplicateNamespaces}`);
  }

  // Make sure all uris have the same namespace
  const uriToNamespace: Record<string, string> = {};
  for (const ext of externalImports) {
    if (uriToNamespace[ext.uriOrPath]) {
      if (uriToNamespace[ext.uriOrPath] !== ext.namespace) {
        throw Error(
          `Imports from a single URI must be imported into the same namespace.\nURI: ${ext.uriOrPath
          }\nNamespace 1: ${ext.namespace}\nNamespace 2: ${uriToNamespace[ext.uriOrPath]
          }`
        );
      }
    } else {
      uriToNamespace[ext.uriOrPath] = ext.namespace;
    }
  }

  return externalImports;
}

export function parseLocalImportStrings(
  imports: RegExpMatchArray[]
): LocalImportStatement[] {
  const localImports: LocalImportStatement[] = [];

  for (const importStatement of imports) {
    if (importStatement.length !== 3) {
      throw Error(
        `Invalid local import statement found:\n${importStatement[0]}\n` +
        `Please use the following syntax...\n${SYNTAX_REFERENCE}`
      );
    }

    const importTypes = importStatement[1]
      .split(",")
      // Trim all whitespace and brackets
      .map((str) => str.replace(/(\s+|\{|\})/g, ""))
      // Remove empty strings
      .filter(Boolean);
    const importPath = importStatement[2];
    // const path = Path.join(Path.dirname(schemaPath), importPath);

    // Make sure the developer does not try to import a dependencies dependency
    const index = importTypes.findIndex((str) => str.indexOf("_") > -1);
    if (index > -1) {
      throw Error(
        `User defined types with '_' in their name are forbidden. This is used for Polywrap import namespacing.`
      );
    }

    localImports.push({
      kind: "local",
      importedTypes: importTypes,
      uriOrPath: importPath,
    });
  }

  // Make sure types are unique
  const localImportNames: string[] = [];
  localImports.forEach((imp) => localImportNames.push(...imp.importedTypes));
  const duplicateImportTypes = getDuplicates(localImportNames);
  if (duplicateImportTypes.length > 0) {
    throw Error(`Duplicate type found: ${duplicateImportTypes}`);
  }

  return localImports;
}

