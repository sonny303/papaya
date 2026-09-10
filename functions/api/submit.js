import { handleSubmission } from "../../server/submissions.mjs";
export function onRequest({ request, env }) {
  return handleSubmission(request, env);
}
