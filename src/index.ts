import { Abi, createAbi, ExternalImportStatement, LocalImportStatement, SchemaParser, UniqueDefKind } from "@polywrap/abi-types";
import { ASTVisitor, DocumentNode, parse, visit, visitInParallel } from "graphql";
import { EnumVisitorBuilder } from "./extractors/EnumExtractor";
import { FunctionsVisitorBuilder } from "./extractors/FunctionExtractor";
import { ObjectVisitorBuilder } from "./extractors/ObjectExtractor";
import { ExtractorVisitorBuilder } from "./extractors/types";
import { isModuleType } from "./extractors/utils";
import { parseExternalImportStrings, parseLocalImportStrings } from "./imports/parse";
import { SchemaValidatorBuilder } from "./validate";

export class GraphQLSchemaParser implements SchemaParser {
  getUniqueDefs(schema: DocumentNode): Map<string, UniqueDefKind> {
    const uniqueDefs = new Map<string, UniqueDefKind>();
    const visitor: ASTVisitor = {
      enter: {
        ObjectTypeDefinition: (objectDefNode) => {
          const nodeName = objectDefNode.name.value;
          if (!isModuleType(nodeName)) {
            uniqueDefs.set(nodeName, "Object")
          }
        },
        EnumTypeDefinition: (enumDefNode) => {
          uniqueDefs.set(enumDefNode.name.value, "Enum")
        },
      },
    };

    visit(schema, visitor);
    return uniqueDefs;
  }

  validate(schema: DocumentNode, validators: SchemaValidatorBuilder[]): void {
    const allValidators = validators.map((getValidator) => getValidator());
    const allVisitors = allValidators.map((x) => x.visitor);
    const allCleanup = allValidators.map((x) => x.cleanup);

    visit(schema, visitInParallel(allVisitors));

    for (const cleanup of allCleanup) {
      if (cleanup) {
        cleanup(schema);
      }
    }
  }
  
  async parse(schema: string): Promise<Abi> {
    const astNode = parse(schema);
    const uniqueDefs = this.getUniqueDefs(astNode);
  
    const defaultExtractorBuilders: ExtractorVisitorBuilder[] = [
      new ObjectVisitorBuilder(uniqueDefs),
      new EnumVisitorBuilder(),
      new FunctionsVisitorBuilder(uniqueDefs)
    ]
  
    // Extract & Build Abi
    let baseAbi = createAbi();
  
    const extractors = defaultExtractorBuilders.map(e => e.build(baseAbi));
    visit(astNode, visitInParallel(extractors))
  
    return {
      version: "0.2",
      objects: baseAbi.objects?.length ? baseAbi.objects : undefined,
      functions: baseAbi.functions?.length ? baseAbi.functions : undefined,
      enums: baseAbi.enums?.length ? baseAbi.enums : undefined,
      imports: baseAbi.imports?.length ? baseAbi.imports : undefined,
    };
  }

  async parseExternalImportStatements(schema: string): Promise<ExternalImportStatement[]> {
    const externalImportCapture = /(?:#|""")*import\s*(?:({[^}]+}|\*))\s*into\s*(\w+?)\s*from\s*[\"'`]([^\"'`\s]+)[\"'`]/g;
    const externalImportStatements = [...schema.matchAll(externalImportCapture)];

    const externalImportsToResolve: ExternalImportStatement[] = parseExternalImportStrings(
      externalImportStatements
    );

    return externalImportsToResolve;
  }

  async parseLocalImportStatements(schema: string): Promise<LocalImportStatement[]> {
    const localImportCapture = /(?:#|""")*import\s*(?:({[^}]+}|\*))\s*from\s*[\"'`]([^\"'`\s]+)[\"'`]/g;
    const localImportStatements = [...schema.matchAll(localImportCapture)];
  
    const localImportsToResolve: LocalImportStatement[] = parseLocalImportStrings(
      localImportStatements
    );
  
    return localImportsToResolve
  }
}
