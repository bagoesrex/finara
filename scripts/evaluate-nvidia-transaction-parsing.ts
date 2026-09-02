import { buildComposerRouterPrompts } from "../src/ai/composer-router";
import {
  evaluateTransactionCase,
  transactionEvaluationDatasetV1,
} from "../src/ai/transaction-evaluation";
import { aiComposerIntentSchema } from "../src/lib/ai-composer";
import { getNvidiaConfig } from "../src/server/ai/config";
import { requestNvidiaStructuredJson } from "../src/server/ai/nvidia-client";

async function evaluateNvidiaTransactionParsing() {
  const dataset = transactionEvaluationDatasetV1;
  const categories = dataset.categories.map(({ name, type }) => ({ name, type }));
  const config = getNvidiaConfig();
  let passedCases = 0;

  for (const evaluationCase of dataset.cases) {
    const prompts = buildComposerRouterPrompts({
      categories,
      currentMonth: dataset.currentMonth,
      referenceDate: dataset.referenceDate,
      text: evaluationCase.text,
    });
    const intent = await requestNvidiaStructuredJson({
      ...config,
      maxTokens: 384,
      outputSchema: aiComposerIntentSchema,
      systemPrompt: prompts.system,
      userPrompt: prompts.user,
    });
    const findings = evaluateTransactionCase(evaluationCase, intent);

    if (findings.length === 0) {
      passedCases += 1;
      console.info(`PASS ${evaluationCase.id}`);
      continue;
    }

    for (const finding of findings) {
      console.error(
        `FAIL ${evaluationCase.id} ${finding.field}: expected ${finding.expected}, received ${finding.actual}.`,
      );
    }
  }

  const summary = `${passedCases}/${dataset.cases.length} transaction parsing cases passed (dataset ${dataset.version}).`;
  if (passedCases !== dataset.cases.length) {
    console.error(summary);
    process.exitCode = 1;
    return;
  }

  console.info(summary);
}

evaluateNvidiaTransactionParsing().catch((error: unknown) => {
  console.error("NVIDIA transaction parsing evaluation could not complete.");
  console.error(error instanceof Error ? error.name : "UnknownError");
  process.exitCode = 1;
});
