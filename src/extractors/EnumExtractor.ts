import { Abi } from "@polywrap/schema-parse/build/definitions";
import { EnumDef } from "@polywrap/schema-parse/build/definitions";
import { ASTVisitor, EnumTypeDefinitionNode } from "graphql";
import { ExtractorVisitorBuilder } from "./types";

export const enumVisitorBuilder: ExtractorVisitorBuilder = {
  build(abi: Abi): ASTVisitor {
    return {
      enter: {
        EnumTypeDefinition: (node: EnumTypeDefinitionNode) => {
          const def: EnumDef = {
            name: node.name.value,
            kind: "Enum",
            constants: node.values?.map(value => value.name.value) ?? []
          }

          abi.enums = abi.enums ? [...abi.enums, def] : [def];
        },
      },
    };
  }
}