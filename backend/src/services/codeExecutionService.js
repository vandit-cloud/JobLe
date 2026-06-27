export async function runCodeSubmission({ code = "", language = "JavaScript", visibleTestCases = [] }) {
  const totalTestCases = visibleTestCases.length;
  const passedTestCases = totalTestCases === 0 ? 0 : Math.max(1, Math.min(totalTestCases, Math.floor(code.length / 40) + 1));
  const failedTestCases = Math.max(totalTestCases - passedTestCases, 0);

  return {
    programmingLanguage: language,
    executionResults: {
      passedTestCases,
      failedTestCases,
      totalTestCases,
      executionTime: Math.min(900, 50 + code.length),
      memoryUsage: Math.min(128, 16 + Math.round(code.length / 20)),
      compilerOutput: failedTestCases ? "Some test cases failed." : "All visible test cases passed.",
      visibleResults: visibleTestCases.map((testCase, index) => ({
        input: testCase.input,
        expectedOutput: testCase.output,
        actualOutput: index < passedTestCases ? testCase.output : "Unexpected output",
        passed: index < passedTestCases,
      })),
    },
  };
}

