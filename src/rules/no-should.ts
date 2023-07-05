import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import {
  type CallExpressionWithSingleArgument,
  type DescribeAlias,
  type StringNode,
  type TestCaseName,
  createRule,
  getStringValue,
  isStringNode,
  parseJestFnCall,
} from './utils';

type IgnorableFunctionExpressions =
  | TestCaseName.it
  | TestCaseName.test
  | DescribeAlias.describe;

const hasStringAsFirstArgument = (
  node: TSESTree.CallExpression,
): node is CallExpressionWithSingleArgument<StringNode> =>
  node.arguments[0] && isStringNode(node.arguments[0]);

export default createRule<
  [
    Partial<{
      ignore: readonly IgnorableFunctionExpressions[];
      allowedPrefixes: readonly string[];
      ignoreTopLevelDescribe: boolean;
    }>,
  ],
  'unexpectedShould'
>({
  name: __filename,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce no should test names',
      category: 'Best Practices',
      recommended: false,
    },
    fixable: 'code',
    messages: {
      unexpectedShould: '`{{ method }}`s should not begin with should',
    },
    schema: [
      {
        type: 'object',
        additionalProperties: false,
      },
    ],
  } as const,
  defaultOptions: [
    { ignore: [], allowedPrefixes: [], ignoreTopLevelDescribe: false },
  ],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        const jestFnCall = parseJestFnCall(node, context);

        if (!jestFnCall || !hasStringAsFirstArgument(node)) {
          return;
        }

        if (jestFnCall.type !== 'test') {
          return;
        }

        const [firstArg] = node.arguments;

        const description = getStringValue(firstArg);

        const [firstLetter] = description.split(' ');

        if (firstLetter === 'should') {
          context.report({
            messageId: 'unexpectedShould',
            node: node.arguments[0],
            data: { method: jestFnCall.name },
            fix(fixer) {
              const description = getStringValue(firstArg);

              const rangeIgnoringQuotes: TSESLint.AST.Range = [
                firstArg.range[0] + 1,
                firstArg.range[1] - 1,
              ];
              const newDescription = description.replace('should ', '');

              return [
                fixer.replaceTextRange(rangeIgnoringQuotes, newDescription),
              ];
            },
          });
        }
      },
    };
  },
});
