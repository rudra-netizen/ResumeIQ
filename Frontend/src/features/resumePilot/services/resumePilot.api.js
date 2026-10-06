import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:3000/api",
  withCredentials: true,
});

// ======================================================
// CHAT WITH RESUME PILOT
// ======================================================

export const chatWithResumePilot = async ({
  message,
  jobDescription = "",
  reportId = "",
}) => {
  const response = await API.post("/resume-pilot", {
    message,
    jobDescription,
    reportId: reportId || undefined,
  });

  return response.data;
};

// ======================================================
// GET HISTORY
// ======================================================

export const getResumePilotHistory = async () => {
  const response = await API.get("/resume-pilot/history");

  return response.data;
};
