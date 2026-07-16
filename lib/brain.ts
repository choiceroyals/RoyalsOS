import type OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
  ROYALOS_EMPLOYEE_NAMES,
  buildRoyalOSEmployeeRoutingDirectory,
  type RoyalOSEmployeeName,
} from "@/lib/employees/config";

export const royalOSEmployees =
  ROYALOS_EMPLOYEE_NAMES;

export type RoyalOSEmployee =
  RoyalOSEmployeeName;

export type RoyalOSWorkMode = "Task" | "Mission";

const EmployeeSchema = z.enum(royalOSEmployees);

const BrainPlanSchema = z.object({
  objective: z
    .string()
    .describe(
      "A clear statement of what the CEO is trying to accomplish."
    ),

  taskType: z.enum([
    "executive_strategy",
    "research",
    "marketing",
    "creative",
    "media",
    "ai_video_production",
    "analytics",
    "operations",
    "bookkeeping_accounting_records",
    "customer_experience",
    "technology",
    "cross_department_mission",
  ]),

  complexity: z.enum([
    "low",
    "medium",
    "high",
    "critical",
  ]),

  primaryEmployee: EmployeeSchema.describe(
    "The RoyalOS executive who should lead the mission."
  ),

  supportingEmployees: z
    .array(EmployeeSchema)
    .max(8)
    .describe(
      "Other RoyalOS executives whose expertise materially improves the mission."
    ),

  requiresTeam: z
    .boolean()
    .describe(
      "Whether this mission requires more than one RoyalOS executive."
    ),

  routingReason: z
    .string()
    .describe(
      "Why the selected lead and supporting employees are appropriate."
    ),

  knowledgeFocus: z
    .array(z.string())
    .max(12)
    .describe(
      "The company knowledge subjects that should be prioritized by the Knowledge Router."
    ),

  deliverables: z
    .array(z.string())
    .max(12)
    .describe(
      "The concrete outputs RoyalOS should produce."
    ),

  risks: z
    .array(z.string())
    .max(8)
    .describe(
      "Important risks, dependencies, or uncertainties."
    ),

  requiresCEOApproval: z
    .boolean()
    .describe(
      "Whether the final output or proposed action requires CEO approval."
    ),
});

export type RoyalOSBrainPlan = z.infer<
  typeof BrainPlanSchema
>;

type PlanMissionOptions = {
  client: OpenAI;
  model: string;
  idea: string;
  workspace: string;
  requestedEmployee: RoyalOSEmployee;
  mode: RoyalOSWorkMode;
};

function uniqueEmployees(
  employees: RoyalOSEmployee[]
): RoyalOSEmployee[] {
  return Array.from(new Set(employees));
}

function createSingleEmployeeTaskPlan(
  idea: string,
  requestedEmployee: RoyalOSEmployee
): RoyalOSBrainPlan {
  return {
    objective: idea,

    taskType: "cross_department_mission",

    complexity: "low",

    primaryEmployee: requestedEmployee,

    supportingEmployees: [],

    requiresTeam: false,

    routingReason:
      "The CEO selected Single Employee Task mode, so the request remains assigned to the selected employee.",

    knowledgeFocus: [
      requestedEmployee,
      "company",
      "leadership",
      "employee profile",
      "employee playbook",
    ],

    deliverables: [
      "A professional response to the CEO's request",
    ],

    risks: [],

    requiresCEOApproval: false,
  };
}

export async function planRoyalOSMission(
  options: PlanMissionOptions
): Promise<RoyalOSBrainPlan> {
  const {
    client,
    model,
    idea,
    workspace,
    requestedEmployee,
    mode,
  } = options;

  /*
   * Single Employee Task mode respects the employee
   * manually selected by the CEO and avoids an extra
   * OpenAI request.
   */
  if (mode === "Task") {
    return createSingleEmployeeTaskPlan(
      idea,
      requestedEmployee
    );
  }

  const response = await client.responses.parse({
    model,

    instructions: `
You are the RoyalOS Brain for Triple-Hay Concept LLC.

Your job is to analyze a CEO mission and route it to the correct RoyalOS executive or executive team.

ROYALOS EXECUTIVES

${buildRoyalOSEmployeeRoutingDirectory()}

ROUTING RULES

1. Select the employee best qualified to lead the mission.

2. Use Adedeji as lead when the request is primarily executive, strategic, or cross-departmental.

3. Do not add employees merely to make the team appear larger.

4. Add a supporting employee only when that person's expertise materially improves the outcome.

5. Identify the exact knowledge subjects the Knowledge Router should prioritize.

6. Distinguish requested work from capabilities that have not yet been implemented.

7. Never claim that an employee has executed real-world actions unless the system actually has the required tool and permission.

8. Financial commitments, strategy changes, public commitments, major partnerships, publishing, deletion, and irreversible actions require CEO approval.

9. Keep the plan focused, realistic, and useful.

10. The manually selected employee is a preference, not an absolute requirement in Mission mode. Change the lead only when another employee is clearly more appropriate.
`.trim(),

    input: `
ACTIVE WORKSPACE
${workspace}

EMPLOYEE SELECTED IN THE INTERFACE
${requestedEmployee}

WORK MODE
${mode}

CEO MISSION
${idea}

Analyze the mission and return the RoyalOS routing plan.
`.trim(),

    reasoning: {
      effort: "low",
    },

    text: {
      format: zodTextFormat(
        BrainPlanSchema,
        "royalos_brain_plan"
      ),
    },

    store: false,
  });

  const plan = response.output_parsed;

  if (!plan) {
    throw new Error(
      "The RoyalOS Brain returned no usable mission plan."
    );
  }

  const supportingEmployees = uniqueEmployees(
    plan.supportingEmployees
  ).filter(
    (employee) =>
      employee !== plan.primaryEmployee
  );

  return {
    ...plan,
    supportingEmployees,
    requiresTeam:
      plan.requiresTeam ||
      supportingEmployees.length > 0,
  };
}