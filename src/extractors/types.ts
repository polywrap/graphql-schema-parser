import { Abi } from "@polywrap/schema-parse/build/definitions";
import { ASTVisitor } from "graphql";

export interface ExtractorVisitorBuilder {
  build(abi: Abi): ASTVisitor
}