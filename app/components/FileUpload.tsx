import React, { useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle, CircularProgress, Alert } from '@mui/material';
import JSZip from 'jszip';
import NodeJSImage from '../../assets/nodejs.png';
import PHPImage from '../../assets/php.png';
import GolangImage from '../../assets/golang.png';
import PythonImage from '../../assets/python.png';
import Image from 'next/image';

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
    const [language, setLanguage] = useState<string | null>(null);

    const restrictedFolders = ['node_modules'];
    const ws = useRef<WebSocket | null>(null);
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5001";
    const wsURL = BASE_URL.replace(/^https/, 'wss');

    const validateFiles = (files: FileItem[]) => {
        switch (language) {
            case 'nodejs':
                return files.some(file => file.path === 'package.json');
            case 'python':
                return files.some(file => file.path === 'requirements.txt');
            case 'golang':
                return files.some(file => file.path === 'go.mod') && files.some(file => file.path === 'go.sum');
            case 'php':
                return files.some(file => file.path === 'composer.json');
            default:
                return false;
        }
    };

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
                setUploadMessage({ type: 'error', text: 'WebSocket connection failed.' });
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
            if (validateFiles(files)) {
                setProjectDialogOpen(true);
            } else {
                setErrors(['Missing required files for the selected language.']);
            }
        } catch (err) {
            console.error('Error extracting zip file:', err);
            setErrors(['Invalid or corrupted zip file.']);
        }
    };

    // Handle upload button click
    const handleUpload = async () => {
        if (!fileContents || !projectName || !runCommand || !language) return;

        try {
            setIsUploading(true);

            const response = await fetch(`${BASE_URL}/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectName,
                    files: fileContents,
                    runCommand,
                    language: language.toLowerCase(),
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
        <Box sx={{ maxWidth: 600, margin: '0 auto', padding: 4, borderRadius: 3, boxShadow: 6, backgroundColor: 'white', overflow: 'hidden' }}>

            {!language && <Typography variant="h4" sx={{ fontWeight: 700, textAlign: 'center', mb: 4, color: '#333' }}>Choose a Language</Typography>}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4, gap: 2 }}>
                {['nodejs', 'python', 'golang', 'php'].map((lang) => (
                    <Box
                        key={lang}
                        sx={{
                            borderRadius: '50%',
                            width: 110,
                            height: 110,
                            padding: 3,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: '#f4f4f4',
                            border: language === lang ? '4px solid #3087c9' : '2px solid transparent',
                            boxShadow: `0 4px 12px rgba(0, 0, 0, 0.1)`,
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                backgroundColor: '#e0e0e0',
                                transform: 'scale(1.1)',
                            },
                        }}
                        onClick={() => setLanguage(lang)}
                    >
                        <Image
                            src={lang === 'nodejs' ? NodeJSImage : lang === 'python' ? PythonImage : lang === 'golang' ? GolangImage : PHPImage}
                            alt={lang}
                            width={75}
                            height={75}
                            style={{ objectFit: 'contain', backgroundColor: 'transparent' }}
                        />
                    </Box>
                ))}
            </Box>

            {language && (
                <Box>
                    <Box
                        {...getRootProps()}
                        sx={{
                            border: '2px dashed #1976d2',
                            padding: '40px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            marginBottom: 3,
                            borderRadius: 2,
                            backgroundColor: '#fafafa',
                            transition: 'background-color 0.3s ease',
                            '&:hover': { backgroundColor: '#f0f0f0' },
                        }}
                    >
                        <input {...getInputProps()} />
                        <Typography variant="body1" sx={{ fontWeight: 500, color: '#555' }}>Drag & drop a zip file here, or click to upload</Typography>
                    </Box>

                    {errors.length > 0 && (
                        <Box sx={{ color: 'red', mb: 3 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Error(s) found:</Typography>
                            <ul>
                                {errors.map((file, index) => (
                                    <li key={index}>{file}</li>
                                ))}
                            </ul>
                            <Typography variant="body2">Please fix the errors and try again.</Typography>
                        </Box>
                    )}

                    {fileContents.length > 0 && (
                        <Dialog open={projectDialogOpen} onClose={() => setProjectDialogOpen(false)} fullWidth maxWidth="sm">
                            <DialogTitle sx={{ fontWeight: 600, color: '#1976d2' }}>Enter Project Details</DialogTitle>
                            <DialogContent dividers sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                <TextField
                                    label="Project Name"
                                    fullWidth
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    sx={{
                                        mb: 2,
                                        backgroundColor: '#f9f9f9',
                                        borderRadius: 1,
                                        '& .MuiOutlinedInput-root': {
                                            '& fieldset': {
                                                borderColor: '#ccc',
                                            },
                                        },
                                    }}
                                />
                                <TextField
                                    label="Run Command"
                                    fullWidth
                                    value={runCommand}
                                    onChange={(e) => setRunCommand(e.target.value)}
                                    placeholder="e.g., node server.js"
                                    sx={{
                                        mb: 2,
                                        backgroundColor: '#f9f9f9',
                                        borderRadius: 1,
                                        '& .MuiOutlinedInput-root': {
                                            '& fieldset': {
                                                borderColor: '#ccc',
                                            },
                                        },
                                    }}
                                />
                                <Typography variant="body2" sx={{ fontWeight: 500, color: '#444' }}>File Structure:</Typography>
                                <ul>
                                    {fileContents.map((file, index) => (
                                        <li key={index}>{file.path}</li>
                                    ))}
                                </ul>
                            </DialogContent>
                            <DialogActions>
                                <Button
                                    onClick={() => setProjectDialogOpen(false)}
                                    sx={{
                                        backgroundColor: '#e0e0e0',
                                        '&:hover': { backgroundColor: '#ccc' },
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleUpload}
                                    disabled={isUploading || !projectName || errors.length > 0}
                                    sx={{
                                        backgroundColor: '#1976d2',
                                        '&:hover': {
                                            backgroundColor: '#1565c0',
                                        },
                                    }}
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
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 3 }}>
                            <CircularProgress variant="determinate" value={uploadProgress} sx={{ color: '#1976d2' }} />
                            <Typography variant="body2" sx={{ ml: 2 }}>
                                {uploadProgress}%
                            </Typography>
                        </Box>
                    )}

                    {uploadMessage && (
                        <Alert severity={uploadMessage.type} sx={{ mt: 3 }}>
                            {uploadMessage.text}
                        </Alert>
                    )}
                </Box>
            )}
        </Box>
    );
}
