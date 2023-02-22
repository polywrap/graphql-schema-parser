import { UniqueDefKind, PropertyDef, ObjectDef, Abi, isModuleType } from "@polywrap/abi-types";
import { FieldDefinitionNode, ASTVisitor, ObjectTypeDefinitionNode } from "graphql";
import { parseDirectivesInField } from "./DirectiveExtractor";
import { ExtractorVisitorBuilder } from "./types";
import { extractType } from "./utils";

export class ObjectVisitorBuilder implements ExtractorVisitorBuilder {
  constructor(protected readonly uniqueDefs: Map<string, UniqueDefKind>) { }
  
  private extractPropertyDef(node: FieldDefinitionNode, uniqueDefs: Map<string, UniqueDefKind>): PropertyDef {
    const { map } = parseDirectivesInField(node, uniqueDefs)
  
    return {
      kind: "Property",
      name: node.name.value,
      required: node.type.kind === "NonNullType",
      type: map ?? extractType(node.type, uniqueDefs)
    }
  }

  build(abi: Abi): ASTVisitor {
    return {
      enter: {
        ObjectTypeDefinition: (node: ObjectTypeDefinitionNode) => {
          const typeName = node.name.value;
      
          // Skip non-custom types
          if (isModuleType(typeName)) {
            return;
          }
      
          // Create a new TypeDefinition
          const def: ObjectDef = {
            kind: "Object",
            name: typeName,
            props: node.fields?.map(fieldNode => this.extractPropertyDef(fieldNode, this.uniqueDefs)) ?? []
          };
          
          abi.objects = abi.objects ? [...abi.objects, def] : [def];
        },
      },
    };
  }
}
