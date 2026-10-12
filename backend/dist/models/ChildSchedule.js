import mongoose, { Schema } from "mongoose";
const RecurringSlotSchema = new Schema({
    day_of_week: {
        type: String,
        enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        required: true,
    },
    start_time: {
        type: String,
        required: true,
        trim: true,
    },
    end_time: {
        type: String,
        required: true,
        trim: true,
    },
}, { _id: false });
const ChildScheduleSchema = new Schema({
    child_name: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    parent_phone: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    therapist_id: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    therapy_type: {
        type: String,
        required: true,
        trim: true,
    },
    recurring_slots: {
        type: [RecurringSlotSchema],
        validate: {
            validator: function (v) {
                return Array.isArray(v) && v.length >= 1 && v.length <= 3;
            },
            message: "recurring_slots must contain between 1 and 3 slots.",
        },
        required: true,
    },
    status: {
        type: String,
        enum: ["ACTIVE", "PAUSED"],
        default: "ACTIVE",
        index: true,
    },
    notes: {
        type: String,
        default: "",
    },
}, {
    timestamps: true,
    collection: "childSchedules",
});
// Compound index for fast phone lookup with status
ChildScheduleSchema.index({ parent_phone: 1, status: 1 });
ChildScheduleSchema.index({ therapist_id: 1, status: 1 });
export const ChildScheduleModel = mongoose.models.ChildSchedule ||
    mongoose.model("ChildSchedule", ChildScheduleSchema);
