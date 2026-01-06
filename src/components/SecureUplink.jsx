import React, { useState, useRef } from 'react';
import { db, storage } from '../lib/firebase'; 

const SecureUplink = ({ pitchId, onClose, onUploadComplete }) => {
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isDone, setIsDone] = useState(false);
    const inputRef = useRef(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = async (file) => {
        if (file.type !== 'application/pdf') {
            window.alert("Security Protocol: Only PDF files are permitted.");
            return;
        }
        
        setUploading(true);
        
        try {
            const storageRef = storage.ref();
            const storagePath = `pitch_decks/${pitchId}/${file.name}`;
            const fileRef = storageRef.child(storagePath);
            const uploadTask = fileRef.put(file);

            uploadTask.on('state_changed', 
                (snapshot) => {
                    const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setProgress(p);
                }, 
                (error) => {
                    console.error(error);
                    window.alert("Upload Failed: " + error.message);
                    setUploading(false);
                }, 
                async () => {
                    await db.collection('pitch_submissions').doc(pitchId).update({
                        pitchDeckStoragePath: storagePath, 
                        deckUploadedAt: new Date().toISOString()
                    });
                    setUploading(false);
                    setIsDone(true);
                }
            );
        } catch (err) {
            console.error(err);
            setUploading(false);
            window.alert("Upload Error: " + err.message);
        }
    };

    const handleFinish = () => {
        if (onUploadComplete) onUploadComplete();
    };

    return (
        // Ensure full height and dark background integration
        <div className="h-full flex flex-col items-center justify-center p-6 animate-[fadeIn_0.4s_ease] bg-[#0f172a] rounded-xl">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Secure Data Uplink</h2>
                <p className="text-slate-400 text-sm">
                    Initialize transfer for Pitch ID: <span className="font-mono text-[#18B8B9]">{pitchId}</span>
                </p>
            </div>

            {!isDone ? (
                <form 
                    className={`relative w-full max-w-lg h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                        dragActive ? 'border-[#18B8B9] bg-[#18B8B9]/10' : 'border-white/20 bg-black/40 hover:border-white/40'
                    }`}
                    onDragEnter={handleDrag} 
                    onDragLeave={handleDrag} 
                    onDragOver={handleDrag} 
                    onDrop={handleDrop}
                    onClick={() => !uploading && inputRef.current.click()}
                >
                    <input 
                        ref={inputRef} 
                        type="file" 
                        className="hidden" 
                        accept=".pdf" 
                        onChange={handleChange} 
                        disabled={uploading}
                    />
                    
                    {uploading ? (
                        <div className="w-full px-10 text-center">
                            <div className="text-[#18B8B9] font-mono text-2xl font-bold mb-2">{Math.round(progress)}%</div>
                            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                <div className="bg-[#18B8B9] h-full transition-all duration-200" style={{width: `${progress}%`}}></div>
                            </div>
                            <p className="text-xs text-slate-400 mt-2 animate-pulse">Encrypting & Transmitting...</p>
                        </div>
                    ) : (
                        <>
                            <i className="fa-solid fa-cloud-arrow-up text-4xl text-slate-500 mb-4"></i>
                            <p className="text-white font-bold">Drop PDF Deck Here</p>
                            <p className="text-slate-500 text-xs mt-1">or click to browse</p>
                        </>
                    )}
                </form>
            ) : (
                <div className="text-center bg-green-500/10 border border-green-500/30 p-8 rounded-2xl w-full max-w-lg animate-[scaleIn_0.3s_ease]">
                    <i className="fa-solid fa-check-circle text-4xl text-green-500 mb-4"></i>
                    <h3 className="text-white font-bold text-lg">Transfer Complete</h3>
                    <p className="text-slate-400 text-sm mt-2">
                        The file is now on the secure server.
                    </p>
                    {/* FIXED BUTTON STYLING - Explicit Colors */}
                    <button 
                        onClick={handleFinish} 
                        className="mt-6 bg-[#18B8B9] text-black px-6 py-3 rounded-lg font-bold transition-all hover:scale-105 shadow-[0_0_15px_rgba(24,184,185,0.4)] uppercase tracking-wider text-xs"
                    >
                        Close Link & Return to Chat
                    </button>
                </div>
            )}
        </div>
    );
};

export default SecureUplink;