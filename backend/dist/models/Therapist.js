import mongoose from "mongoose";
const WeeklyScheduleEntrySchema = new mongoose.Schema({
    day: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    lunchStart: { type: String, required: true },
    lunchEnd: { type: String, required: true },
}, { _id: false });
const TherapistSchema = new mongoose.Schema({
    name: { type: String, required: true },
    department: { type: String, required: true },
    role: { type: String, default: "" },
    image: { type: String, default: "" },
    summary: { type: String, default: "" },
    experience: { type: String, default: "" },
    active: { type: Boolean, default: true },
    weeklySchedule: { type: [WeeklyScheduleEntrySchema], default: [] },
}, {
    timestamps: true,
    collection: "therapists",
});
/** Index for fast department + active lookups */
TherapistSchema.index({ department: 1, active: 1 });
export const TherapistModel = mongoose.model("TherapistModel", TherapistSchema);
/**
 * Default Mon–Fri schedule used when seeding therapists without explicit schedules.
 */
export const DEFAULT_WEEKLY_SCHEDULE = [1, 2, 3, 4, 5].map((day) => ({
    day,
    startTime: "09:00",
    endTime: "17:00",
    lunchStart: "13:00",
    lunchEnd: "14:00",
}));
