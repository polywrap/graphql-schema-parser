import { Abi, isModuleType, SchemaParser } from "@polywrap/schema-parse";
import { UniqueDefKind } from "@polywrap/schema-parse/build/definitions";
import { parse, visit } from "graphql";
import fs from "fs";

import { parseImportStatements } from "./imports/parse";
import { fetchExternalSchema } from "./imports/utils";

export class GraphQLSchemaParser implements SchemaParser {
  async getImportsTable(schema: string, schemaPath: string) {
    let importedAbiRegistry = new Map<string, string>();

    const {
      externalImportStatements,
      localImportStatements
    } = parseImportStatements(schema, schemaPath);

    for await (const externalImportStatement of externalImportStatements) {
      const schemaString = await fetchExternalSchema(externalImportStatement.uri);
      importedAbiRegistry.set(externalImportStatement.uri, schemaString);
    }

    for (const localImportStatement of localImportStatements) {
      const localSchemaFileSource = fs.readFileSync(localImportStatement.path, "utf8");
      importedAbiRegistry.set(localImportStatement.path, localSchemaFileSource);
    }

    return importedAbiRegistry;
  }

  async getUniqueDefinitionsTable(schema: string) {
    const document = parse(schema);
    const uniqueDefs = new Map<string, UniqueDefKind>();

    visit(document, {
      ObjectTypeDefinition: (node) => {
        const name = node.name.value;

        if (!isModuleType(name)) {
          uniqueDefs.set(name, "Object")
        }
      },
      EnumTypeDefinition: (node) => {
        uniqueDefs.set(node.name.value, "Enum")
      }
    });

    return uniqueDefs;
  };

  async parse(schema: string, uniqueDefinitionsTable: Map<string, UniqueDefKind>) {
    
  };
}