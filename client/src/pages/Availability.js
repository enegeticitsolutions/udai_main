import React, { useEffect, useState } from "react";
import API from "../services/api";

import {
    Typography,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Card,
    CardContent,
    Grid,
    Chip,
    Stack,
    Box,
    Divider
} from "@mui/material";

import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";

const SESSION_TYPES = [
    "OT",
    "Special Educator",
    "Speech Therapist",
    "Yoga / Physical Therapist",
    "Remedial / Academic Support",
    "Counselling / Home Programme"
];

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function Availability() {
    const [sessionType, setSessionType] = useState("");
    const [therapists, setTherapists] = useState([]);

    useEffect(() => {
        if (sessionType) {
            fetchTherapists(sessionType);
        } else {
            setTherapists([]);
        }
    }, [sessionType]);

    const fetchTherapists = async (type) => {
        try {
            const res = await API.get(`/therapists/type/${encodeURIComponent(type)}`);
            setTherapists(res.data);
        } catch (err) {
            console.error("Error fetching therapists:", err);
            setTherapists([]);
        }
    };

    // Group availability slots by day for display
    const groupByDay = (availability) => {
        const grouped = {};
        (availability || []).forEach((slot) => {
            if (!grouped[slot.day]) {
                grouped[slot.day] = [];
            }
            grouped[slot.day].push(slot);
        });

        // Sort by day order
        const sorted = {};
        DAY_ORDER.forEach((day) => {
            if (grouped[day]) {
                sorted[day] = grouped[day];
            }
        });
        return sorted;
    };

    return (
        <div>
            <Typography variant="h4" sx={{ mb: 3 }}>Check Therapist Availability</Typography>

            {/* Session Type Selector */}
            <FormControl sx={{ minWidth: 300, mb: 4 }}>
                <InputLabel>Select Session Type</InputLabel>
                <Select
                    value={sessionType}
                    label="Select Session Type"
                    onChange={(e) => setSessionType(e.target.value)}
                >
                    {SESSION_TYPES.map((type) => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* No type selected */}
            {!sessionType && (
                <Typography color="text.secondary">
                    Please select a session type to view available therapists.
                </Typography>
            )}

            {/* No therapists found */}
            {sessionType && therapists.length === 0 && (
                <Typography color="text.secondary">
                    No therapists found for "{sessionType}".
                </Typography>
            )}

            {/* Therapist Cards */}
            <Grid container spacing={3}>
                {therapists.map((t) => {
                    const grouped = groupByDay(t.availability);
                    const hasSlotsSet = Object.keys(grouped).length > 0;

                    return (
                        <Grid item xs={12} sm={6} md={4} key={t._id}>
                            <Card
                                variant="outlined"
                                sx={{
                                    height: "100%",
                                    borderLeft: 4,
                                    borderColor: t.status === "active" ? "success.main" : "grey.400"
                                }}
                            >
                                <CardContent>
                                    {/* Therapist Name & Status */}
                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                        <PersonIcon color="primary" />
                                        <Typography variant="h6">{t.name}</Typography>
                                        <Chip
                                            label={t.status}
                                            size="small"
                                            color={t.status === "active" ? "success" : "default"}
                                        />
                                    </Stack>

                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        {t.specialization}
                                        {t.phone ? ` • ${t.phone}` : ""}
                                    </Typography>

                                    <Divider sx={{ mb: 2 }} />

                                    {/* Weekly Schedule */}
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        <AccessTimeIcon fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
                                        Weekly Schedule
                                    </Typography>

                                    {!hasSlotsSet && (
                                        <Typography variant="body2" color="text.secondary">
                                            No availability set yet.
                                        </Typography>
                                    )}

                                    {Object.entries(grouped).map(([day, slots]) => (
                                        <Box key={day} sx={{ mb: 1 }}>
                                            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                                                {day}
                                            </Typography>
                                            {slots.map((slot, i) => (
                                                <Typography key={i} variant="body2" color="text.secondary" sx={{ pl: 2 }}>
                                                    {slot.date ? `${slot.date} — ` : ""}{slot.start} — {slot.end}
                                                </Typography>
                                            ))}
                                        </Box>
                                    ))}
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
        </div>
    );
}

export default Availability;
