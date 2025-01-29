"use client";

import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  IconButton,
} from "@mui/material";
import FileUpload from "./components/FileUpload";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import GithubImage from "../assets/github-mark.png";

export default function Home() {
  const [isServerRunning, setIsServerRunning] = useState(true);
  const BASE_URL =
    process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5001/health";

  const checkServerHealth = useCallback(async () => {
    try {
      const response = await fetch(BASE_URL);
      setIsServerRunning(response.status === 200);
    } catch {
      setIsServerRunning(false);
    }
  }, [BASE_URL]);

  useEffect(() => {
    checkServerHealth();
    const interval = setInterval(checkServerHealth, 300000);
    return () => clearInterval(interval);
  }, [checkServerHealth]);

  return (
    <Container maxWidth='md' sx={{ mt: 12, textAlign: "center" }}>
      <title>Deployify</title>

      {/* Header Section */}
      <Box sx={{ mb: 0 }}>
        <Typography variant='h3' fontWeight={700} gutterBottom>
          Deployify
        </Typography>
        <Typography
          variant='body1'
          color='text.secondary'
          sx={{ maxWidth: 600, mx: "auto" }}
        >
          Streamline your project deployments. Just upload a zip file, and we’ll
          handle the setup process for you.
        </Typography>
      </Box>

      {/* Server Status Message */}
      {!isServerRunning && (
        <Box sx={{ mb: 4 }}>
          <Typography variant='body2' color='error' fontWeight={600}>
            The server is currently unavailable. Please try again later.
          </Typography>
        </Box>
      )}

      {/* File Upload Card */}
      <Card
        sx={{
          mx: "auto",
          p: 4,
          borderRadius: 3,
          boxShadow: "0px 12px 24px rgba(0, 0, 0, 0.15)",
          maxWidth: 700,
        }}
      >
        <CardContent>
          {/* <Typography variant='h5' fontWeight={600} gutterBottom>
            Upload Your Project
          </Typography> */}
          {/* <Typography variant='body2' color='text.secondary' sx={{ mb: 4 }}>
            Drag and drop a zip file or click below to select one. Let Deployify
            simplify your deployment journey.
          </Typography> */}
          <FileUpload />
        </CardContent>
      </Card>

      {/* Footer Section */}
      <Box sx={{ mt: 8, textAlign: "center", color: "text.secondary" }}>
        <Typography variant='caption' sx={{ mb: 1, display: "block" }}>
          Made with ❤️ by Aniket Dutta. Simplifying deployments, one step at a
          time.
        </Typography>
        <IconButton
          href='https://github.com/aniketduttaAD/deployify'
          target='_blank'
          sx={{ color: "text.secondary", "&:hover": { color: "#000" } }}
        >
          <Image
            src={GithubImage}
            alt='GitHub'
            width={24}
            height={24}
            style={{ objectFit: "contain" }}
          />
        </IconButton>
      </Box>
    </Container>
  );
}
