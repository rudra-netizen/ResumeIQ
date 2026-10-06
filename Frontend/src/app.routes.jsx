import { createBrowserRouter } from "react-router";

import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";
import GoogleSignup from "./features/auth/pages/GoogleSignup";
import Welcome from "./features/auth/pages/Welcome";
import Protected from "./features/auth/components/Protected";

import Home from "./features/interview/pages/Home";
import Interview from "./features/interview/pages/Interview";

import ResumePilot from "./features/resumePilot/components/ResumePilot";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },

  {
    path: "/register",
    element: <Register />,
  },

  {
    path: "/google-signup",
    element: <GoogleSignup />,
  },

  {
    path: "/",
    element: (
      <Protected>
        <Home />
      </Protected>
    ),
  },

  {
    path: "/interview/:interviewId",
    element: (
      <Protected>
        <Interview />
      </Protected>
    ),
  },
  {
    path: "/resume-pilot",
    element: (
      <Protected>
        <ResumePilot />
      </Protected>
    ),
  },
  {
    path: "/welcome",
    element: <Welcome />,
  },
]);
