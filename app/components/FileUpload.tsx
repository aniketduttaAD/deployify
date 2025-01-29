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
import NodeJSImage from "../../assets/nodejs.gif";
import PHPImage from "../../assets/php.gif";
import GolangImage from "../../assets/golang.gif";
import PythonImage from "../../assets/python.gif";
import ReactJSImage from "../../assets/reactjs.gif";
import NextJSImage from "../../assets/nextjs.png";
import FrontendGif from "../../assets/frontend.gif";
import BackendGif from "../../assets/backend.gif";
import Image from "next/image";
import { motion } from "framer-motion";

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
    const [selectedOption, setSelectedOption] = useState<
        "frontend" | "backend" | null
    >(null);

    const restrictedFolders = ["node_modules", "yarn.lock", "package-lock.json"];
    const ws = useRef<WebSocket | null>(null);
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5001";
    const wsURL = BASE_URL.replace(/^https/, "wss");

    const requiredFiles = {
        nodejs: ["package.json"],
        python: ["requirements.txt"],
        golang: ["go.mod", "go.sum"],
        php: ["composer.json"],
        nextjs: ["package.json"],
        reactjs: ["package.json"],
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
        if (
            !fileContents ||
            !projectName ||
            !runCommand ||
            !language ||
            !selectedOption
        )
            return;

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
                p: 3,
                borderRadius: 4,
                boxShadow: 4,
                backgroundColor: "#fff",
                transition: "box-shadow 0.3s ease",
                "&:hover": { boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.1)" },
            }}
        >
            {selectedOption === null && (
                <Typography variant='h5' align='center' sx={{ mb: 2, fontWeight: 600 }}>
                    Choose an Option
                </Typography>
            )}
            <Box sx={{ display: "flex", justifyContent: "center", gap: 4, mb: 4 }}>
                {selectedOption === null && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: selectedOption === null ? 1 : 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <Box
                                onClick={() => setSelectedOption("frontend")}
                                sx={{
                                    cursor: "pointer",
                                    textAlign: "center",
                                    width: 100,
                                    display: "inline-block",
                                    transition:
                                        "transform 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease",
                                    "&:hover": {
                                        transform: "scale(1.1)",
                                        boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
                                        backgroundColor: "#f5f5f5",
                                    },
                                }}
                            >
                                <Image
                                    src={FrontendGif}
                                    alt='Frontend'
                                    width={100}
                                    height={100}
                                />
                                <Typography>Frontend</Typography>
                            </Box>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: selectedOption === null ? 1 : 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <Box
                                onClick={() => setSelectedOption("backend")}
                                sx={{
                                    cursor: "pointer",
                                    textAlign: "center",
                                    width: 100,
                                    display: "inline-block",
                                    transition:
                                        "transform 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease",
                                    "&:hover": {
                                        transform: "scale(1.1)",
                                        boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
                                        backgroundColor: "#f5f5f5",
                                    },
                                }}
                            >
                                <Image
                                    src={BackendGif}
                                    alt='Backend'
                                    width={100}
                                    height={100}
                                />
                                <Typography sx={{ mt: 1 }}>Backend</Typography>
                            </Box>
                        </motion.div>
                    </>
                )}
            </Box>
            {selectedOption && (
                <Box>
                    <Typography
                        variant='h5'
                        align='center'
                        sx={{ mb: 2, fontWeight: 600 }}
                    >
                        Choose a Language
                    </Typography>
                    {selectedOption && (
                        <>
                            <Image
                                src={selectedOption === "backend" ? BackendGif : FrontendGif}
                                alt='Backend'
                                width={100}
                                height={100}
                                onClick={() => setSelectedOption(null)}
                            />
                            <Typography sx={{ mt: -2, mb: 2 }}>
                                {selectedOption === "backend" ? "Backend" : "Frontend"}
                            </Typography>
                        </>
                    )}
                    <Box
                        sx={{ display: "flex", justifyContent: "center", gap: 2, mb: 4 }}
                    >
                        {(
                            [
                                "nodejs",
                                "python",
                                "golang",
                                "php",
                                "reactjs",
                                "nextjs",
                            ] as const
                        ).map((lang) => {
                            const imageSrc =
                                selectedOption === "backend"
                                    ? lang === "nodejs"
                                        ? NodeJSImage
                                        : lang === "python"
                                            ? PythonImage
                                            : lang === "golang"
                                                ? GolangImage
                                                : lang === "php"
                                                    ? PHPImage
                                                    : ""
                                    : selectedOption === "frontend" &&
                                        (lang === "reactjs" || lang === "nextjs")
                                        ? lang === "reactjs"
                                            ? ReactJSImage
                                            : NextJSImage
                                        : "";
                            if (!imageSrc) return null;
                            return (
                                <motion.div
                                    key={lang}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: selectedOption ? 1 : 0 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <Box
                                        onClick={() => setLanguage(lang)}
                                        sx={{
                                            width: 90,
                                            height: 90,
                                            borderRadius: "50%",
                                            border: `2px solid ${language === lang ? "#1976d2" : "#fafafa"
                                                }`,
                                            display: "flex",
                                            justifyContent: "center",
                                            alignItems: "center",
                                            cursor: "pointer",
                                            backgroundColor: "#fff",
                                            transition:
                                                "background-color 0.3s ease, border-color 0.3s ease",
                                            "&:hover": {
                                                backgroundColor: "#e3f2fd",
                                                borderColor: "#1976d2",
                                            },
                                        }}
                                    >
                                        <Image src={imageSrc} alt={lang} width={54} height={54} />
                                    </Box>
                                </motion.div>
                            );
                        })}
                    </Box>
                </Box>
            )}
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
                            transition: "background-color 0.3s ease",
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
                        <DialogTitle>Enter Project Details</DialogTitle>
                        <DialogContent>
                            <TextField
                                label='Project Name'
                                fullWidth
                                sx={{ mb: 2, mt: 2 }}
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
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
                                <Typography variant='h6' mb={1}>
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
