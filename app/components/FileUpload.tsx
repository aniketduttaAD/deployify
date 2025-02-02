import React, { useEffect, useState } from "react";
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
import AngularJSImage from "../../assets/angularjs.gif";
import VueJSImage from "../../assets/vuejs.gif";
import HTMLImage from "../../assets/html.gif";
import MongoDBGif from "../../assets/mongodb.gif";
import FrontendGif from "../../assets/frontend.gif";
import BackendGif from "../../assets/backend.gif";
import DatabaseGif from "../../assets/database.gif";
import Image, { StaticImageData } from "next/image";
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
        "frontend" | "backend" | "database" | null
    >(null);

    const restrictedFolders = ["node_modules", "yarn.lock", "package-lock.json"];
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5001";

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

    useEffect(() => {
        if (language === "mongodb") {
            setProjectDialogOpen(true);
        }
    }, [language]);

    const handleUpload = async () => {
        if (!language) {
            return;
        }
        if (
            (language === "mongodb" && !projectName) ||
            (
                ["nextjs", "reactjs", "vuejs", "angularjs", "html"].includes(language) &&
                (!projectName || !fileContents)
            ) ||
            (
                !["mongodb", "nextjs", "reactjs", "vuejs", "angularjs", "html"].includes(language) &&
                (!projectName || !fileContents || !runCommand || !selectedOption)
            )
        ) {
            return;
        }

        const bodyData: {
            projectName: string;
            language: string;
            files?: unknown;
            runCommand?: string;
        } = {
            projectName: projectName.toLowerCase(),
            language: language.toLowerCase(),
        };

        if (["nextjs", "reactjs", "vuejs", "angularjs", "html"].includes(language)) {
            bodyData.files = fileContents;
        } else if (!["mongodb"].includes(language)) {
            bodyData.files = fileContents;
            bodyData.runCommand = runCommand;
        }

        try {
            setIsUploading(true);
            const response = await fetch(`${BASE_URL}/upload`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyData),
            });

            if (response.ok) {
                const responseData = await response.json();
                const successMessage = responseData.message || "Upload successful";

                if (language === "mongodb") {
                    const mongodbDetails = `
                    MongoDB URL: ${responseData.mongodbUrl}
                    Mongo Express URL: ${responseData.mongoExpressUrl}
                    Username: ${responseData.username}
                    Password: ${responseData.password}
                `;
                    const successMessageWithDetails = `${successMessage}\n${mongodbDetails}`;

                    const formattedMessage = successMessageWithDetails
                        .split("\n")
                        .map((item, index) => (
                            <span key={index}>
                                {item}
                                <br />
                            </span>
                        ));
                    setUploadMessage({
                        type: "success",
                        text: String(formattedMessage),
                    });
                } else {
                    setUploadMessage({
                        type: "success",
                        text: successMessage,
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
            setProjectDialogOpen(false);
            setIsUploading(false);
        } finally {
            setIsUploading(false);
            setProjectDialogOpen(false);
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
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: selectedOption === null ? 1 : 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <Box
                                onClick={() => setSelectedOption("database")}
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
                                    src={DatabaseGif}
                                    alt='Database'
                                    width={100}
                                    height={100}
                                />
                                <Typography>Database</Typography>
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
                                src={
                                    selectedOption === "backend"
                                        ? BackendGif
                                        : selectedOption === "frontend"
                                            ? FrontendGif
                                            : DatabaseGif
                                }
                                alt='Backend'
                                width={100}
                                height={100}
                                onClick={() => setSelectedOption(null)}
                            />
                            <Typography sx={{ mt: -2, mb: 2 }}>
                                {selectedOption === "backend"
                                    ? "Backend"
                                    : selectedOption === "frontend"
                                        ? "Frontend"
                                        : "Database"}
                            </Typography>
                        </>
                    )}
                    <Box
                        sx={{ display: "flex", justifyContent: "center", gap: 2, mb: 4 }}
                    >
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
                                        <Image
                                            src={imageSrc}
                                            alt={lang}
                                            width={54}
                                            height={54}
                                            unoptimized
                                        />
                                    </Box>
                                </motion.div>
                            );
                        })}
                    </Box>
                </Box>
            )}
            {language && (
                <Box>
                    {language !== "mongodb" && (
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
                    )}

                    {language !== "mongodb" && missingFiles.length > 0 && (
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
                            {!["mongodb", "nextjs", "reactjs", "vuejs", "angularjs", "html"].includes(language) && (
                                <TextField
                                    label='Run Command'
                                    fullWidth
                                    value={runCommand}
                                    onChange={(e) => setRunCommand(e.target.value)}
                                    placeholder='e.g., node server.js'
                                    sx={{ mb: 2 }}
                                />
                            )}
                            {language !== "mongodb" && (
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
                            )}
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setProjectDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpload}
                                disabled={isUploading || !projectName}
                            >
                                {isUploading ? (
                                    <CircularProgress size={20} />
                                ) : language !== "mongodb" ? (
                                    "Upload"
                                ) : (
                                    "Create Database"
                                )}
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
