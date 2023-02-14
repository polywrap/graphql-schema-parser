import { ExternalImportStatement } from "@polywrap/schema-parse";
import { visit, parse } from "graphql";
import { DependencyTree } from "./DependencyTree";
import { parseExternalImportStatements } from "./parse";
import { fetchExternalSchema } from "./utils";

const extractExternalDepsForDefs = (schema: string, defs: string[]) => {
  // Visit defs and return all used external imports
  const requiredImports = parseExternalImportStatements(schema);
  const additionallyNeededImports = new Map<string, ExternalImportStatement>();

  const state: {
    currentObject?: string,
  } = {}

  visit(parse(schema), {
    enter: {
      ObjectTypeDefinition: (node) => {
        const objectName = node.name.value;

        if (defs.includes(objectName)) {
          state.currentObject = objectName;
        }
      },
      NamedType: (node) => {
        const typeName = node.name.value;
        if (!state.currentObject) {
          return
        }

        requiredImports.forEach((requiredImport) => {
          const requiredImportUri = requiredImport.uriOrPath;
          const typesFromStatementToImport = additionallyNeededImports.get(requiredImportUri)?.importedTypes ?? [];

          if (requiredImport.importedTypes.includes(typeName)) {
            typesFromStatementToImport.push(node.name.value)
            additionallyNeededImports.set(requiredImportUri, {
              ...requiredImport,
              importedTypes: typesFromStatementToImport
            })
          }
        })
      },
    },
    leave: {
      ObjectTypeDefinition: () => {
        state.currentObject = undefined;
      }
    }
  })

  return additionallyNeededImports;
}

const extractTransitiveImports = async (args: {
  importedTypes: string[],
  importSchemaUri: string,
  dependencyTree: DependencyTree,
}) => {
  const importSchema = await fetchExternalSchema(args.importSchemaUri);
  args.dependencyTree.addNode(args.importSchemaUri, importSchema);

  const transitiveDependencies = extractExternalDepsForDefs(importSchema, args.importedTypes);

  for await (const transitiveDependency of transitiveDependencies.values()) {
    args.dependencyTree.addEdge(args.importSchemaUri, transitiveDependency.uriOrPath);
    await extractTransitiveImports({
      importedTypes: transitiveDependency.importedTypes,
      importSchemaUri: transitiveDependency.uriOrPath,
      dependencyTree: args.dependencyTree
    })
  }
}

export const getExternalImportsTree = async (rootSchema: string): Promise<DependencyTree> => {
  const dependencyTree = new DependencyTree();
  const externalImportStatments = parseExternalImportStatements(rootSchema);

  for await (const externalImportStatement of externalImportStatments) {
    extractTransitiveImports({
      importSchemaUri: externalImportStatement.uriOrPath,
      importedTypes: externalImportStatement.importedTypes,
      dependencyTree
    })
  }

  return dependencyTree;
}