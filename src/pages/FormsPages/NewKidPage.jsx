import { motion } from "framer-motion";
import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AiOutlineArrowLeft } from "react-icons/ai";

import { readAndCompressImage } from 'browser-image-resizer';
import { doc, setDoc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase-config';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection } from 'firebase/firestore';

import Footer from "../../components/General/Footer";
import ImageUploader from "../../components/LandingPage/ImageUploader";
import { useLocalStorage } from '../../utils/localStorage';

import UserContext from "../../contexts/UserContext";
import KidsContext from "../../contexts/KidsContext";

const NewKidPage = () => {
  const {user} = useContext(UserContext)
  const {setKidsData} = useContext(KidsContext)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const [kidData, setKidData] = useLocalStorage('kidData', {
    name: '',
    birthDate: '',
    height: '',
    weight: '',
    image: '',
  });
  const canSubmit = (file || previewUrl) && !isSubmitting;

  const navigate = useNavigate();

  const urlToBlob = async (url) => {
    try {
      const response = await fetch(url);
  
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
  
      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('Error fetching image:', error.message); // Log the error message
      return null;
    }
  };
  
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
  
    const newKidData = {
      name: kidData.name,
      birthDate: kidData.birthDate,
      height: kidData.height,
      weight: kidData.weight,
      image: '', // Placeholder for the image URL
    };
  
    const imageConfig = {
      quality: 0.7,
      maxWidth: 800,
      maxHeight: 800,
      autoRotate: true,
      debug: true,
    };
  
    const userId = user.uid;
  
    try {
      // Add the kid to Firestore first without the kidId
      const kidDocRef = await addDoc(collection(db, 'users', userId, 'kids'), newKidData);
      const kidId = kidDocRef.id; // This is the auto-generated unique ID for the kid by Firestore
  
      if (file || previewUrl) {
        let uploadFile;
  
        if (file) {
          uploadFile = file;
        } else if (previewUrl) {
          const imageBlob = await urlToBlob(previewUrl);
          if (!imageBlob) throw new Error('Image blob is null');
          uploadFile = new File([imageBlob], 'filename.jpg', { type: imageBlob.type });
        }
  
        const resizedImage = await readAndCompressImage(uploadFile, imageConfig);
        const storageRef = ref(getStorage(), `users/${userId}/kids/${kidId}/profile-image/${uploadFile.name}`);
        await uploadBytes(storageRef, resizedImage);
        newKidData.image = await getDownloadURL(storageRef);
      }
  
      // Update the kid's Firestore document with the image URL and include kidId
      await updateDoc(kidDocRef, {
        ...newKidData,
        kidId: kidId // Including the kidId in the document data
      });
  
      // Update local state to reflect the new data including the kidId
      setKidsData((prevKidsData) => [...prevKidsData, { ...newKidData, id: kidId }]);
  
      // Clear form data and local storage
      setKidData({
        name: '',
        birthDate: '',
        height: '',
        weight: '',
        image: '',
      });
      setFile(null);
      setPreviewUrl(null);
      localStorage.removeItem('kidData');
      localStorage.removeItem('profileImage');
  
      navigate('/kids');
    } catch (error) {
      console.error('Error saving data or uploading image:', error);
      // Handle errors appropriately
    } finally {
      setIsSubmitting(false);
    }
  };
  

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setKidData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const selectedFile = e.target.files[0];
  
    if (selectedFile && selectedFile instanceof Blob && selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        localStorage.setItem('profileImage', dataUrl);
        setPreviewUrl(dataUrl);
        setFile(selectedFile);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      console.error('The selected file is not a valid image or no file was selected.');
    }
  };

  useEffect(() => {
    const localKidData = JSON.parse(localStorage.getItem('kidData'));
    const localProfileImage = localStorage.getItem('profileImage');

    if (localKidData) {
      setKidData(localKidData);
    }
    if (localProfileImage) {
      setPreviewUrl(localProfileImage);
    }
  }, []);

  return (
    <>
      <header className="registration-header new-kid">
        <Link to="/kids"><AiOutlineArrowLeft/></Link>
      </header>
      <motion.main 
         initial={{ opacity: 0, y: 30}}
         animate={{ opacity: 1, y: 0}}
         transition={{
           duration: 1,
           ease: [0, 0.71, 0.2, 1.01]
         }}
      className="registration-main new-kid-main">
        <h1>Vaiko duomenys</h1>
        <form className="new-kid-form" onSubmit={handleSubmit}>
          {/* Use the ImageUploader component here */}
          <ImageUploader previewUrl={previewUrl} handleImageChange={handleImageChange} />
          <input
            type="text"
            name="name"
            placeholder="Vardas Pavardė"
            value={kidData.name}
            onChange={handleInputChange}
            required
          />
          <input
            type={isFocused || kidData.birthDate ? 'date' : 'text'}
            name="birthDate"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={handleInputChange}
            value={kidData.birthDate || ''}
            placeholder="Gimimo data"
            className="date-input"
            required
          />
          <input
            type="number"
            name="height"
            step="any"
            min="0"
            placeholder="Ūgis (cm)"
            value={kidData.height}
            onChange={handleInputChange}
            required
          />
          <input
            type="number"
            name="weight"
            step="any"
            min="0"
            placeholder="Svoris (kg)"
            value={kidData.weight}
            onChange={handleInputChange}
            required
          />
          <button type="submit" className="button-green" disabled={!canSubmit}>
            IŠSAUGOTI
          </button>
        </form>
      </motion.main>
      <Footer />
    </>
  );
};

export default NewKidPage;
