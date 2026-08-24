import React, { useEffect, useState } from "react";
import API from "../services/api";

import {
    Typography,
    Button,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Stack,
    Chip,
    IconButton,
    Snackbar,
    Alert,
    Divider,
    Box
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ScheduleIcon from "@mui/icons-material/Schedule";

const SPECIALIZATIONS = [
    "OT",
    "Special Educator",
    "Speech Therapist",
    "Yoga / Physical Therapist",
    "Remedial / Academic Support",
    "Counselling / Home Programme"
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function Therapists() {
    const [therapists, setTherapists] = useState([]);
    const [openAdd, setOpenAdd] = useState(false);
    const [openSchedule, setOpenSchedule] = useState(false);
    const [selectedTherapist, setSelectedTherapist] = useState(null);

    const [form, setForm] = useState({
        name: "",
        phone: "",
        email: "",
        specialization: ""
    });

    const [slotForm, setSlotForm] = useState({
        day: "",
        date: "",
        start: "",
        end: ""
    });

    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
    const [editSlotIndex, setEditSlotIndex] = useState(null);
    const [editDate, setEditDate] = useState("");

    useEffect(() => {
        fetchTherapists();
    }, []);

    const fetchTherapists = async () => {
        try {
            const res = await API.get("/therapists");
            setTherapists(res.data);
        } catch (err) {
            console.error("Error fetching therapists:", err);
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const resetForm = () => {
        setForm({ name: "", phone: "", email: "", specialization: "" });
    };

    const addTherapist = async () => {
        if (!form.name || !form.specialization) {
            setSnackbar({ open: true, message: "Name and specialization are required", severity: "warning" });
            return;
        }
        try {
            await API.post("/therapists", form);
            setSnackbar({ open: true, message: "Therapist added!", severity: "success" });
            resetForm();
            setOpenAdd(false);
            fetchTherapists();
        } catch (err) {
            setSnackbar({ open: true, message: err.response?.data?.error || "Failed to add", severity: "error" });
        }
    };

    const deleteTherapist = async (id) => {
        if (!window.confirm("Delete this therapist?")) return;
        try {
            await API.delete(`/therapists/${id}`);
            setSnackbar({ open: true, message: "Therapist deleted", severity: "info" });
            fetchTherapists();
        } catch (err) {
            setSnackbar({ open: true, message: "Failed to delete", severity: "error" });
        }
    };

    // ===== SCHEDULE MANAGEMENT =====

    const openScheduleDialog = (therapist) => {
        setSelectedTherapist(therapist);
        setSlotForm({ day: "", date: "", start: "", end: "" });
        setOpenSchedule(true);
    };

    const addSlot = async () => {
        if (!slotForm.day || !slotForm.date || !slotForm.start || !slotForm.end) {
            setSnackbar({ open: true, message: "Day, date, start and end time are required", severity: "warning" });
            return;
        }
        try {
            const res = await API.post(`/therapists/${selectedTherapist._id}/availability`, slotForm);
            setSelectedTherapist({
                ...selectedTherapist,
                availability: res.data.availability
            });
            setSlotForm({ day: "", date: "", start: "", end: "" });
            setSnackbar({ open: true, message: "Slot added!", severity: "success" });
            fetchTherapists();
        } catch (err) {
            setSnackbar({ open: true, message: err.response?.data?.error || "Failed to add slot", severity: "error" });
        }
    };

    const removeSlot = async (index) => {
        try {
            const res = await API.delete(`/therapists/${selectedTherapist._id}/availability/${index}`);
            setSelectedTherapist({
                ...selectedTherapist,
                availability: res.data.availability
            });
            setSnackbar({ open: true, message: "Slot removed", severity: "info" });
            fetchTherapists();
        } catch (err) {
            setSnackbar({ open: true, message: "Failed to remove slot", severity: "error" });
        }
    };

    const updateSlotDate = async (index) => {
        if (!editDate) {
            setSnackbar({ open: true, message: "Please select a date", severity: "warning" });
            return;
        }
        try {
            // Auto-derive day from selected date
            const [year, month, day] = editDate.split("-").map(Number);
            const dateObj = new Date(year, month - 1, day);
            const autoDay = DAYS[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1];

            const res = await API.patch(
                `/therapists/${selectedTherapist._id}/availability/${index}`,
                { date: editDate, day: autoDay }
            );
            setSelectedTherapist({
                ...selectedTherapist,
                availability: res.data.availability
            });
            setEditSlotIndex(null);
            setEditDate("");
            setSnackbar({ open: true, message: "Slot updated!", severity: "success" });
            fetchTherapists();
        } catch (err) {
            setSnackbar({ open: true, message: err.response?.data?.error || "Failed to update slot", severity: "error" });
        }
    };

    return (
        <div>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h4">Therapists</Typography>
                <Button variant="contained" onClick={() => setOpenAdd(true)}>
                    Add Therapist
                </Button>
            </Stack>

            {/* ===== ADD THERAPIST DIALOG ===== */}
            <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="sm">
                <DialogTitle>Add Therapist</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Name"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            fullWidth
                            required
                        />
                        <TextField
                            label="Phone"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            fullWidth
                        />
                        <TextField
                            label="Email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            fullWidth
                        />
                        <FormControl fullWidth required>
                            <InputLabel>Specialization</InputLabel>
                            <Select
                                name="specialization"
                                value={form.specialization}
                                label="Specialization"
                                onChange={handleChange}
                            >
                                {SPECIALIZATIONS.map((s) => (
                                    <MenuItem key={s} value={s}>{s}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { resetForm(); setOpenAdd(false); }}>Cancel</Button>
                    <Button variant="contained" onClick={addTherapist}>Add</Button>
                </DialogActions>
            </Dialog>

            {/* ===== SCHEDULE DIALOG ===== */}
            <Dialog open={openSchedule} onClose={() => setOpenSchedule(false)} fullWidth maxWidth="md">
                <DialogTitle>
                    Schedule — {selectedTherapist?.name} ({selectedTherapist?.specialization})
                </DialogTitle>
                <DialogContent>
                    {/* Current Slots */}
                    <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>
                        <strong>Current Availability</strong>
                    </Typography>

                    {selectedTherapist?.availability?.length === 0 && (
                        <Typography color="text.secondary" sx={{ mb: 2 }}>
                            No slots added yet.
                        </Typography>
                    )}

                    <Stack spacing={1} sx={{ mb: 2 }}>
                        {selectedTherapist?.availability?.map((slot, i) => (
                            <Box key={i}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Chip label={slot.day} color="primary" variant="outlined" />
                                    {slot.date ? (
                                        <Chip label={slot.date} size="small" variant="outlined" />
                                    ) : (
                                        <Chip label="No date" size="small" color="warning" variant="filled" />
                                    )}
                                    <Typography>
                                        {slot.start} — {slot.end}
                                    </Typography>
                                    <IconButton
                                        size="small"
                                        color="primary"
                                        title="Edit date"
                                        onClick={() => {
                                            setEditSlotIndex(i);
                                            setEditDate(slot.date || "");
                                        }}
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" color="error" onClick={() => removeSlot(i)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Stack>

                                {/* Inline edit date form */}
                                {editSlotIndex === i && (
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, ml: 1 }}>
                                        <TextField
                                            label="Set Date"
                                            type="date"
                                            size="small"
                                            value={editDate}
                                            onChange={(e) => setEditDate(e.target.value)}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                        <Button size="small" variant="contained" onClick={() => updateSlotDate(i)}>
                                            Save
                                        </Button>
                                        <Button size="small" onClick={() => { setEditSlotIndex(null); setEditDate(""); }}>
                                            Cancel
                                        </Button>
                                    </Stack>
                                )}
                            </Box>
                        ))}
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    {/* Add New Slot */}
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                        <strong>Add New Slot</strong>
                    </Typography>

                    <Stack direction="row" spacing={2} alignItems="center">
                        <TextField
                            label="Date"
                            type="date"
                            value={slotForm.date}
                            onChange={(e) => {
                                const dateValue = e.target.value;
                                let autoDay = "";
                                if (dateValue) {
                                    const [year, month, day] = dateValue.split("-").map(Number);
                                    const dateObj = new Date(year, month - 1, day);
                                    autoDay = DAYS[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1];
                                }
                                setSlotForm({ ...slotForm, date: dateValue, day: autoDay });
                            }}
                            InputLabelProps={{ shrink: true }}
                        />

                        <TextField
                            label="Day"
                            value={slotForm.day}
                            disabled
                            sx={{ minWidth: 130 }}
                            InputLabelProps={{ shrink: true }}
                            placeholder="Select date first"
                        />

                        <TextField
                            label="Start Time"
                            type="time"
                            value={slotForm.start}
                            onChange={(e) => setSlotForm({ ...slotForm, start: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />

                        <TextField
                            label="End Time"
                            type="time"
                            value={slotForm.end}
                            onChange={(e) => setSlotForm({ ...slotForm, end: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />

                        <Button variant="contained" onClick={addSlot}>
                            Add Slot
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenSchedule(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* ===== THERAPISTS TABLE ===== */}
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell><strong>Name</strong></TableCell>
                        <TableCell><strong>Specialization</strong></TableCell>
                        <TableCell><strong>Phone</strong></TableCell>
                        <TableCell><strong>Slots</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell><strong>Actions</strong></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {therapists.map((t) => (
                        <TableRow key={t._id}>
                            <TableCell>{t.name}</TableCell>
                            <TableCell>
                                <Chip label={t.specialization} size="small" color="primary" variant="outlined" />
                            </TableCell>
                            <TableCell>{t.phone || "—"}</TableCell>
                            <TableCell>{t.availability?.length || 0} slots</TableCell>
                            <TableCell>
                                <Chip
                                    label={t.status}
                                    size="small"
                                    color={t.status === "active" ? "success" : "default"}
                                />
                            </TableCell>
                            <TableCell>
                                <Stack direction="row" spacing={1}>
                                    <IconButton
                                        size="small"
                                        color="primary"
                                        title="Manage Schedule"
                                        onClick={() => openScheduleDialog(t)}
                                    >
                                        <ScheduleIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        color="error"
                                        title="Delete"
                                        onClick={() => deleteTherapist(t._id)}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
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

export default Therapists;
