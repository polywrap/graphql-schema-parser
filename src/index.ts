import { Abi, SchemaParser } from "@polywrap/abi-types";
import { parse, visit } from "graphql";
import { EnumVisitorBuilder } from "./extractors/EnumExtractor";
import { FunctionsVisitorBuilder } from "./extractors/FunctionExtractor";
import { ObjectVisitorBuilder } from "./extractors/ObjectExtractor";

export class GraphQLSchemaParser implements SchemaParser {
  async parse(schema: string): Promise<Abi> {
    const astNode = parse(schema);
    const defaultExtractors: VisitorBuilder[] = [
      new ObjectVisitorBuilder(uniqueDefs),
      new EnumVisitorBuilder(),
      new FunctionsVisitorBuilder(uniqueDefs)
    ]
  
    // Validate GraphQL Schema
    if (!options.noValidate) {
      const validates = options.validators || validators;
      validate(astNode, validates);
    }
  
    // Extract & Build Abi
    let info = createAbi();
  
    const extracts = options.extractors?.map(extractorBuilder => extractorBuilder(info, uniqueDefs)) ?? defaultExtractors.map(e => e.build(info));
    extract(astNode, extracts);
  
    if (options && options.transforms) {
      for (const transform of options.transforms) {
        info = transformAbi(info, transform);
      }
    }
  
    return {
      version: "0.2",
      objects: info.objects?.length ? info.objects : undefined,
      functions: info.functions?.length ? info.functions : undefined,
      enums: info.enums?.length ? info.enums : undefined,
      imports: info.imports?.length ? info.imports : undefined,
    };
  }

  async parseExternalImportStatements(schema: string): Promise<ExternalImportStatement[]> {

  }

  async parseLocalImportStatements(schema: string): Promise<LocalImportStatement[]> {

  }
}

const validate = (
  astNode: DocumentNode,
  validators: SchemaValidatorBuilder[]
) => {
  const allValidators = validators.map((getValidator) => getValidator());
  const allVisitors = allValidators.map((x) => x.visitor);
  const allCleanup = allValidators.map((x) => x.cleanup);

  visit(astNode, visitInParallel(allVisitors));

  for (const cleanup of allCleanup) {
    if (cleanup) {
      cleanup(astNode);
    }
  }
};

const extract = (
  astNode: DocumentNode,
  extractors: ASTVisitor[]
) => {
  visit(astNode, visitInParallel(extractors));
};