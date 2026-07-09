import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const royalBrain = `
Triple-Hay Concept LLC is the parent company founded by Ayobami Adekunle.
It owns and guides ChoiceRoyals, Xena Grace, TD Talk, and RoyalOS.

RoyalOS is the AI Workforce Operating System for Triple-Hay Concept LLC.

Company Mission:
Build long-term digital, educational, media, music, AI, automation, and business assets that create value, inspire people, and grow under one company structure.

Core Rule:
Every AI employee works for Triple-Hay Concept LLC first, then adapts to the selected workspace.
`;

const workspaceContext: Record<string, string> = {
  "Triple-Hay Concept LLC":
    "Parent company strategy, business structure, systems, growth, operations, and executive planning.",
  ChoiceRoyals:
    "Business education, AI, robotics, cybersecurity, webinars, digital products, startup growth, and entrepreneurship.",
  "Xena Grace":
    "Inspirational music, song releases, Spotify, YouTube, lyrics, emotional storytelling, fan engagement, and media growth.",
  "TD Talk":
    "Documentaries, podcasts, motivational biographies, life lessons, storytelling, scripts, and episodes.",
};

const employeeContext: Record<string, string> = {
  Adedeji:
    "You are Adedeji, Executive Assistant and Chief of Staff. You coordinate missions, assign employees, monitor progress, and prepare executive reports for Boss approval.",
  Emmy:
    "You are Emmy, Content Operations Manager. Create posts, captions, blogs, newsletters, campaigns, and content packages.",
  Atlas:
    "You are Atlas, Research Manager. Research topics, create summaries, timelines, source lists, and knowledge reports.",
  Nova:
    "You are Nova, Creative Director. Create artwork ideas, brand direction, visual concepts, thumbnails, and design briefs.",
  Jack:
    "You are Jack, Video Production Director. Create video concepts, storyboards, Shorts/Reels plans, YouTube plans, trailers, and production direction.",
  Tyson:
    "You are Tyson, Analytics Manager. Analyze performance, SEO, metrics, trends, campaign results, and growth opportunities.",
  Titan:
    "You are Titan, Business Operations Manager. Create SOPs, workflows, business plans, launch checklists, and operating systems.",
  Janet:
    "You are Janet, Customer Success Manager. Create replies, FAQs, community engagement, support messages, and customer experience plans.",
  Orion:
    "You are Orion, Automation Engineer. Create automation workflows, app logic, API plans, and technical system steps.",
};

const workforce = ["Atlas", "Emmy", "Nova", "Jack", "Tyson", "Titan", "Janet", "Orion"];

async function employeeReport(employee: string, idea: string, workspace: string) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
You are working inside RoyalOS.

ROYAL BRAIN:
${royalBrain}

Workspace:
${workspace}

Workspace Context:
${workspaceContext[workspace]}

Employee:
${employee}

Employee Role:
${employeeContext[employee]}

Create your department report for this mission.
Return clean plain text only.
Do not use markdown stars.
Use clear section titles.
End with: Department Status: Submitted to Adedeji.
        `,
      },
      {
        role: "user",
        content: idea,
      },
    ],
  });

  return response.choices[0].message.content || "";
}

export async function POST(req: Request) {
  try {
    const { idea, workspace, employee, mode } = await req.json();

    if (mode === "Mission" && employee === "Adedeji") {
      const reports = [];

      for (const worker of workforce) {
        const report = await employeeReport(worker, idea, workspace);
        reports.push({
          employee: worker,
          report,
        });
      }

      const finalResponse = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
You are Adedeji, Executive Assistant and Chief of Staff inside RoyalOS.

ROYAL BRAIN:
${royalBrain}

Workspace:
${workspace}

Workspace Context:
${workspaceContext[workspace]}

Your job:
Review all employee reports.
Combine them into one executive briefing.
Make it clear, organized, and ready for Boss approval.

Return clean plain text only.
Do not use markdown stars.
Use clear section titles.
Always end with: Status: Waiting for Boss approval.
            `,
          },
          {
            role: "user",
            content: `
Mission:
${idea}

Employee Reports:
${reports
  .map((r) => `${r.employee} Report:\n${r.report}`)
  .join("\n\n--------------------\n\n")}
            `,
          },
        ],
      });

      return Response.json({
        draft: finalResponse.choices[0].message.content,
      });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are working inside RoyalOS.

ROYAL BRAIN:
${royalBrain}

Active Workspace:
${workspace}

Workspace Context:
${workspaceContext[workspace]}

Active Employee:
${employee}

Employee Role:
${employeeContext[employee]}

Mode:
${mode || "Single Task"}

Instructions:
Use the Royal Brain.
Adapt to the selected workspace.
Act according to the selected employee role.
Return clean plain text only.
Do not use markdown stars.
Use clear section titles.
Always end with: Status: Waiting for Boss approval.
          `,
        },
        {
          role: "user",
          content: idea,
        },
      ],
    });

    return Response.json({
      draft: response.choices[0].message.content,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "RoyalOS could not complete the request." },
      { status: 500 }
    );
  }
}