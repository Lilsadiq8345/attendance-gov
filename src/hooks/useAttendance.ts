import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";

export const useAttendance = () => {
    const { token } = useAuth();

    const getAttendance = async () => {
        const res = await axios.get("/api/attendance/", {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.data;
    };

    const markAttendance = async (status: string) => {
        const res = await axios.post("/api/attendance/", { status }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.data;
    };

    return { getAttendance, markAttendance };
}; 