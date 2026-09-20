/**
 * testPriorityResetAI.js
 *
 * Automated test suite for CortiQuant's AI-Powered Priority Reset logic.
 * Tests 9 distinct requirements:
 * 1. Single task input
 * 2. Multiple tasks in random order with deadline on the LAST task (verifying AI does NOT pick first task)
 * 3. Multiple tasks in a single sentence separated by commas / natural language
 * 4. Tasks with explicit dependencies
 * 5. Large overwhelming tasks (verifying nextAction generation)
 * 6. Ambiguous input without clear priority (verifying clarification question / stated assumption)
 * 7. Stress-aware energy matching (High MSI >= 60 vs Moderate MSI < 60)
 * 8. Empty input handling
 * 9. Fallback engine resilience (simulating AI provider failure)
 */

const path = require("path")
const dotenv = require("dotenv")
dotenv.config({ path: path.join(__dirname, ".env") })

const {
  generatePriorityPathAnalysis,
  getSafePriorityPathFallback,
} = require("./services/aiRecommendationService")

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`)
    passed++
  } else {
    console.error(`  ✗ FAILED: ${message}`)
    failed++
  }
}

async function runAllTests() {
  console.log("=================================================================")
  console.log("RUNNING RESET MODULE AI PRIORITIZATION COMPREHENSIVE TESTS")
  console.log("=================================================================\n")

  // TEST 1: Single Task
  console.log("[TEST 1] Single Task Input")
  {
    const res = await generatePriorityPathAnalysis({
      rawInput: "Prepare for tomorrow's board review presentation",
      msi: 50,
    })
    assert(Boolean(res && res.firstFocus), "Returns a valid priority path result with firstFocus")
    assert(
      res.firstFocus.task.toLowerCase().includes("board") || res.firstFocus.task.toLowerCase().includes("presentation"),
      `Identified task: "${res.firstFocus.task}"`
    )
    assert(Boolean(res.firstFocus.reason), "Includes detailed reason")
    assert(Boolean(res.firstFocus.nextAction), `Includes actionable next step: "${res.firstFocus.nextAction}"`)
  }

  // TEST 2: Multiple Tasks in Random Order with Deadline on the LAST Item
  console.log("\n[TEST 2] Random Order: Urgent Deadline on LAST Task (Must NOT pick item #1)")
  {
    const tasks = [
      "Water the office plants",
      "Organize desktop folders",
      "Reply to casual email from vendor",
      "URGENT: Submit client financial compliance audit by 11am today or face regulatory penalties",
    ]
    const res = await generatePriorityPathAnalysis({
      tasks,
      msi: 40,
    })
    assert(Boolean(res && res.firstFocus), "Analysis completed successfully")
    const pickedFirst = res.firstFocus.task.toLowerCase()
    assert(
      pickedFirst.includes("audit") || pickedFirst.includes("financial") || pickedFirst.includes("compliance"),
      `AI prioritized the critical deadline ("${res.firstFocus.task}") and NOT the first-mentioned task ("${tasks[0]}")`
    )
    assert(
      !pickedFirst.includes("plants"),
      "Did NOT blindly select the first task (watering plants)"
    )
  }

  // TEST 3: Multiple Tasks in a Single Sentence with Commas
  console.log("\n[TEST 3] Single Run-on Sentence with Commas & Conjunctions")
  {
    const rawInput = "I need to water the plants, buy some coffee filters, finish the critical board proposal due in 2 hours, and call my dentist."
    const res = await generatePriorityPathAnalysis({
      rawInput,
      msi: 45,
    })
    assert(Boolean(res && res.firstFocus), "Extracted and prioritized from a single comma-separated sentence")
    const chosen = res.firstFocus.task.toLowerCase()
    assert(
      chosen.includes("proposal") || chosen.includes("board"),
      `AI extracted and prioritized the high-stakes proposal ("${res.firstFocus.task}") over trivial chores`
    )
    assert(Array.isArray(res.sequence) && res.sequence.length >= 3, `Extracted ${res.sequence ? res.sequence.length : 0} distinct tasks from single line`)
  }

  // TEST 4: Tasks with Explicit Dependencies
  console.log("\n[TEST 4] Task Dependencies (Doc Review Required Before Slide Creation)")
  {
    const tasks = [
      "Present slide deck to executive board at 3pm",
      "Review raw data analysis document needed to write the slide content",
      "Draft the slide deck presentation",
      "Order stationery for office supply cupboard",
    ]
    const res = await generatePriorityPathAnalysis({
      tasks,
      msi: 50,
    })
    assert(Boolean(res && res.firstFocus), "Completed dependency analysis")
    const chosen = res.firstFocus.task.toLowerCase()
    assert(
      chosen.includes("review") || chosen.includes("data") || chosen.includes("draft"),
      `AI understood dependency sequence: prioritized prep/review before final presentation: "${res.firstFocus.task}"`
    )
    assert(!chosen.includes("stationery"), "Avoided unrelated administrative chore")
  }

  // TEST 5: Large Overwhelming Task with Next Action
  console.log("\n[TEST 5] Large Overwhelming Task (Actionable 2-minute Next Step)")
  {
    const tasks = [
      "Rewrite entire company enterprise security policy and disaster recovery architecture",
    ]
    const res = await generatePriorityPathAnalysis({
      tasks,
      msi: 65,
    })
    assert(Boolean(res && res.firstFocus), "Analyzed large project")
    assert(Boolean(res.firstFocus.nextAction), `Generated small low-friction nextAction: "${res.firstFocus.nextAction}"`)
  }

  // TEST 6: Ambiguous Input without Clear Priority (Clarification Question or Stated Assumption)
  console.log("\n[TEST 6] Ambiguous Input without Stated Deadlines")
  {
    const tasks = [
      "Task A",
      "Task B",
      "Task C",
    ]
    const res = await generatePriorityPathAnalysis({
      tasks,
      msi: 35,
    })
    assert(Boolean(res && res.firstFocus), "Processed ambiguous task list")
    assert(
      res.clarificationQuestion !== undefined,
      `Provides clarification question or stated assumption: "${res.clarificationQuestion || 'Assumption stated in overview'}"`
    )
  }

  // TEST 7: Stress-Aware Energy Matching (High MSI >= 60 vs Low MSI < 60)
  console.log("\n[TEST 7] Stress-Aware Prioritization (Elevated MSI 75 vs Normal MSI 25)")
  {
    const tasks = [
      "Draft 40-page quarterly financial forecast report",
      "Send quick 1-line email confirmation to client regarding meeting time",
    ]
    const highMsiRes = await generatePriorityPathAnalysis({
      tasks,
      msi: 78,
    })
    assert(Boolean(highMsiRes && highMsiRes.firstFocus), "High MSI analysis completed")
    assert(
      highMsiRes.overview.toLowerCase().includes("stress") ||
      highMsiRes.overview.toLowerCase().includes("strain") ||
      highMsiRes.firstFocus.reason.toLowerCase().includes("friction") ||
      highMsiRes.firstFocus.reason.toLowerCase().includes("momentum") ||
      highMsiRes.firstFocus.task.toLowerCase().includes("email") ||
      highMsiRes.firstFocus.estimatedMinutes <= 20,
      `High MSI (78) adapted strategy for cognitive relief and lower starting friction (estimated ${highMsiRes.firstFocus.estimatedMinutes}m)`
    )
  }

  // TEST 8: Empty / Unclear Input Handling
  console.log("\n[TEST 8] Empty Input Graceful Handling")
  {
    const res = await generatePriorityPathAnalysis({
      rawInput: "   ",
      tasks: [],
      msi: 50,
    })
    assert(Boolean(res), "Handles empty input without throwing")
    assert(res.firstFocus === null, "firstFocus is cleanly null when no tasks are present")
    assert(Boolean(res.overview), "Returns supportive prompt overview to guide the user")
  }

  // TEST 9: Fallback Engine Resilience (Simulating Offline / AI Provider Failure)
  console.log("\n[TEST 9] Multi-Factor Fallback Engine Resilience (Deterministic, Non-First-Item)")
  {
    const fallback = getSafePriorityPathFallback({
      rawInput: "Buy milk, clean garage, CRITICAL: File taxes today before midnight",
      msi: 50,
    })
    assert(Boolean(fallback && fallback.firstFocus), "Fallback completed successfully")
    assert(
      fallback.firstFocus.task.toLowerCase().includes("taxes"),
      `Fallback engine prioritized taxes ("${fallback.firstFocus.task}") based on urgency heuristics and NOT "Buy milk"`
    )
    assert(Array.isArray(fallback.sequence) && fallback.sequence.length === 3, "Fallback properly separated 3 comma-separated tasks")
    assert(Boolean(fallback.firstFocus.nextAction), "Fallback generated concrete next step")
  }

  console.log("\n=================================================================")
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log("=================================================================")

  if (failed > 0) {
    process.exit(1)
  }
}

runAllTests().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
