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
    phone: cleanPhone(body.phone ?? body.user_phone),
    message: cleanString(body.message ?? body.responseBody ?? body.user_message, 4000),
    transactionId: cleanString(body.transactionId ?? body.msg91TransactionId ?? body.transaction_id, 160),
    userDetails,
    source: cleanString(body.source, 80) || "msg91-api-node",
    rawPayload: body,
  };
}
