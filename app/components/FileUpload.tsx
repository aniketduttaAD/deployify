'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle, CircularProgress, Alert } from '@mui/material';
import JSZip from 'jszip';

type FileItem = {
    path: string;
    content: string;
};

export default function FileUpload() {
    const [fileContents, setFileContents] = useState<FileItem[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [projectName, setProjectName] = useState<string>('');
    const [runCommand, setRunCommand] = useState<string>('node server.js');
    const [projectDialogOpen, setProjectDialogOpen] = useState(false);
    const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const restrictedFolders = ['node_modules'];
    const ws = useRef<WebSocket | null>(null);
    const BASE_URL = process.env.BASE_URL ?? "http://localhost:5001";
    const wsURL = BASE_URL.replace(/^https/, 'wss');

    // WebSocket Initialization and Cleanup
    useEffect(() => {
        const connectWebSocket = () => {
            ws.current = new WebSocket(wsURL);
            ws.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.status === 'progress') {
                    setUploadProgress(data.progress);
                } else if (data.status === 'success') {
                    setIsUploading(false);
                    setUploadProgress(null);
                    setUploadMessage({ type: 'success', text: data.message });
                    setProjectDialogOpen(false);
                } else if (data.status === 'error') {
                    setIsUploading(false);
                    setUploadProgress(null);
                    setUploadMessage({ type: 'error', text: data.error });
                }
            };

            ws.current.onclose = () => {
                console.error('WebSocket connection closed. Retrying...');
                setTimeout(connectWebSocket, 5000); // Retry after 5 seconds
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                // setUploadMessage({ type: 'error', text: 'WebSocket connection failed.' });
            };
        };

        connectWebSocket();

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [wsURL]);

    // Handle file drop and extract zip contents
    const onDrop = async (acceptedFiles: File[]) => {
        setErrors([]);
        setFileContents([]);
        setUploadMessage(null);
        const zip = new JSZip();

        try {
            const file = acceptedFiles[0];
            const data = await file.arrayBuffer();
            const contents = await zip.loadAsync(data);

            const files: FileItem[] = [];
            const fileErrors: string[] = [];

            await Promise.all(
                Object.keys(contents.files).map(async (fileName) => {
                    if (!fileName.startsWith('__MACOSX') && !fileName.startsWith('._')) {
                        if (restrictedFolders.some((folder) => fileName.includes(folder))) {
                            fileErrors.push(fileName);
                        } else {
                            const fileContent = await contents.files[fileName].async('base64');
                            files.push({ path: fileName, content: fileContent });
                        }
                    }
                })
            );

            if (fileErrors.length > 0) {
                setErrors(fileErrors);
                return;
            }

            setFileContents(files);
            setProjectDialogOpen(true);
        } catch (err) {
            console.error('Error extracting zip file:', err);
            setErrors(['Invalid or corrupted zip file.']);
        }
    };

    // Handle upload button click
    const handleUpload = async () => {
        if (!fileContents || !projectName || !runCommand) return;

        try {
            setIsUploading(true);

            const response = await fetch('http://localhost:5001/projects/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectName,
                    files: fileContents,
                    runCommand,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                setUploadMessage({ type: 'error', text: errorData.error || 'Upload failed.' });
            }
        } catch (error) {
            console.error('Error during upload:', error);
            setUploadMessage({ type: 'error', text: 'Upload failed. Please try again.' });
        }
    };

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        accept: {
            'application/zip': ['.zip'],
        },
    });

    return (
        <Box>
            <Box
                {...getRootProps()}
                sx={{
                    border: '2px dashed #1976d2',
                    padding: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    marginBottom: 2,
                }}
            >
                <input {...getInputProps()} />
                <Typography variant="body1">Drag & drop a zip file here, or click to upload</Typography>
            </Box>

            {errors.length > 0 && (
                <Box sx={{ color: 'red', mb: 2 }}>
                    <Typography variant="body2">Restricted files found:</Typography>
                    <ul>
                        {errors.map((file, index) => (
                            <li key={index}>{file}</li>
                        ))}
                    </ul>
                    <Typography variant="body2">Please remove these files and try again.</Typography>
                </Box>
            )}

            {fileContents.length > 0 && (
                <Dialog open={projectDialogOpen} onClose={() => setProjectDialogOpen(false)} fullWidth maxWidth="md">
                    <DialogTitle>
                        Enter Project Details
                        <TextField
                            sx={{ mt: 2 }}
                            label="Project Name"
                            fullWidth
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                        />
                        <TextField
                            sx={{ mt: 2 }}
                            label="Run Command"
                            fullWidth
                            value={runCommand}
                            onChange={(e) => setRunCommand(e.target.value)}
                            placeholder="e.g., node server.js"
                        />
                    </DialogTitle>
                    <DialogContent dividers sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
                        <Typography variant="body2">File Structure:</Typography>
                        <ul>
                            {fileContents.map((file, index) => (
                                <li key={index}>{file.path}</li>
                            ))}
                        </ul>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setProjectDialogOpen(false)}>Cancel</Button>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleUpload}
                            disabled={isUploading || !projectName || errors.length > 0}
                        >
                            {isUploading ? (
                                <>
                                    <CircularProgress size={20} sx={{ marginRight: 1 }} />
                                    Uploading...
                                </>
                            ) : (
                                'Upload'
                            )}
                        </Button>
                    </DialogActions>
                </Dialog>
            )}

            {uploadProgress !== null && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                    <CircularProgress variant="determinate" value={uploadProgress} />
                    <Typography variant="body2" sx={{ ml: 2 }}>
                        {uploadProgress}%
                    </Typography>
                </Box>
            )}

            {uploadMessage && (
                <Alert severity={uploadMessage.type} sx={{ mt: 2 }}>
                    {uploadMessage.text}
                </Alert>
            )}
        </Box>
    );
}
