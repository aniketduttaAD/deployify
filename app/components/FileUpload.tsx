import React, { useEffect, useState, useRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
    Box,
    Typography,
    Button,
    TextField,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    CircularProgress,
    Alert,
    List,
    ListItem,
    LinearProgress,
    Paper,
    Chip,
    useTheme,
} from "@mui/material";
import JSZip from "jszip";
import NodeJSImage from "../../assets/nodejs.gif";
import PHPImage from "../../assets/php.gif";
import GolangImage from "../../assets/golang.gif";
import PythonImage from "../../assets/python.gif";
import ReactJSImage from "../../assets/reactjs.gif";
import NextJSImage from "../../assets/nextjs.png";
import AngularJSImage from "../../assets/angularjs.gif";
import VueJSImage from "../../assets/vuejs.gif";
import HTMLImage from "../../assets/html.gif";
import MongoDBGif from "../../assets/mongodb.gif";
import FrontendGif from "../../assets/frontend.gif";
import BackendGif from "../../assets/backend.gif";
import DatabaseGif from "../../assets/database.gif";
import Image, { StaticImageData } from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CodeIcon from '@mui/icons-material/Code';
import DoneIcon from '@mui/icons-material/Done';
import ErrorIcon from '@mui/icons-material/Error';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

// Type definitions
type FileItem = {
    path: string;
    content: string;
};

type ProgressType = {
    percentage: number;
    message: string;
};

// Component to display deployment progress from WebSocket
const DeploymentProgress = ({ progress }: { progress: ProgressType | null }) => {
    const theme = useTheme();

    if (!progress) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Paper
                elevation={3}
                sx={{
                    mb: 3,
                    mt: 2,
                    p: 2,
                    borderLeft: `4px solid ${theme.palette.primary.main}`,
                    background: 'linear-gradient(to right, rgba(99, 102, 241, 0.05), transparent)'
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <RocketLaunchIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                        <Typography variant="body1" color="primary" fontWeight={600}>
                            {progress.message}
                        </Typography>
                    </Box>
                    <Typography variant="body2" color="primary.dark" fontWeight={700} sx={{ ml: 2 }}>
                        {progress.percentage}%
                    </Typography>
                </Box>

                <Box sx={{ position: 'relative', mt: 1, mb: 1 }}>
                    <LinearProgress
                        variant="determinate"
                        value={progress.percentage}
                        sx={{
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 5,
                                backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
                            }
                        }}
                    />

                    {/* Animated pulse effect at progress edge */}
                    {/* {progress.percentage < 100 && (
                        <Box
                            component={motion.div}
                            animate={{
                                opacity: [0.7, 1, 0.7],
                                scale: [1, 1.2, 1],
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                            sx={{
                                position: 'absolute',
                                top: '-40%',
                                left: `${progress.percentage}%`,
                                transform: 'translate(-50%, -50%)',
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                bgcolor: theme.palette.primary.main,
                                zIndex: 1,
                            }}
                        />
                    )} */}
                </Box>

                {progress.percentage === 100 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <DoneIcon sx={{ color: 'success.main', mr: 1 }} />
                            <Typography variant="body2" color="success.main">
                                Deployment process completed! Finalizing...
                            </Typography>
                        </Box>
                    </motion.div>
                )}
            </Paper>
        </motion.div>
    );
};

// Component to display WebSocket connection status
const ConnectionStatusIndicator = ({ status }: { status: 'connecting' | 'connected' | 'disconnected' | null }) => {
    if (!status) return null;

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Chip
                size="small"
                label={status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Disconnected'}
                color={status === 'connected' ? 'success' : status === 'connecting' ? 'warning' : 'error'}
                sx={{ fontSize: '0.7rem', height: 24 }}
            />
        </Box>
    );
};

