import { SchemaValidator } from ".";

import { DirectiveNode } from "graphql";

export const getSupportedDirectivesValidator = (): SchemaValidator => {
  const supportedDirectives = [
    "annotate",
  ];
  const unsupportedUsages: string[] = [];

  return {
    visitor: {
      enter: {
        Directive: (node: DirectiveNode) => {
          const name = node.name.value;

          if (!supportedDirectives.includes(name)) {
            unsupportedUsages.push(name);
          }
        },
      },
    },
    cleanup: () => {
      if (unsupportedUsages.length) {
        throw new Error(
          `Found the following usages of unsupported directives:${unsupportedUsages.map(
            (u) => `\n@${u}`
          )}`
        );
      }
    },
  };
};
