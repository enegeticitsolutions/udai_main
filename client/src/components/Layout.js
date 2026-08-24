import React from "react";
import { Link } from "react-router-dom";
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    Typography
} from "@mui/material";

import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import EventIcon from "@mui/icons-material/Event";
import PaymentIcon from "@mui/icons-material/Payment";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import ScheduleIcon from "@mui/icons-material/Schedule";

const drawerWidth = 240;

const menuItems = [
    { text: "Dashboard", path: "/", icon: <DashboardIcon /> },
    { text: "Patients", path: "/patients", icon: <PeopleIcon /> },
    { text: "Appointments", path: "/appointments", icon: <EventIcon /> },
    { text: "Payments", path: "/payments", icon: <PaymentIcon /> },
    { text: "Therapists", path: "/therapists", icon: <LocalHospitalIcon /> },
    { text: "Check Availability", path: "/availability", icon: <ScheduleIcon /> },
];

function Layout({ children }) {
    return (
        <Box sx={{ display: "flex" }}>

            {/* Sidebar */}
            <Drawer
                variant="permanent"
                sx={{
                    width: drawerWidth,
                    "& .MuiDrawer-paper": {
                        width: drawerWidth,
                        boxSizing: "border-box"
                    }
                }}
            >
                <Box sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                        Therapy Admin
                    </Typography>
                </Box>
                <Divider />

                <List>
                    {menuItems.map((item) => (
                        <ListItem
                            button
                            component={Link}
                            to={item.path}
                            key={item.text}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItem>
                    ))}
                </List>
            </Drawer>

            {/* Content */}
            <Box sx={{ flexGrow: 1, p: 3, ml: `${drawerWidth}px` }}>
                {children}
            </Box>

        </Box>
    );
}

export default Layout;
