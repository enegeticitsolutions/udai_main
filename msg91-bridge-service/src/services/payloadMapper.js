function cleanString(value, maxLength = 2000) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function cleanPhone(value) {
  return cleanString(value, 32).replace(/[^\d+]/g, "");
}

function cleanOptionalNumber(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

export function mapMsg91Payload(body) {
  const userDetails = {
    name: cleanString(body.name ?? body.userDetails?.name, 120) || undefined,
    age: cleanOptionalNumber(body.age ?? body.userDetails?.age),
    parentName: cleanString(body.parentName ?? body.userDetails?.parentName, 120) || undefined,
    problem: cleanString(body.problem ?? body.userDetails?.problem, 1000) || undefined,
  };

  return {
    // MSG91 webhook sends customerNumber; fallback to other field names for flexibility
    phone: cleanPhone(body.customerNumber ?? body.phone ?? body.user_phone),
    // MSG91 webhook sends content; fallback to other field names
    message: cleanString(body.content ?? body.message ?? body.responseBody ?? body.user_message, 4000) || `[${body.eventName ?? "event"}]`,
    // MSG91 webhook sends requestId; fallback to other field names
    transactionId: cleanString(
      body.requestId ?? body.transactionId ?? body.msg91TransactionId ?? body.transaction_id ?? body.uuid,
      160
    ),
    userDetails,
    source: cleanString(body.source, 80) || "msg91-webhook",
    rawPayload: body,
  };
}
