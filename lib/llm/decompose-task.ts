import { generateObject } from "ai";
import { createVertex } from "@ai-sdk/google-vertex";
import { z } from "zod";

const subtaskSchema = z.object({
  title: z.string(),
  estimatedMinutes: z.number(),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export type DecomposedSubtask = z.infer<typeof subtaskSchema>;

const vertex = createVertex({
  project: process.env.GOOGLE_VERTEX_PROJECT,
  location: process.env.GOOGLE_VERTEX_LOCATION,
  googleAuthOptions: {
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY,
    },
  },
});

export async function decomposeTask(
  taskTitle: string
): Promise<DecomposedSubtask[]> {
  const { object } = await generateObject({
    model: vertex("gemini-2.5-flash"),
    schema: subtaskSchema,
    output: "array",
    prompt: `Break the following task down into a short list of concrete, actionable subtasks. For each subtask, estimate how many minutes it will take and rate its difficulty as "easy", "medium", or "hard".\n\nTask: "${taskTitle}"`,
  });

  return object;
}
