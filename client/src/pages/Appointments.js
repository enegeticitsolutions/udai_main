import React, { useEffect, useState } from "react";
import API from "../services/api";

import {
    TextField,
    Button,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
    Alert,
    Chip,
    Stack,
    Box
} from "@mui/material";

const SESSION_TYPES = [
    "OT",
    "Special Educator",
    "Speech Therapist",
    "Yoga / Physical Therapist",
    "Remedial / Academic Support",
    "Counselling / Home Programme"
];

function Appointments() {
    const [patients, setPatients] = useState([]);
    const [therapists, setTherapists] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [open, setOpen] = useState(false);

    const [form, setForm] = useState({
        patientId: "",
        therapistId: "",
        date: "",
        time: "",
        sessionType: ""
    });

    const [selectedSlotIndex, setSelectedSlotIndex] = useState("");
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

    useEffect(() => {
        fetchPatients();
        fetchAppointments();
    }, []);

    // When sessionType changes, fetch therapists and reset
    useEffect(() => {
        if (form.sessionType) {
            fetchTherapistsByType(form.sessionType);
        } else {
            setTherapists([]);
        }
        setForm((prev) => ({ ...prev, therapistId: "", date: "", time: "" }));
        setSelectedSlotIndex("");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.sessionType]);

    // When therapist changes, reset slot
    useEffect(() => {
        setSelectedSlotIndex("");
        setForm((prev) => ({ ...prev, date: "", time: "" }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.therapistId]);

    const fetchPatients = async () => {
        try {
            const res = await API.get("/patients");
            setPatients(res.data);
        } catch (err) {
            console.error("Error fetching patients:", err);
        }
    };

    const fetchAppointments = async () => {
        try {
            const res = await API.get("/appointments");
            setAppointments(res.data);
        } catch (err) {
            console.error("Error fetching appointments:", err);
        }
    };

    const fetchTherapistsByType = async (type) => {
        try {
            const res = await API.get(`/therapists/type/${encodeURIComponent(type)}`);
            setTherapists(res.data);
        } catch (err) {
            console.error("Error fetching therapists:", err);
            setTherapists([]);
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const resetForm = () => {
        setForm({ patientId: "", therapistId: "", date: "", time: "", sessionType: "" });
        setSelectedSlotIndex("");
    };

    // Get selected therapist
    const selectedTherapist = therapists.find((t) => t._id === form.therapistId);
    const availableSlots = selectedTherapist?.availability || [];

    // Format date string YYYY-MM-DD → DD/MM/YYYY for display
    const formatDateDisplay = (dateStr) => {
        if (!dateStr) return "";
        const [y, m, d] = dateStr.split("-");
        return `${d}/${m}/${y}`;
    };

    // When a slot is selected, auto-fill date and time from that slot
    const handleSlotSelect = (e) => {
        const index = e.target.value;
        setSelectedSlotIndex(index);

        if (index !== "" && availableSlots[index]) {
            const slot = availableSlots[index];
            setForm((prev) => ({
                ...prev,
                date: slot.date || "",
                time: slot.start || ""
            }));
        }
    };

    const createAppointment = async () => {
        if (!form.patientId || !form.therapistId || !form.date || !form.time || !form.sessionType) {
            setSnackbar({ open: true, message: "Please fill all fields", severity: "warning" });
            return;
        }
        try {
            await API.post("/appointments", form);
            setSnackbar({ open: true, message: "Appointment booked successfully!", severity: "success" });
            resetForm();
            setOpen(false);
            fetchAppointments();
        } catch (err) {
            setSnackbar({
                open: true,
                message: err.response?.data?.error || "Failed to book appointment",
                severity: "error"
            });
        }
    };

    const complete = async (id) => {
        try {
            await API.put(`/appointments/${id}/complete`);
            setSnackbar({ open: true, message: "Session marked as completed", severity: "success" });
            fetchAppointments();
        } catch (err) {
            setSnackbar({
                open: true,
                message: err.response?.data?.error || "Failed to complete",
                severity: "error"
            });
        }
    };

    const cancel = async (id) => {
        try {
            await API.put(`/appointments/${id}/cancel`);
            setSnackbar({ open: true, message: "Appointment cancelled", severity: "info" });
            fetchAppointments();
        } catch (err) {
            setSnackbar({
                open: true,
                message: err.response?.data?.error || "Failed to cancel",
                severity: "error"
            });
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "booked": return "primary";
            case "completed": return "success";
            case "cancelled": return "error";
            case "rescheduled": return "warning";
            default: return "default";
        }
    };

    return (
        <div>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h4">Appointments</Typography>
                <Button variant="contained" onClick={() => setOpen(true)}>
                    Book Appointment
                </Button>
            </Stack>

            {/* ===== BOOK APPOINTMENT DIALOG ===== */}
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Book Appointment</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>

                        {/* 1. Patient */}
                        <FormControl fullWidth required>
                            <InputLabel>Patient</InputLabel>
                            <Select
                                name="patientId"
                                value={form.patientId}
                                label="Patient"
                                onChange={handleChange}
                            >
                                {patients.map((p) => (
                                    <MenuItem key={p._id} value={p._id}>
                                        {p.patientCode} — {p.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* 2. Session Type */}
                        <FormControl fullWidth required>
                            <InputLabel>Session Type</InputLabel>
                            <Select
                                name="sessionType"
                                value={form.sessionType}
                                label="Session Type"
                                onChange={handleChange}
                            >
                                {SESSION_TYPES.map((type) => (
                                    <MenuItem key={type} value={type}>
                                        {type}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* 3. Therapist */}
                        <FormControl fullWidth required disabled={!form.sessionType}>
                            <InputLabel>
                                {form.sessionType
                                    ? `Therapist (${therapists.length} available)`
                                    : "Select session type first"}
                            </InputLabel>
                            <Select
                                name="therapistId"
                                value={form.therapistId}
                                label={form.sessionType
                                    ? `Therapist (${therapists.length} available)`
                                    : "Select session type first"}
                                onChange={handleChange}
                            >
                                {therapists.map((t) => (
                                    <MenuItem key={t._id} value={t._id}>
                                        {t.name}
                                    </MenuItem>
                                ))}
                                {therapists.length === 0 && form.sessionType && (
                                    <MenuItem disabled>No therapists found</MenuItem>
                                )}
                            </Select>
                        </FormControl>

                        {/* 4. Slot Selection — shows therapist's slots with day, date & time */}
                        {form.therapistId && (
                            <FormControl fullWidth required>
                                <InputLabel>Select Slot</InputLabel>
                                <Select
                                    value={selectedSlotIndex}
                                    label="Select Slot"
                                    onChange={handleSlotSelect}
                                >
                                    {availableSlots.length === 0 && (
                                        <MenuItem disabled>No slots available</MenuItem>
                                    )}
                                    {availableSlots.map((slot, i) => (
                                        <MenuItem key={i} value={i}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Chip label={slot.day} size="small" color="primary" variant="outlined" />
                                                {slot.date ? (
                                                    <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                                                        {formatDateDisplay(slot.date)}
                                                    </Typography>
                                                ) : (
                                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                                                        (no date)
                                                    </Typography>
                                                )}
                                                <Typography variant="body2">
                                                    {slot.start} — {slot.end}
                                                </Typography>
                                            </Stack>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        {/* Show selected slot summary */}
                        {selectedSlotIndex !== "" && availableSlots[selectedSlotIndex] && (
                            <Box sx={{
                                p: 2,
                                bgcolor: "action.hover",
                                borderRadius: 1,
                                border: "1px solid",
                                borderColor: "divider"
                            }}>
                                <Typography variant="body2">
                                    📅 <strong>{availableSlots[selectedSlotIndex].day}</strong>
                                    {availableSlots[selectedSlotIndex].date
                                        ? ` — ${formatDateDisplay(availableSlots[selectedSlotIndex].date)}`
                                        : " — (no date set)"}
                                </Typography>
                                <Typography variant="body2">
                                    🕐 {availableSlots[selectedSlotIndex].start} — {availableSlots[selectedSlotIndex].end}
                                </Typography>
                                {!availableSlots[selectedSlotIndex].date && (
                                    <Typography variant="caption" color="error">
                                        ⚠️ This slot has no date. Please update the therapist schedule first.
                                    </Typography>
                                )}
                            </Box>
                        )}

                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { resetForm(); setOpen(false); }}>Cancel</Button>
                    <Button variant="contained" onClick={createAppointment}>Book</Button>
                </DialogActions>
            </Dialog>

            {/* ===== APPOINTMENTS TABLE ===== */}
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell><strong>Code</strong></TableCell>
                        <TableCell><strong>Patient</strong></TableCell>
                        <TableCell><strong>Therapist</strong></TableCell>
                        <TableCell><strong>Session Type</strong></TableCell>
                        <TableCell><strong>Date</strong></TableCell>
                        <TableCell><strong>Time</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell><strong>Actions</strong></TableCell>
                    </TableRow>
                </TableHead>

                <TableBody>
                    {appointments.map((a) => (
                        <TableRow key={a._id}>
                            <TableCell>{a.appointmentCode}</TableCell>
                            <TableCell>{a.patientId?.name || "—"}</TableCell>
                            <TableCell>{a.therapistId?.name || "—"}</TableCell>
                            <TableCell>{a.sessionType}</TableCell>
                            <TableCell>{a.date}</TableCell>
                            <TableCell>{a.time}</TableCell>
                            <TableCell>
                                <Chip
                                    label={a.status}
                                    color={getStatusColor(a.status)}
                                    size="small"
                                />
                            </TableCell>
                            <TableCell>
                                <Stack direction="row" spacing={1}>
                                    {a.status === "booked" && (
                                        <>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="success"
                                                onClick={() => complete(a._id)}
                                            >
                                                Complete
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="error"
                                                onClick={() => cancel(a._id)}
                                            >
                                                Cancel
                                            </Button>
                                        </>
                                    )}
                                </Stack>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {/* ===== SNACKBAR ===== */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
}

export default Appointments;
