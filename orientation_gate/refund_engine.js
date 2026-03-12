/**
 * SenuxTech Orientation Engine — Refund Module v0.2
 * Evaluates refund/cancel requests and outputs structured decision signals.
 * Based on: refund_retention_v0_2.json
 */

// ─── Input Schema ───────────────────────────────────────────────────────────
// {
//   intent: "refund" | "cancel" | "downgrade" | "pause" | "troubleshoot" | "unclear"
//   reason: "too expensive" | "doesn't work" | "accidental purchase" |
//           "not using it" | "charged unexpectedly" | "other" | null
//   user_message: string (raw user input, optional)
// }

// ─── Output Schema ──────────────────────────────────────────────────────────
// {
//   decision:  "PROCEED" | "ESCALATE" | "REJECT"
//   signals:   string[]         — what triggered this decision
//   reason:    string           — human-readable explanation
//   guidance:  string[]         — what the agent should do next
//   autonomy_required: boolean  — must include autonomy phrase in response
// }

function evaluateRefundRequest(input) {
  const intent = (input.intent || "unclear").toLowerCase();
  const reason = (input.reason || "other").toLowerCase();

  let decision = "PROCEED";
  const signals = [];
  const guidance = [];
  let reason_text = "";
  let autonomy_required = false;

  // ── Step 1: Detect intent ──────────────────────────────────────────────
  if (intent === "refund" || intent === "cancel") {
    signals.push("direct_cancel_intent");
    autonomy_required = true;
    guidance.push("Show cancel/refund path immediately — do not gate or delay.");
    guidance.push("May offer ONE alternative (pause/downgrade) but never as a condition.");
  } else if (intent === "unclear") {
    signals.push("ambiguous_intent");
    guidance.push("Ask ONE clarifying question: refund, cancel, pause, or troubleshoot?");
    decision = "ESCALATE";
  } else {
    signals.push("non_cancel_intent:" + intent);
    guidance.push("Handle as standard support request.");
  }

  // ── Step 2: Evaluate reason ────────────────────────────────────────────
  if (reason === "accidental purchase" || reason === "charged unexpectedly") {
    signals.push("billing_confusion");
    guidance.push("Prioritize clarity: explain what happened, state policy, give refund steps.");
    reason_text = "Billing confusion detected. User needs clear factual explanation first.";

  } else if (reason === "too expensive" || reason === "not using it") {
    signals.push("value_mismatch");
    guidance.push("Offer pause or downgrade as optional alternative — not as a gate.");
    reason_text = "Value mismatch. Present alternatives alongside cancel path.";

  } else if (reason === "doesn't work" || reason === "bug") {
    signals.push("product_failure_claim");
    guidance.push("Offer max 2 troubleshooting steps AND cancel path in the same message.");
    reason_text = "Product failure reported. Show troubleshooting + cancel path together.";

  } else {
    reason_text = "Standard refund/cancel request. Follow default path.";
  }

  // ── Step 3: Automatic REJECT conditions (from constitution) ───────────
  const rejectTriggers = [
    "guilt", "shame", "fear", "pressure", "moral"
  ];
  if (input.user_message) {
    const msg = input.user_message.toLowerCase();
    const triggered = rejectTriggers.filter(t => msg.includes(t));
    if (triggered.length > 0) {
      signals.push("coercion_language_detected");
      decision = "REJECT";
      reason_text = "Agent response contains disallowed coercive language. Must rewrite.";
      guidance.length = 0;
      guidance.push("REJECT: Do not send this response. Rewrite without emotional pressure.");
    }
  }

  // ── Step 4: Build final output ─────────────────────────────────────────
  return {
    decision,
    signals,
    reason: reason_text || "Request evaluated. Proceed with standard path.",
    guidance,
    autonomy_required
  };
}


// ─── Test Runner ─────────────────────────────────────────────────────────────
function runTests() {
  const testCases = [
    {
      name: "User wants refund immediately",
      input: { intent: "refund", reason: "other", user_message: "I want a refund. Cancel it." }
    },
    {
      name: "Too expensive",
      input: { intent: "cancel", reason: "too expensive", user_message: "This is too expensive." }
    },
    {
      name: "App doesn't work",
      input: { intent: "cancel", reason: "doesn't work", user_message: "It's not working. I want to cancel." }
    },
    {
      name: "Accidental purchase",
      input: { intent: "refund", reason: "accidental purchase", user_message: "I didn't mean to buy this." }
    },
    {
      name: "Ambiguous intent",
      input: { intent: "unclear", reason: null, user_message: "I'm not happy with the service." }
    }
  ];

  console.log("=== SenuxTech Orientation Engine v0.2 — Refund Module Test ===\n");

  testCases.forEach((tc, i) => {
    const result = evaluateRefundRequest(tc.input);
    console.log(`Test ${i + 1}: ${tc.name}`);
    console.log(`  Input:    "${tc.input.user_message}"`);
    console.log(`  Decision: ${result.decision}`);
    console.log(`  Signals:  ${result.signals.join(", ")}`);
    console.log(`  Reason:   ${result.reason}`);
    console.log(`  Guidance:`);
    result.guidance.forEach(g => console.log(`    → ${g}`));
    console.log(`  Autonomy Required: ${result.autonomy_required}`);
    console.log();
  });
}

runTests();

module.exports = { evaluateRefundRequest };
