import { useState, useEffect, useContext, useRef } from "react";
import { RxCross1 } from "react-icons/rx";
import { FaPause, FaMicrophone } from "react-icons/fa";
import { db, storage } from "../../firebase/firebase-config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useParams } from "react-router-dom";
import UserContext from "../../contexts/UserContext";

const AddAudio = ({ setAudioPage }) => {
  const { user } = useContext(UserContext);
  const { kidId } = useParams();
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [audioUrl, setAudioUrl] = useState(""); // For playback
  const [fileName, setFileName] = useState(""); // Title of the recording
  const [elapsedTime, setElapsedTime] = useState(0);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [lineHeights, setLineHeights] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false); // New state to track playback status
const [playbackProgress, setPlaybackProgress] = useState(0); // New state for playback progress
const audioRef = useRef(new Audio());
const maxDuration = 60; // Max duration in seconds

const togglePlayback = () => {
  if (audioRef.current.src) {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }
};

// Effect hook to set up and clean up audio element events
useEffect(() => {
  const audio = audioRef.current;
  
  // Function to update playback progress
  const updateProgress = () => {
    const progress = (audio.currentTime / audio.duration) * 100;
    setPlaybackProgress(progress);
  };

  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('ended', () => setIsPlaying(false)); // Reset playback state when audio ends

  return () => {
    audio.removeEventListener('timeupdate', updateProgress);
  };
}, []);

// Effect hook to update audio source and reset playback state when new audioUrl is set
useEffect(() => {
  audioRef.current.src = audioUrl;
  setIsPlaying(false);
  setPlaybackProgress(0);
}, [audioUrl]);

  useEffect(() => {
    if (navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const newRecorder = new MediaRecorder(stream);
          newRecorder.ondataavailable = event => {
            setAudioChunks(currentChunks => [...currentChunks, event.data]);
          };
          setMediaRecorder(newRecorder);
        })
        .catch(console.error);
    }
  }, []);


  useEffect(() => {
    if (audioChunks.length > 0 && !isRecording) {
      const blob = new Blob(audioChunks, { 'type' : 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    }
  }, [audioChunks, isRecording]);

  const startRecording = () => {
    if (!isRecording && mediaRecorder && mediaRecorder.state === "inactive") {
      mediaRecorder.start();
      setIsRecording(true);
      setAudioChunks([]);
      setElapsedTime(0);
      setRecordingProgress(0);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      setIsRecording(false); 
    }
  };

  useEffect(() => {
    let interval = null;
    if (isRecording) {
      interval = setInterval(() => {
        if (elapsedTime + 1 > maxDuration) {
          stopRecording(); // Stops the recording
          clearInterval(interval); // Clears the interval to prevent further updates
        } else {
          // Updates the state to reflect the new elapsed time and progress
          setElapsedTime((prevTime) => prevTime + 1);
          setRecordingProgress((elapsedTime + 1) / maxDuration * 100);
        }
      }, 1000);
    }
  
    // Cleanup function to clear the interval if the component unmounts
    // or if the recording stops before reaching the maxDuration
    return () => clearInterval(interval);
  }, [isRecording, elapsedTime, maxDuration]);

  useEffect(() => {
    const numberOfLines = Math.floor(recordingProgress * 2);
    setLineHeights(Array(numberOfLines).fill(0).map((_, i) => 50 + Math.sin((i) / 10) * 25));
  }, [recordingProgress]);

 const handleSaveRecording = async () => {
    if (!audioUrl || !fileName.trim()) return;

    setIsUploading(true);
    try {
      const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
      const storageRef = ref(storage, `users/${user.uid}/kids/${kidId}/recordings/${fileName}.mp3`);
      const uploadTaskSnapshot = await uploadBytes(storageRef, audioBlob);
      const downloadURL = await getDownloadURL(uploadTaskSnapshot.ref);

      await addDoc(collection(db, `users/${user.uid}/recordings`), {
        url: downloadURL,
        fileName: fileName,
        createdAt: serverTimestamp(),
        kidId: kidId
      });

      console.log("Audio successfully saved.");
      setAudioPage(false); // Or reset state as needed
    } catch (error) {
      console.error("Error saving audio:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const uploadAudioAndGetURL = async (audioBlob) => {
    const storageRef = ref(storage, `users/${user.uid}/kids/${kidId}/recordings/${new Date().toISOString()}.mp3`);
    const uploadTaskSnapshot = await uploadBytes(storageRef, audioBlob);
    return getDownloadURL(uploadTaskSnapshot.ref);
  };

  const saveAudioDocument = async (audioUrl) => {
    await addDoc(collection(db, `users/${user.uid}/recordings`), {
      url: audioUrl,
      createdAt: serverTimestamp(),
      // Additional metadata here
    });
  };

  
  const renderVerticalLines = () => {
    return lineHeights.slice(0, Math.floor(recordingProgress * 2)).map((height, i) => (
      <div key={i} className="vertical-line" style={{ left: `${i / 2}%`, height: `${height}%` }}></div>
    ));
  };


  const formatTime = (time) => `${Math.floor(time / 60).toString().padStart(2, '0')}:${(time % 60).toString().padStart(2, '0')}`;

  return (
    <div className="add-recording">
      <button className="close" onClick={() => setAudioPage(false)}><RxCross1 /></button>
      <h1>{isRecording ? "Įrašinėjama..." : "Pradėti įrašą"}</h1>

        {/* Playback and fileName input */}
        {!isRecording && audioUrl && (
           <input 
           id="recordingTitle"
           className="recording-title"
           type="text" 
           placeholder="Įrašo pavadinimas" 
           value={fileName} 
           onChange={(e) => setFileName(e.target.value)} 
         />
        )}
        <div className="progress">{renderVerticalLines()}</div>
        <div className="progress-time">{formatTime(elapsedTime)}</div>
      <button className="recording-button" onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? <FaPause /> : <FaMicrophone />}
      </button>
  

      {!isRecording && audioUrl && fileName.trim() && (
        <button 
          className="button-green save-recording" 
          onClick={handleSaveRecording} 
          disabled={isUploading}
        >
          {isUploading ? "Saving..." : "Save"}
        </button>
      )}
    </div>
  );
};

export default AddAudio;
