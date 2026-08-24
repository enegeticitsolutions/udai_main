import React from "react";
import { Grid, Card, CardContent, Typography } from "@mui/material";

function Dashboard() {
    return (
        <div>
            <Typography variant="h4">Dashboard</Typography>

            <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={4}>
                    <Card>
                        <CardContent>
                            <Typography>Total Patients</Typography>
                            <Typography variant="h5">--</Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={4}>
                    <Card>
                        <CardContent>
                            <Typography>Appointments</Typography>
                            <Typography variant="h5">--</Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={4}>
                    <Card>
                        <CardContent>
                            <Typography>Revenue</Typography>
                            <Typography variant="h5">--</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </div>
    );
}

export default Dashboard;
