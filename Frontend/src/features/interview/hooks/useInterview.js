import {
  getAllInterviewReports,
  generateInterviewReport,
  getInterviewReportById,
  generateResumePdf,
} from "../services/interview.api";

import { useContext, useEffect } from "react";

import { InterviewContext } from "../interview.context";
import { AuthContext } from "../../auth/auth.context";

import { useParams } from "react-router";

export const useInterview = () => {
  const interviewContext = useContext(InterviewContext);
  const authContext = useContext(AuthContext);

  const { interviewId } = useParams();

  if (!interviewContext) {
    throw new Error("useInterview must be used within an InterviewProvider");
  }

  if (!authContext) {
    throw new Error("useInterview must be used within an AuthProvider");
  }

  const { loading, setLoading, report, setReport, reports, setReports } =
    interviewContext;

  const { user } = authContext;

  const userId = user?._id || user?.id || null;

  const generateReport = async ({
    jobDescription,
    selfDescription,
    resumeFile,
  }) => {
    setLoading(true);

    try {
      const response = await generateInterviewReport({
        jobDescription,
        selfDescription,
        resumeFile,
      });

      setReport(response.interviewReport);

      // Immediately add new report to current user's history
      setReports((prevReports) => {
        const newReport = response.interviewReport;

        const alreadyExists = prevReports.some(
          (item) => item._id === newReport._id,
        );

        if (alreadyExists) {
          return prevReports;
        }

        return [newReport, ...prevReports];
      });

      return response.interviewReport;
    } catch (error) {
      console.log(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getReportById = async (interviewId) => {
    setLoading(true);

    try {
      const response = await getInterviewReportById(interviewId);

      setReport(response.interviewReport);

      return response.interviewReport;
    } catch (error) {
      console.log(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getReports = async () => {
    setLoading(true);

    try {
      const response = await getAllInterviewReports();

      setReports(response.interviewReports || []);

      return response.interviewReports || [];
    } catch (error) {
      console.log(error);

      // Do not keep old user's reports
      setReports([]);

      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getResumePdf = async (interviewReportId) => {
    setLoading(true);

    try {
      const response = await generateResumePdf({
        interviewReportId,
      });

      const url = window.URL.createObjectURL(
        new Blob([response], {
          type: "application/pdf",
        }),
      );

      const link = document.createElement("a");

      link.href = url;

      link.setAttribute("download", `resume_${interviewReportId}.pdf`);

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.log(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // User is logged out
    if (!userId) {
      setReports([]);
      setReport(null);
      setLoading(false);
      return;
    }

    // User is logged in
    if (interviewId) {
      getReportById(interviewId);
    } else {
      getReports();
    }
  }, [interviewId, userId]);

  return {
    loading,
    report,
    reports,
    generateReport,
    getReportById,
    getReports,
    getResumePdf,
  };
};
