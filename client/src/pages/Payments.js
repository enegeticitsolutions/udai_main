import React, { useState } from "react";
import API from "../services/api";

import { TextField, Button } from "@mui/material";

function Payments() {
    const [form, setForm] = useState({
        patientId: "",
        amount: "",
        totalSessions: ""
    });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const addPayment = async () => {
        await API.post("/payments", {
            ...form,
            type: "package"
        });
        alert("Payment added");
    };

    return (
        <div>
            <h2>Add Payment</h2>

            <TextField name="patientId" label="Patient ID" onChange={handleChange} />
            <TextField name="amount" label="Amount" onChange={handleChange} />
            <TextField name="totalSessions" label="Sessions" onChange={handleChange} />

            <Button onClick={addPayment}>Submit</Button>
        </div>
    );
}

export default Payments;
