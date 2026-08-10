import { NextResponse, type NextRequest } from "next/server";

type RequestAccessPayload = {
  name: string;
  email: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

async function sendRequestAccessEmail(payload: RequestAccessPayload) {
  const from =
    process.env.REQUEST_ACCESS_FROM ??
    "Acetate <onboarding@updates.acetate.me>";
  const to = process.env.REQUEST_ACCESS_NOTIFY_TO;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!to) {
    console.error("REQUEST_ACCESS_NOTIFY_TO is not configured.");
    return false;
  }

  if (!resendApiKey) {
    console.error("RESEND_API_KEY is not configured.");
    return false;
  }

  const basePayload = {
    from,
    to: [to],
    subject:
      process.env.REQUEST_ACCESS_SUBJECT ??
      "New user requested access to acetate.me",
    text: `${payload.name} requested to enter the waitlist.\nEmail: ${payload.email}\n\nThe Acetate Team`,
  };

  const attempt = async (currentPayload: Record<string, unknown>) => {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(currentPayload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { ok: false, status: response.status, body };
    }

    return { ok: true, status: response.status, body: "" };
  };

  const primaryResult = await attempt(basePayload);

  if (primaryResult.ok) return true;

  console.error("Resend request failed", {
    status: primaryResult.status,
    body: primaryResult.body.slice(0, 500),
  });
  return false;
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = normalizeString(payload.name);
  const email = normalizeString(payload.email);

  if (!name) {
    return NextResponse.json(
      { error: "Name cannot be empty." },
      { status: 400 },
    );
  }

  if (name.length > 100) {
    return NextResponse.json(
      { error: "Name must be 100 characters or fewer." },
      { status: 400 },
    );
  }

  if (!email) {
    return NextResponse.json(
      { error: "Email cannot be empty." },
      { status: 400 },
    );
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const sent = await sendRequestAccessEmail({ name, email });
  if (!sent) {
    return NextResponse.json(
      { error: "Could not send email right now." },
      { status: 502 },
    );
  }

  return NextResponse.json({ message: "Request received." }, { status: 202 });
}
