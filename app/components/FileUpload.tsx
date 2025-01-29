import React, { useState, useEffect, useRef } from "react";
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
} from "@mui/material";
import JSZip from "jszip";
import NodeJSImage from "../../assets/nodejs.png";
import PHPImage from "../../assets/php.png";
import GolangImage from "../../assets/golang.png";
import PythonImage from "../../assets/python.png";
import Image from "next/image";

type FileItem = {
    path: string;
    content: string;
};

export default function FileUpload() {
    const [fileContents, setFileContents] = useState<FileItem[]>([]);
    const [missingFiles, setMissingFiles] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [projectName, setProjectName] = useState<string>("");
    const [runCommand, setRunCommand] = useState<string>("node server.js");
    const [projectDialogOpen, setProjectDialogOpen] = useState(false);
    const [uploadMessage, setUploadMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);
    const [language, setLanguage] = useState<keyof typeof requiredFiles | null>(
        null
    );

    const restrictedFolders = ["node_modules"];
    const ws = useRef<WebSocket | null>(null);
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5001";
    const wsURL = BASE_URL.replace(/^https/, "wss");

    const requiredFiles = {
        nodejs: ["package.json"],
        python: ["requirements.txt"],
        golang: ["go.mod", "go.sum"],
        php: ["composer.json"],
    };

    const validateFiles = (files: FileItem[]) => {
        if (!language || !(language in requiredFiles)) return false;
        const required = requiredFiles[language];
        const missing = required.filter(
            (reqFile) => !files.some((file) => file.path === reqFile)
        );
        setMissingFiles(missing);
        return missing.length === 0;
    };

    useEffect(() => {
        const connectWebSocket = () => {
            ws.current = new WebSocket(wsURL);
            ws.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.status === "progress") {
                } else if (data.status === "success") {
                    setIsUploading(false);
                    setUploadMessage({ type: "success", text: data.message });
                    setProjectDialogOpen(false);
                } else if (data.status === "error") {
                    setIsUploading(false);
                    setUploadMessage({ type: "error", text: data.error });
                }
            };

            ws.current.onclose = () => {
                console.error("WebSocket connection closed. Retrying...");
                setTimeout(connectWebSocket, 5000);
            };

            ws.current.onerror = (error) => {
                console.error("WebSocket error:", error);
                setUploadMessage({
                    type: "error",
                    text: "WebSocket connection failed.",
                });
            };
        };

        connectWebSocket();
        return () => ws.current?.close();
    }, [wsURL]);

    const onDrop = async (acceptedFiles: File[]) => {
        setMissingFiles([]);
        setFileContents([]);
        setUploadMessage(null);

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

    const handleUpload = async () => {
        if (!fileContents || !projectName || !runCommand || !language) return;

        try {
            setIsUploading(true);
            const response = await fetch(`${BASE_URL}/upload`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectName,
                    files: fileContents,
                    runCommand,
                    language: language.toLowerCase(),
                }),
            });

            if (!response.ok) {
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
        }
    };

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        accept: { "application/zip": [".zip"] },
    });

    return (
        <Box
            sx={{
                maxWidth: 600,
                mx: "auto",
                p: 4,
                borderRadius: 3,
                boxShadow: 6,
                backgroundColor: "white",
            }}
        >
            {!language && (
                <Typography variant='h4' align='center' paddingBottom={2}>
                    Choose a Language
                </Typography>
            )}

            <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mb: 4 }}>
                {(["nodejs", "python", "golang", "php"] as const).map((lang) => (
                    <Box
                        key={lang}
                        onClick={() => setLanguage(lang)}
                        sx={{
                            width: 100,
                            height: 100,
                            borderRadius: "50%",
                            border: `4px solid ${language === lang ? "#3087c9" : "transparent"
                                }`,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            cursor: "pointer",
                            backgroundColor: "#f4f4f4",
                            "&:hover": { backgroundColor: "#e0e0e0" },
                        }}
                    >
                        <Image
                            src={
                                lang === "nodejs"
                                    ? NodeJSImage
                                    : lang === "python"
                                        ? PythonImage
                                        : lang === "golang"
                                            ? GolangImage
                                            : PHPImage
                            }
                            alt={lang}
                            width={50}
                            height={50}
                        />
                    </Box>
                ))}
            </Box>

            {language && (
                <Box>
                    <Box
                        {...getRootProps()}
                        sx={{
                            border: "2px dashed #1976d2",
                            p: 3,
                            textAlign: "center",
                            cursor: "pointer",
                            backgroundColor: "#fafafa",
                            "&:hover": { backgroundColor: "#f0f0f0" },
                        }}
                    >
                        <input {...getInputProps()} />
                        <Typography>
                            Drag & drop your project zip file here, or click to upload
                        </Typography>
                    </Box>

                    {missingFiles.length > 0 && (
                        <Alert severity='error' sx={{ mt: 2 }}>
                            Missing Files: {missingFiles.join(", ")}
                        </Alert>
                    )}

                    <Dialog
                        open={projectDialogOpen}
                        onClose={() => setProjectDialogOpen(false)}
                        fullWidth
                    >
                        <DialogTitle>
                            Enter Project Details
                        </DialogTitle>
                        <DialogContent>
                            <TextField
                                label='Project Name'
                                fullWidth
                                style={{ marginTop: 6 }}
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                sx={{ mb: 2 }}
                            />
                            <TextField
                                label='Run Command'
                                fullWidth
                                value={runCommand}
                                onChange={(e) => setRunCommand(e.target.value)}
                                placeholder='e.g., node server.js'
                                sx={{ mb: 2 }}
                            />
                            <Box
                                sx={{
                                    maxHeight: 200,
                                    overflowY: "auto",
                                    border: "1px solid #ccc",
                                    p: 2,
                                    mb: 2,
                                }}
                            >
                                <Typography variant="h6" mb={1}>
                                    Files in Zip:
                                </Typography>
                                <List>
                                    {fileContents.map((file, index) => (
                                        <ListItem key={index}>{file.path}</ListItem>
                                    ))}
                                </List>
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setProjectDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpload}
                                disabled={isUploading || !projectName}
                            >
                                {isUploading ? <CircularProgress size={20} /> : "Upload"}
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {uploadMessage && (
                        <Alert severity={uploadMessage.type} sx={{ mt: 2 }}>
                            {uploadMessage.text}
                        </Alert>
                    )}
                </Box>
            )}
        </Box>
    );
}
