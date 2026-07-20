import { ZodError } from "zod";
import { subscribeRequestSchema } from "../../shared/models";
import { addSubscriberToAweber } from "../aweber";

export async function subscribeEmail(body: unknown) {
  try {
    const { email } = subscribeRequestSchema.parse(body);
    await addSubscriberToAweber(email);

    return {
      status: 200 as const,
      body: { success: true, email, requiresConfirmation: true },
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        status: 400 as const,
        body: {
          message: error.errors[0]?.message ?? "Invalid email address",
        },
      };
    }

    if (error instanceof Error && error.message.includes("not configured")) {
      return {
        status: 503 as const,
        body: {
          message: "Email subscription is temporarily unavailable. Please try again later.",
        },
      };
    }

    throw error;
  }
}
