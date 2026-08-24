const sessions = {};

function getSession(phone) {
    if (!sessions[phone]) {
        sessions[phone] = { step: "start" };
    }
    return sessions[phone];
}

function updateSession(phone, data) {
    sessions[phone] = { ...sessions[phone], ...data };
}

function resetSession(phone) {
    sessions[phone] = { step: "start" };
}

module.exports = { getSession, updateSession, resetSession };
