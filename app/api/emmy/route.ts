async function getClient() {
  const OpenAI = (await import("openai")).default;

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function POST(req: Request) {
  try {
    const { idea, workspace, employee, mode } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "Missing OPENAI_API_KEY in environment variables." },
        { status: 500 }
      );
    }

    const client = await getClient();

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are working inside RoyalOS.

Company:
Triple-Hay Concept LLC is the parent company behind ChoiceRoyals, Xena Grace, TD Talk, and RoyalOS.

Workspace:
${workspace}

Employee:
${employee}

Mode:
${mode}

If employee is Adedeji, act as Executive Assistant and Chief of Staff.
If employee is Emmy, act as Content Operations Manager.
If employee is Atlas, act as Research Manager.
If employee is Nova, act as Creative Director.
If employee is Jack, act as Video Production Director.
If employee is Tyson, act as Analytics Manager.
If employee is Titan, act as Business Operations Manager.
If employee is Janet, act as Customer Success Manager.
If employee is Orion, act as Automation Engineer.

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
      draft: response.choices[0].message.content || "",
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "RoyalOS could not complete the request." },
      { status: 500 }
    );
  }
}