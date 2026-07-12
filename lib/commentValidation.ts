export const commentMinLength = 3;
export const commentMaxLength = 1000;

export function validateCommentBody(value: string) {
  const body = value.trim();
  const compactBody = body.replace(/\s+/g, "").toLowerCase();

  if (body.length < commentMinLength) {
    return { ok: false as const, message: "Your comment is too short.", body };
  }

  if (body.length > commentMaxLength) {
    return { ok: false as const, message: "Your comment is too long.", body };
  }

  if (compactBody.length >= 8 && new Set(compactBody).size <= 2) {
    return { ok: false as const, message: "Please write a more detailed comment.", body };
  }

  return { ok: true as const, body };
}
