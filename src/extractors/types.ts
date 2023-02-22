import { Abi } from "@polywrap/abi-types";
import { ASTVisitor } from "graphql";

export interface ExtractorVisitorBuilder {
  build(abi: Abi): ASTVisitor
}