"use client";

import { Box, Container, Typography, IconButton, ThemeProvider, createTheme } from "@mui/material";
import FileUpload from "./components/FileUpload";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import GithubImage from "../assets/github-mark.png";

const theme = createTheme({
  palette: {
    primary: {
      main: '#6366F1',
      light: '#818CF8',
      dark: '#4F46E5',
    },
    secondary: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
    },
    background: {
      default: '#F9FAFB',
      paper: '#FFFFFF',
    },
    error: {
      main: '#EF4444',
    },
    warning: {
      main: '#F59E0B',
    },
    info: {
      main: '#3B82F6',
    },
    success: {
      main: '#10B981',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h3: {
      fontWeight: 800,
    },
    h5: {
      fontWeight: 700,
    },
    body1: {
      lineHeight: 1.7,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.07)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
        },
      },
    },
  },
});

export default function Home() {
  const [isServerRunning, setIsServerRunning] = useState(true);
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5002";

  const checkServerHealth = useCallback(async () => {
    try {
      const response = await fetch(`${BASE_URL}/health`);
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
    <ThemeProvider theme={theme}>
      <Container maxWidth='md' sx={{ mt: { xs: 4, md: 12 }, px: { xs: 2, md: 4 }, textAlign: "center" }}>
        <title>Deployify</title>

        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant='h3'
            gutterBottom
            sx={{
              background: 'linear-gradient(90deg, #6366F1 0%, #3B82F6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
            }}
          >
            Deployify
          </Typography>
          <Typography
            variant='body1'
            color='text.secondary'
            sx={{ maxWidth: 600, mx: "auto", mb: 3 }}
          >
            Streamline your project deployments. Just upload a zip file, and we&#39;ll
            handle the setup process for you.
          </Typography>
        </Box>

        {/* Server Status Message */}
        {!isServerRunning && (
          <Box
            sx={{
              mb: 4,
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              p: 2,
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            <Typography variant='body2' color='error' fontWeight={600}>
              The server is currently unavailable. Please try again later.
            </Typography>
          </Box>
        )}

        {/* File Upload Component */}
        <Box
          sx={{
            mx: "auto",
            maxWidth: 700,
            borderRadius: theme.shape.borderRadius,
            overflow: 'hidden',
          }}
        >
          <FileUpload />
        </Box>

        {/* Footer Section */}
        <Box sx={{ mt: 8, textAlign: "center", color: "text.secondary" }}>
          <Typography variant='caption' sx={{ mb: 1, display: "block" }}>
            Made with ❤️ by Aniket Dutta. Simplifying deployments, one step at a time.
          </Typography>
          <IconButton
            href='https://github.com/aniketduttaAD/deployify'
            target='_blank'
            sx={{
              color: "text.secondary",
              "&:hover": {
                color: "#000",
                transform: 'translateY(-2px)',
                transition: 'all 0.2s ease',
              },
              transition: 'all 0.2s ease',
            }}
          >
            <Image
              src={GithubImage}
              alt='GitHub'
              width={24}
              height={24}
              style={{ objectFit: "contain" }}
              unoptimized
            />
          </IconButton>
        </Box>
      </Container>
    </ThemeProvider>
  );
}