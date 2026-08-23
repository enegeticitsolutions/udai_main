import React, { useEffect, useState } from "react";
import API from "../services/api";

import {
    TextField,
    Button,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Typography
} from "@mui/material";

function Patients() {
    const [patients, setPatients] = useState([]);

    const [form, setForm] = useState({
        name: "",
        age: "",
        phone: "",
        concerns: ""
    });

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        const res = await API.get("/patients");
        setPatients(res.data);
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const addPatient = async () => {
        await API.post("/patients", form);
        setForm({ name: "", age: "", phone: "", concerns: "" });
        fetchPatients();
    };

    return (
        <div>
            <Typography variant="h4">Patients</Typography>

            <div style={{ marginTop: 20 }}>
                <TextField label="Name" name="name" onChange={handleChange} />
                <TextField label="Age" name="age" onChange={handleChange} />
                <TextField label="Phone" name="phone" onChange={handleChange} />
                <TextField label="Concern" name="concerns" onChange={handleChange} />

                <Button variant="contained" onClick={addPatient}>
                    Add Patient
                </Button>
            </div>

            <Table sx={{ mt: 3 }}>
                <TableHead>
                    <TableRow>
                        <TableCell>Code</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Age</TableCell>
                        <TableCell>Phone</TableCell>
                    </TableRow>
                </TableHead>

                <TableBody>
                    {patients.map((p) => (
                        <TableRow key={p._id}>
                            <TableCell>{p.patientCode}</TableCell>
                            <TableCell>{p.name}</TableCell>
                            <TableCell>{p.age}</TableCell>
                            <TableCell>{p.phone}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export default Patients;
