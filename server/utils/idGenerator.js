const Counter = require("../models/Counter");

async function getNextId(name, prefix) {
    const counter = await Counter.findOneAndUpdate(
        { name },
        { $inc: { value: 1 } },
        { new: true, upsert: true }
    );

    const number = counter.value.toString().padStart(3, "0");

    return `${prefix}-${number}`;
}

module.exports = { getNextId };