export default function FileUpload() {
    const theme = useTheme();
    const [fileContents, setFileContents] = useState<FileItem[]>([]);
    const [missingFiles, setMissingFiles] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [projectName, setProjectName] = useState<string>("");
    const [runCommand, setRunCommand] = useState<string>("");
    const [projectDialogOpen, setProjectDialogOpen] = useState(false);
    const [uploadMessage, setUploadMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);
    const [language, setLanguage] = useState<keyof typeof requiredFiles | null>(
        null
    );
    const [selectedOption, setSelectedOption] = useState<
        "frontend" | "backend" | "database" | null
    >(null);
    const [progress, setProgress] = useState<ProgressType | null>(null);
    const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const [lastMessageTimestamp, setLastMessageTimestamp] = useState<number>(0);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | null>(null);

    const restrictedFolders = ["node_modules", "yarn.lock", "package-lock.json"];
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5002";

    const requiredFiles = {
        nodejs: ["package.json"],
        python: ["requirements.txt"],
        golang: ["go.mod", "go.sum"],
        php: ["composer.json"],
        nextjs: ["package.json"],
        reactjs: ["package.json"],
        angularjs: ["package.json"],
        vuejs: ["package.json"],
        html: ["index.html"],
        mongodb: [],
    };

    const languages = [
        "nodejs",
        "python",
        "golang",
        "php",
        "reactjs",
        "nextjs",
        "vuejs",
        "angularjs",
        "html",
        "mongodb",
    ] as const;

    // Generate a unique session ID for WebSocket connection
    useEffect(() => {
        if (!sessionIdRef.current) {
            sessionIdRef.current = Math.random().toString(36).substring(2, 15);
        }
    }, []);

    // Setup default run command based on language
    useEffect(() => {
        if (language) {
            switch (language) {
                case "nodejs":
                    setRunCommand("node server.js");
                    break;
                case "python":
                    setRunCommand("python manage.py runserver 0.0.0.0:8000");
                    break;
                case "php":
                    setRunCommand("php -S 0.0.0.0:8000");
                    break;
                case "golang":
                    setRunCommand("go run main.go");
                    break;
                default:
                    setRunCommand("");
            }
        }
    }, [language]);

    // Initialize WebSocket connection 
    const initWebSocket = useCallback(() => {
        if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
            return;
        }

        setConnectionStatus('connecting');

        const wsUrl = `${BASE_URL.replace(/^http/, 'ws')}/ws/${sessionIdRef.current}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('WebSocket connected');
            setConnectionStatus('connected');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setProgress({
                    percentage: data.percentage || 0,
                    message: data.message || "Processing..."
                });
                setLastMessageTimestamp(Date.now());
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            setConnectionStatus('disconnected');
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            setConnectionStatus('disconnected');
        };

        wsRef.current = ws;
    }, [BASE_URL]);

    // Check for stale WebSocket connection
    useEffect(() => {
        const interval = setInterval(() => {
            if (isUploading && lastMessageTimestamp > 0) {
                const timeSinceLastMessage = Date.now() - lastMessageTimestamp;
                if (timeSinceLastMessage > 15000) { // 15 seconds without a message
                    console.log('WebSocket connection might be stale, attempting to reconnect');
                    if (wsRef.current) {
                        wsRef.current.close();
                        wsRef.current = null;
                    }
                    initWebSocket();
                }
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [initWebSocket, isUploading, lastMessageTimestamp]);

    // Clean up WebSocket connection
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, []);

    const validateFiles = (files: FileItem[]) => {
        if (!language || !(language in requiredFiles)) return false;
        const required = requiredFiles[language];
        const missing = required.filter(
            (reqFile) => !files.some((file) => file.path === reqFile)
        );
        setMissingFiles(missing);
        return missing.length === 0;
    };

    const onDrop = async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        setMissingFiles([]);
        setFileContents([]);
        setUploadMessage(null);
        setProgress(null);
        setDeploymentUrl(null);
        setFileName(acceptedFiles[0].name);

        const zip = new JSZip();

        try {
            const file = acceptedFiles[0];
            const data = await file.arrayBuffer();
            const contents = await zip.loadAsync(data);

            const files: FileItem[] = [];

            await Promise.all(
                Object.keys(contents.files).map(async (fileName) => {
                    if (!fileName.startsWith("__MACOSX") && !fileName.startsWith("._")) {
                        if (
                            !restrictedFolders.some((folder) => fileName.includes(folder))
                        ) {
                            const fileContent = await contents.files[fileName].async(
                                "base64"
                            );
                            files.push({ path: fileName, content: fileContent });
                        }
                    }
                })
            );

            setFileContents(files);
            if (validateFiles(files)) {
                setProjectDialogOpen(true);
            }
        } catch (err) {
            console.error("Error extracting zip file:", err);
            setUploadMessage({
                type: "error",
                text: "Invalid or corrupted zip file.",
            });
        }
    };

    useEffect(() => {
        if (language === "mongodb") {
            setProjectDialogOpen(true);
        }
    }, [language]);

    const resetForm = () => {
        setFileContents([]);
        setMissingFiles([]);
        setSelectedOption(null);
        setLanguage(null);
        setProjectName("");
        setRunCommand("");
        setUploadMessage(null);
        setProgress(null);
        setDeploymentUrl(null);
        setFileName(null);
        setLastMessageTimestamp(0);
        setConnectionStatus(null);

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    };

    const handleUpload = async () => {
        if (!language) {
            return;
        }
        if (
            (language === "mongodb" && !projectName) ||
            (["nextjs", "reactjs", "vuejs", "angularjs", "html"].includes(language) &&
                (!projectName || !fileContents.length)) ||
            (!["mongodb", "nextjs", "reactjs", "vuejs", "angularjs", "html"].includes(
                language
            ) &&
                (!projectName || !fileContents.length || !runCommand || !selectedOption))
        ) {
            return;
        }

        // Initialize WebSocket before starting upload
        initWebSocket();

        // Close the modal immediately when deploy button is clicked
        setProjectDialogOpen(false);

        const bodyData: {
            projectName: string;
            language: string;
            files?: FileItem[];
            runCommand?: string;
        } = {
            projectName: projectName.toLowerCase().trim(),
            language: language.toLowerCase(),
        };

        if (
            ["nextjs", "reactjs", "vuejs", "angularjs", "html"].includes(language)
        ) {
            bodyData.files = fileContents;
        } else if (!["mongodb"].includes(language)) {
            bodyData.files = fileContents;
            bodyData.runCommand = runCommand;
        }

        try {
            setIsUploading(true);
            setProgress({ percentage: 0, message: "Starting deployment..." });
            setLastMessageTimestamp(Date.now());

            const response = await fetch(`${BASE_URL}/upload?sessionId=${sessionIdRef.current}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyData),
            });

            if (response.ok) {
                const responseData = await response.json();
                console.log(responseData);

                if (responseData.url) {
                    setDeploymentUrl(responseData.url);
                }

                if (language === "mongodb") {
                    setUploadMessage({
                        type: "success",
                        text: responseData.message || "Database created successfully",
                    });
                    // Store details for MongoDB deployment
                    setDeploymentUrl(responseData.mongoExpressUrl);
                } else {
                    setUploadMessage({
                        type: "success",
                        text: responseData.message || "Deployment successful",
                    });
                }
            } else {
                const errorData = await response.json();
                setUploadMessage({
                    type: "error",
                    text: errorData.error || "Upload failed.",
                });
            }
        } catch (error) {
            console.error("Error during upload:", error);
            setUploadMessage({
                type: "error",
                text: "Upload failed. Please try again.",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        accept: { "application/zip": [".zip"] },
        disabled: isUploading,
    });

    const OptionBox = ({ title, image, onClick }: { title: string, image: StaticImageData, onClick: () => void }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <Paper
                elevation={2}
                onClick={onClick}
                sx={{
                    cursor: 'pointer',
                    textAlign: 'center',
                    width: 120,
                    height: 160,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#fff',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: 2,
                    p: 2,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 12px 20px rgba(0, 0, 0, 0.1)',
                        backgroundColor: '#FAFAFA',
                        borderColor: theme.palette.primary.light,
                    },
                }}
            >
                <Box sx={{ mb: 2, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Image
                        src={image}
                        alt={title}
                        width={70}
                        height={70}
                        unoptimized
                    />
                </Box>
                <Typography sx={{ fontWeight: 600, color: theme.palette.text.secondary }}>{title}</Typography>
            </Paper>
        </motion.div>
    );

    const LanguageBox = ({ lang, image }: { lang: string, image: StaticImageData }) => (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
        >
            <Paper
                elevation={language === lang ? 3 : 1}
                onClick={() => setLanguage(lang as never)}
                sx={{
                    width: 90,
                    height: 90,
                    borderRadius: '12px',
                    border: `2px solid ${language === lang ? theme.palette.primary.main : 'transparent'}`,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'pointer',
                    backgroundColor: '#fff',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        transform: 'scale(1.05)',
                        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
                        borderColor: theme.palette.primary.light,
                        backgroundColor: '#fafafa',
                    },
                }}
            >
                <Image
                    src={image}
                    alt={lang}
                    width={54}
                    height={54}
                    unoptimized
                />
            </Paper>
        </motion.div>
    );

    return (
        <Box
            sx={{
                width: '100%',
                p: { xs: 2, md: 6 },
                position: 'relative',
                margin: 0
            }}
        >
            {/* Header with option to reset flow */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant='h5' sx={{
                    fontWeight: 700,
                    color: theme.palette.primary.main,
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    {/* {selectedOption && (
                        <IconButton
                            onClick={() => {
                                setSelectedOption(null);
                                setLanguage(null);
                            }}
                            sx={{ mr: 1, color: theme.palette.primary.main }}
                            disabled={isUploading}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                    )} */}
                    {selectedOption ? `${selectedOption.charAt(0).toUpperCase() + selectedOption.slice(1)} Deployment` : 'Choose Deployment Type'}
                </Typography>

                {(selectedOption || language || fileContents.length > 0) && (
                    <Button
                        startIcon={<RestartAltIcon />}
                        variant="outlined"
                        color="primary"
                        size="small"
                        onClick={resetForm}
                        sx={{ textTransform: 'none' }}
                        disabled={isUploading}
                    >
                        Reset
                    </Button>
                )}
            </Box>

            {/* WebSocket connection status indicator */}
            <ConnectionStatusIndicator status={connectionStatus} />

            {/* Progress indicator during deployment */}
            <AnimatePresence>
                <DeploymentProgress progress={progress} />
            </AnimatePresence>

            {/* Deployment type selection */}
            {!selectedOption && !language && (
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap', mb: 4 }}>
                    <OptionBox
                        title="Frontend"
                        image={FrontendGif}
                        onClick={() => setSelectedOption("frontend")}
                    />
                    <OptionBox
                        title="Backend"
                        image={BackendGif}
                        onClick={() => setSelectedOption("backend")}
                    />
                    <OptionBox
                        title="Database"
                        image={DatabaseGif}
                        onClick={() => setSelectedOption("database")}
                    />
                </Box>
            )}

            {/* Language selection */}
            {selectedOption && !language && (
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 2, md: 3 }, flexWrap: 'wrap', mb: 4 }}>
                        {languages.map((lang) => {
                            let imageSrc: string | StaticImageData | null = null;

                            if (selectedOption === "backend") {
                                if (lang === "nodejs") imageSrc = NodeJSImage;
                                else if (lang === "python") imageSrc = PythonImage;
                                else if (lang === "golang") imageSrc = GolangImage;
                                else if (lang === "php") imageSrc = PHPImage;
                            } else if (selectedOption === "frontend") {
                                if (lang === "reactjs") imageSrc = ReactJSImage;
                                else if (lang === "nextjs") imageSrc = NextJSImage;
                                else if (lang === "angularjs") imageSrc = AngularJSImage;
                                else if (lang === "vuejs") imageSrc = VueJSImage;
                                else if (lang === "html") imageSrc = HTMLImage;
                            } else if (selectedOption === "database") {
                                if (lang === "mongodb") imageSrc = MongoDBGif;
                            }

                            if (!imageSrc) return null;

                            return (
                                <LanguageBox
                                    key={lang}
                                    lang={lang}
                                    image={imageSrc}
                                />
                            );
                        })}
                    </Box>
                </Box>
            )}

            {/* File upload area - only show when not uploading */}
            {language && language !== "mongodb" && !isUploading && !uploadMessage && (
                <Box sx={{ mt: 3 }}>
                    <Box
                        {...getRootProps()}
                        sx={{
                            border: `2px dashed ${theme.palette.primary.main}`,
                            borderRadius: 0,
                            p: 4,
                            textAlign: 'center',
                            cursor: 'pointer',
                            backgroundColor: 'rgba(99, 102, 241, 0.04)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                                borderColor: theme.palette.primary.dark
                            },
                            mb: 3
                        }}
                    >
                        <input {...getInputProps()} />
                        <motion.div
                            animate={{
                                y: [0, -5, 0],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        >
                            <CloudUploadIcon sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 2 }} />
                        </motion.div>
                        <Typography variant="h6" gutterBottom color="primary" fontWeight={600}>
                            {fileName ? fileName : "Drag & drop your project zip file here"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            or click to select file
                        </Typography>
                    </Box>

                    {missingFiles.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Alert
                                severity="error"
                                sx={{
                                    mt: 2,
                                    mb: 2,
                                    borderRadius: 0,
                                    alignItems: 'flex-start'
                                }}
                                icon={<ErrorIcon fontSize="inherit" />}
                            >
                                <Typography fontWeight={600}>Missing Required Files:</Typography>
                                <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                                    {missingFiles.map((file, index) => (
                                        <motion.li
                                            key={index}
                                            initial={{ opacity: 0, x: -5 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.2, delay: index * 0.1 }}
                                        >
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace', display: 'flex', alignItems: 'center' }}>
                                                <CodeIcon sx={{ fontSize: 14, mr: 0.5 }} />
                                                {file}
                                            </Typography>
                                        </motion.li>
                                    ))}
                                </Box>
                            </Alert>
                        </motion.div>
                    )}
                </Box>
            )}

            {/* Project details dialog */}
            <Dialog
                open={projectDialogOpen}
                onClose={() => !isUploading && setProjectDialogOpen(false)}
                fullWidth
                maxWidth="md"
                PaperProps={{
                    sx: {
                        borderRadius: 0,
                        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)'
                    }
                }}
            >
                <DialogTitle sx={{
                    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                    pb: 2,
                    backgroundColor: theme.palette.primary.main,
                    color: 'white',
                }}>
                    Enter {language === 'mongodb' ? 'Database' : 'Project'} Details
                </DialogTitle>
                <DialogContent sx={{ pt: 3, mt: 1 }}>
                    <TextField
                        label={language === 'mongodb' ? 'Database Name' : 'Project Name'}
                        fullWidth
                        sx={{ mb: 3, mt: 1 }}
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        variant="outlined"
                        InputProps={{
                            sx: { borderRadius: 0 }
                        }}
                        placeholder={language === 'mongodb' ? 'my-mongodb' : 'my-project'}
                        focused
                    />
                    {![
                        "mongodb",
                        "nextjs",
                        "reactjs",
                        "vuejs",
                        "angularjs",
                        "html",
                    ].includes(language || '') && (
                            <TextField
                                label='Run Command'
                                fullWidth
                                value={runCommand}
                                onChange={(e) => setRunCommand(e.target.value)}
                                placeholder='e.g., node server.js'
                                sx={{ mb: 3 }}
                                variant="outlined"
                                InputProps={{
                                    sx: { borderRadius: 0 }
                                }}
                            />
                        )}
                    {language !== "mongodb" && fileContents.length > 0 && (
                        <Box
                            sx={{
                                maxHeight: 300,
                                overflowY: "auto",
                                border: '1px solid rgba(0, 0, 0, 0.1)',
                                borderRadius: 0,
                                p: 2,
                                mb: 2,
                                backgroundColor: 'rgba(0, 0, 0, 0.02)'
                            }}
                        >
                            <Typography variant='subtitle1' mb={1} fontWeight={600}>
                                Files in Project ({fileContents.length})
                            </Typography>
                            <List dense>
                                {fileContents.map((file, index) => (
                                    <ListItem key={index} sx={{ py: 0.5, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{file.path}</Typography>
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(0, 0, 0, 0.1)' }}>
                    <Button
                        onClick={() => setProjectDialogOpen(false)}
                        disabled={isUploading}
                        sx={{
                            color: theme.palette.text.secondary,
                            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.05)' },
                            borderRadius: 0
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleUpload}
                        disabled={isUploading || !projectName.trim()}
                        sx={{
                            minWidth: 120,
                            background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                            '&:hover': {
                                background: `linear-gradient(90deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                            },
                            borderRadius: 0
                        }}
                    >
                        {isUploading ? (
                            <CircularProgress size={24} color="inherit" />
                        ) : language !== "mongodb" ? (
                            "Deploy Project"
                        ) : (
                            "Create Database"
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Deployment results - simplified version */}
            {uploadMessage && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Paper
                        elevation={3}
                        sx={{
                            mt: 3,
                            p: 3,
                            borderRadius: 0,
                            border: `2px solid ${uploadMessage.type === 'success'
                                ? theme.palette.success.light
                                : theme.palette.error.light}`
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" color={uploadMessage.type === 'success' ? 'success.main' : 'error.main'} fontWeight={600}>
                                {uploadMessage.type === 'success' ? 'Deployment Successful' : 'Deployment Failed'}
                            </Typography>
                            {uploadMessage.type === 'success' && (
                                <Chip
                                    label="LIVE"
                                    size="small"
                                    color="success"
                                    sx={{ ml: 2, borderRadius: 1 }}
                                />
                            )}
                        </Box>

                        {/* Only show error message text */}
                        {uploadMessage.type === 'error' && (
                            <Typography sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                                {uploadMessage.text}
                            </Typography>
                        )}

                        {/* Direct link display for successful deployment */}
                        {uploadMessage.type === 'success' && deploymentUrl && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                            >
                                <Box>
                                    <Typography variant="subtitle1" gutterBottom color="text.secondary" fontWeight={500}>
                                        Your application is available at:
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        color="primary"
                                        href={deploymentUrl}
                                        target="_blank"
                                        sx={{
                                            textTransform: 'none',
                                            mt: 1,
                                            borderRadius: 0,
                                            borderWidth: 2,
                                            '&:hover': {
                                                borderWidth: 2,
                                                backgroundColor: 'rgba(99, 102, 241, 0.08)'
                                            }
                                        }}
                                    >
                                        {deploymentUrl}
                                    </Button>
                                </Box>
                            </motion.div>
                        )}

                        {language === 'mongodb' && uploadMessage.type === 'success' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                            >
                                <Alert severity="info" sx={{ mt: 3, borderRadius: 0 }}>
                                    <Typography variant="body2" fontWeight={600}>
                                        Copy these credentials - they won&apos;t be shown again!
                                    </Typography>
                                </Alert>
                            </motion.div>
                        )}
                    </Paper>
                </motion.div>
            )}
        </Box>
    );
}