'use client';

import { Box, Container, Typography, Card, CardContent } from '@mui/material';
import FileUpload from './components/FileUpload';
import { useCallback, useEffect, useState } from 'react';

export default function Home() {
  const [isServerRunning, setIsServerRunning] = useState(true);
  const BASE_URL = process.env.BASE_URL ?? "http://localhost:5001/health";

  // Function to check the health of the server
  const checkServerHealth = useCallback(async () => {
    try {
      const response = await fetch(BASE_URL);
      if (response.status === 200) {
        setIsServerRunning(true);
      } else {
        setIsServerRunning(false);
      }
    } catch (error) {
      setIsServerRunning(false);
      throw error
    }
  }, [BASE_URL]);

  useEffect(() => {
    checkServerHealth();
    const interval = setInterval(checkServerHealth, 300000);

    return () => clearInterval(interval);
  }, [checkServerHealth]);

  return (
    <Container maxWidth="md" sx={{ mt: 12, textAlign: 'center' }}>
      <title>Deployify</title>

      {/* Header Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h3" fontWeight={700} gutterBottom>
          Deployify
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
          Seamlessly deploy your projects by uploading a zip file. We’ll handle extraction, validation, and setup for you.
        </Typography>
      </Box>

      {/* Server Status Message */}
      {!isServerRunning && (
        <Box sx={{ mb: 4, color: 'red' }}>
          <Typography variant="body2" color="error" fontWeight={600}>
            Server not running. Please try again later.
          </Typography>
        </Box>
      )}

      {/* File Upload Card */}
      <Card
        sx={{
          mx: 'auto',
          p: 4,
          borderRadius: 4,
          boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.1)',
          maxWidth: 700,
        }}
      >
        <CardContent>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Upload Your Project
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Drag and drop a zip file or click to select your file. Deployify takes care of the rest.
          </Typography>
          <FileUpload />
        </CardContent>
      </Card>

      {/* Footer Section */}
      <Box sx={{ mt: 8, color: 'text.secondary' }}>
        <Typography variant="caption">
          Built with ❤️ by Deployify Team. Simplifying deployments, one project at a time.
        </Typography>
      </Box>
    </Container>
  );
}
