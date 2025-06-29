// ImageUpload.jsx - Updated component using ImageBB for image uploads
import { onAuthStateChanged } from "firebase/auth";
import {
    addDoc,
    collection,
    onSnapshot,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { v4 } from "uuid";
import { Button } from "../components/ui/button";
import { arrayBufferToBase64 } from "../utils/arrayBufferToBase64";
import { auth, db } from "../utils/firebase";
import { uploadToImageBB } from "../utils/uploadImage";

export default function ImageUpload() {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string>("");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    fileName: string;
  } | null>(null);
  const [recentUploads, setRecentUploads] = useState<Array<{
    name: string;
    category: string;
    timestamp: Date;
    imageUrl: string;
  }>>([]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) navigate("/admin/login");
    });
    const unsubscribe = subscribeToCategories();
    return () => {
      unsubscribe();
      unsubAuth();
    };
  }, []);

  const subscribeToCategories = () => {
    const catRef = collection(db, "categories");
    return onSnapshot(catRef, (snapshot) => {
      const catList: any[] = [];
      snapshot.forEach((doc) => {
        catList.push({ id: doc.id, ...doc.data() });
      });
      setCategories(catList);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentCategory) {
      toast.error("Please select a category first.");
      return;
    }

    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    setUploading(true);
    setUploadProgress({ current: 0, total: files.length, fileName: "" });
    const uploads: Array<{ 
      name: string; 
      category: string; 
      timestamp: Date; 
      imageUrl: string;
    }> = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({
          current: i + 1,
          total: files.length,
          fileName: file.name
        });

        // Convert file to base64 for ImageBB upload
        const buffer = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(buffer);
        
        // Upload to ImageBB
        const imageName = `${currentCategory}--${file.name.replace(/\.[^/.]+$/, "")}--${v4()}`;
        const imageUrl = await uploadToImageBB(base64, imageName);
        
        // Store metadata in Firebase
        await addDoc(collection(db, "products"), {
          name: imageName,
          originalFileName: file.name,
          category: currentCategory,
          imageUrl: imageUrl,
          fileSize: file.size,
          fileType: file.type,
          uploadedAt: new Date(),
          uploadedBy: auth.currentUser?.uid || "unknown"
        });

        uploads.push({
          name: file.name,
          category: currentCategory,
          timestamp: new Date(),
          imageUrl: imageUrl
        });
      }

      setRecentUploads(prev => [...uploads, ...prev].slice(0, 10));
      toast.success(`Successfully uploaded ${files.length} image(s) to ImageBB!`);
      // Reset the file input
      e.target.value = "";
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload some images. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // Create a fake event to reuse the upload logic
      const fakeEvent = {
        target: { files, value: "" }
      } as React.ChangeEvent<HTMLInputElement>;
      handleImageUpload(fakeEvent);
    }
  };

  return (
    <div className="min-h-screen min-w-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-center sm:text-left">
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Upload Images
                </h1>
                <p className="text-gray-600 text-base mt-2">
                  Add beautiful lehenga designs to your collection via ImageBB
                </p>
              </div>
              <Link to="/admin/dashboard">
                <Button className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 mx-auto sm:mx-0 w-fit">
                  <span className="mr-2">←</span>
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>

          {/* Category Selection */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                🏷️ Select Category
              </h2>
              <p className="text-gray-600">Choose the category for your images</p>
            </div>
            <div className="max-w-md mx-auto">
              <select
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 focus:ring-2 focus:ring-green-300 focus:border-green-400 outline-none transition-all duration-200 bg-white text-gray-800 hover:border-gray-300 text-lg"
                value={currentCategory}
                onChange={(e) => setCurrentCategory(e.target.value)}
              >
                <option value="" disabled>Choose a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {categories.length === 0 && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-amber-800 text-center">
                    No categories found.
                    <Link to="/admin/categories" className="text-amber-600 hover:text-amber-700 font-semibold ml-1">
                      Create one first →
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Upload Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                📤 Upload Images
              </h2>
              <p className="text-gray-600">Images will be uploaded to ImageBB and metadata stored in Firebase</p>
            </div>

            {!currentCategory ? (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-8 text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-xl font-semibold text-amber-800 mb-2">
                  Category Required
                </h3>
                <p className="text-amber-700">
                  Please select a category before uploading images
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Drag and Drop Area */}
                <div
                  className="border-3 border-dashed border-green-300 rounded-xl p-12 text-center bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all duration-300 cursor-pointer group"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    ☁️
                  </div>
                  <h3 className="text-2xl font-bold text-green-800 mb-2">
                    Drop images here or click to browse
                  </h3>
                  <p className="text-green-600 text-lg mb-4">
                    Selected category: <span className="font-semibold">{currentCategory}</span>
                  </p>
                  <p className="text-green-500 mb-2">
                    Images will be uploaded to ImageBB cloud storage
                  </p>
                  <p className="text-green-500 text-sm">
                    Supports JPG, PNG, GIF, and WebP formats
                  </p>
                  <input
                    id="file-input"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </div>

                {/* Alternative Upload Button */}
                <div className="text-center">
                  <Button
                    onClick={() => document.getElementById('file-input')?.click()}
                    disabled={uploading}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-8 py-4 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 text-lg"
                  >
                    <span className="mr-3">☁️</span>
                    Upload to ImageBB
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {uploading && uploadProgress && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  🚀 Uploading to ImageBB
                </h3>
                <p className="text-gray-600">
                  Processing {uploadProgress.current} of {uploadProgress.total} images
                </p>
              </div>
              <div className="max-w-lg mx-auto">
                <div className="bg-gray-200 rounded-full h-4 mb-4">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    Currently uploading: <span className="font-semibold">{uploadProgress.fileName}</span>
                  </p>
                  <div className="flex justify-center items-center space-x-2">
                    <svg
                      className="animate-spin h-6 w-6 text-blue-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    <span className="text-sm text-gray-600">Uploading to cloud...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Uploads */}
          {recentUploads.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  ✅ Recent Uploads
                </h3>
                <p className="text-gray-600">Successfully uploaded to ImageBB</p>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {recentUploads.map((upload, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <div className="text-blue-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{upload.name}</p>
                        <p className="text-sm text-gray-600">Category: {upload.category}</p>
                        <a 
                          href={upload.imageUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 truncate block max-w-xs"
                        >
                          View on ImageBB →
                        </a>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {upload.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}