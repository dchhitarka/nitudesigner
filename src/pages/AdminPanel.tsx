// Enhanced AdminPanel with improved centered layout and section styling
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { deleteObject, listAll, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { v4 } from "uuid";
import { Button } from "../components/ui/button";
import { arrayBufferToBase64 } from "../utils/arrayBufferToBase64";
import { auth, db, storage } from "../utils/firebase";

export default function AdminPanel() {
  const navigate = useNavigate();
  const [images, setImages] = useState<{ url: string; category: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [currentCategory, setCurrentCategory] = useState<string>("All");
  const [newCategory, setNewCategory] = useState<string>("");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([
    { id: "all", name: "All" },
  ]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) navigate("/admin/login");
    });
    fetchImages();
    const unsubscribe = subscribeToCategories();
    return () => {
      unsubscribe();
      unsubAuth();
    };
  }, []);

  const fetchImages = async () => {
    const productsRef = collection(db, "products");
    onSnapshot(productsRef, (snapshot) => {
      const imageData: { url: string; category: string }[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.image && data.category) {
          imageData.push({
            url: `data:image/jpeg;base64,${data.image}`,
            category: data.category,
          });
        }
      });
      setImages(imageData);
    });
  };

  const subscribeToCategories = () => {
    const catRef = collection(db, "categories");
    return onSnapshot(catRef, (snapshot) => {
      const catList: any[] = [{ id: "all", name: "All" }];
      snapshot.forEach((doc) => {
        catList.push({ id: doc.id, ...doc.data() });
      });
      setCategories(catList);
    });
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/admin/login");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentCategory || currentCategory === "All") {
      alert("Please select a valid category.");
      return;
    }
    setUploading(true);
    const files = e.target.files;
    if (!files) {
      return;
    }
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      await addDoc(collection(db, "products"), {
        name: `${currentCategory}--${file.name + v4()}`,
        category: currentCategory,
        image: base64,
      });
    }
    fetchImages();
    setUploading(false);
  };

  const handleImageDelete = async (url: string) => {
    const imageRef = ref(
      storage,
      decodeURIComponent(url.split("/o/")[1].split("?alt")[0])
    );
    await deleteObject(imageRef);
    fetchImages();
  };

  const addNewCategory = async () => {
    if (newCategory && !categories.find((cat) => cat.name === newCategory)) {
      await addDoc(collection(db, "categories"), { name: newCategory });
      setNewCategory("");
    }
  };

  const deleteCategory = async (
    id: string,
    targetCategoryId: string | null = null
  ) => {
    const categoryDoc = categories.find((c) => c.id === id);
    const categoryName = categoryDoc?.name;
    const usedInImages = images.some((img) => img.category === categoryName);

    if (usedInImages) {
      if (!targetCategoryId) {
        toast.error("Select a category to move images before deletion.");
        return;
      }

      const targetCategory = categories.find(
        (cat) => cat.id === targetCategoryId
      );
      if (!targetCategory) {
        toast.error("Target category not found.");
        return;
      }

      toast.loading("Migrating images...");
      const imageListRef = ref(storage, "lehangaImages/");
      const res = await listAll(imageListRef);
      for (const item of res.items) {
        const fileName = decodeURIComponent(item.name);
        if (fileName.startsWith(`${categoryName}--`)) {
          const newFileName = fileName.replace(
            `${categoryName}--`,
            `${targetCategory.name}--`
          );
          const newRef = ref(storage, `lehangaImages/${newFileName}`);
          const blob = await item
            .getDownloadURL()
            .then((url: string) => fetch(url))
            .then((res: Response) => res.blob());
          await uploadBytes(newRef, blob);
          await deleteObject(item);
        }
      }
      toast.dismiss();
      toast.success("Images moved successfully.");
    }

    toast(
      (t) => (
        <span>
          Are you sure you want to delete this category?
          <div className="mt-2 flex gap-2">
            <button
              className="bg-red-600 text-white px-3 py-1 rounded"
              onClick={async () => {
                toast.dismiss(t.id);
                await deleteDoc(doc(db, "categories", id));
                fetchImages();
                toast.success("Category deleted.");
              }}
            >
              Yes, Delete
            </button>
            <button
              className="bg-gray-300 px-3 py-1 rounded"
              onClick={() => toast.dismiss(t.id)}
            >
              Cancel
            </button>
          </div>
        </span>
      ),
      { duration: Infinity }
    );
  };

  const renameCategory = async (id: string, newName: string) => {
    const newCatName = prompt("Enter new category name:", newName);
    if (newCatName && newCatName !== newName) {
      await updateDoc(doc(db, "categories", id), { name: newCatName });
    }
  };

  const filteredImages = images.filter((img) => {
    const inCategory =
      currentCategory === "All" || img.category === currentCategory;
    const matchesSearch = img.url
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return inCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 min-w-screen">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-full mx-auto">
          {/* Header Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-center sm:text-left">
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
                <p className="text-gray-600 text-base mt-2">
                  Manage your lehenga collection and categories with ease
                </p>
              </div>
              <Button 
                onClick={handleLogout} 
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 mx-auto sm:mx-0 w-fit"
              >
                <span className="mr-2">🚪</span>
                Logout
              </Button>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 text-center transform hover:scale-105 transition-all duration-200">
              <div className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-pink-600 bg-clip-text text-transparent">
                {images.length}
              </div>
              <div className="text-sm text-gray-600 mt-1 font-medium">Total Images</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 text-center transform hover:scale-105 transition-all duration-200">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                {categories.length - 1}
              </div>
              <div className="text-sm text-gray-600 mt-1 font-medium">Categories</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 text-center transform hover:scale-105 transition-all duration-200">
              <div className="text-3xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
                {filteredImages.length}
              </div>
              <div className="text-sm text-gray-600 mt-1 font-medium">Filtered</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 text-center transform hover:scale-105 transition-all duration-200">
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent">
                {selectedImages.length}
              </div>
              <div className="text-sm text-gray-600 mt-1 font-medium">Selected</div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                📤 Upload New Images
              </h2>
              <p className="text-gray-600">Add beautiful lehenga designs to your collection</p>
            </div>
            
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Select Category
                  </label>
                  <select
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none transition-all duration-200 bg-white text-gray-800 hover:border-gray-300"
                    value={currentCategory}
                    onChange={(e) => setCurrentCategory(e.target.value)}
                  >
                    <option value="All" disabled>Choose a category</option>
                    {categories
                      .filter((cat) => cat.name !== "All")
                      .map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Choose Images
                  </label>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-pink-50 file:to-purple-50 file:text-pink-700 hover:file:from-pink-100 hover:file:to-purple-100 transition-all duration-200 bg-white text-gray-800 hover:border-gray-300"
                    disabled={currentCategory === "All" || !currentCategory}
                  />
                </div>
              </div>
              {(currentCategory === "All" || !currentCategory) && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">⚠️</span>
                    <p className="text-amber-800 font-medium">
                      Please select a valid category before uploading images
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Category Management Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                🏷️ Category Management
              </h2>
              <p className="text-gray-600">Organize your collection with custom categories</p>
            </div>
            
            {/* Add New Category */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 mb-6 border border-green-200">
              <h3 className="font-semibold text-green-800 mb-4 flex items-center">
                <span className="mr-2">➕</span>
                Add New Category
              </h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  className="flex-1 border-2 border-green-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-300 focus:border-green-400 outline-none transition-all duration-200 bg-white text-gray-800"
                  placeholder="Enter new category name (e.g., Wedding, Party, Traditional)"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
                <Button 
                  onClick={addNewCategory}
                  disabled={!newCategory.trim()}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                >
                  <span className="mr-2">✨</span>
                  Add Category
                </Button>
              </div>
            </div>

            {/* Category List */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 text-lg flex items-center">
                <span className="mr-2">📋</span>
                Existing Categories
              </h3>
              <div className="grid gap-4">
                {categories
                  .filter((cat) => cat.name !== "All")
                  .map((cat) => (
                    <div key={cat.id} className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                      <div className="flex-1">
                        <span className="font-semibold text-gray-800 text-lg">
                          {cat.name}
                        </span>
                        <span className="ml-3 text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                          {images.filter((img) => img.category === cat.name).length} images
                        </span>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => renameCategory(cat.id, cat.name)}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm px-4 py-2 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105"
                        >
                          ✏️ Rename
                        </Button>
                        <select
                          className="text-sm border-2 border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800 hover:border-gray-300 transition-all duration-200"
                          onChange={(e) => deleteCategory(cat.id, e.target.value)}
                          defaultValue=""
                        >
                          <option disabled value="">
                            Move & Delete
                          </option>
                          {categories
                            .filter((c) => c.id !== cat.id && c.name !== "All")
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                Move to {c.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Search Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center justify-center">
                <span className="mr-2">🔍</span>
                Search Images
              </h3>
              <p className="text-gray-600">Find specific lehenga designs quickly</p>
            </div>
            <div className="relative max-w-2xl mx-auto">
              <input
                type="text"
                className="w-full border-2 border-gray-200 rounded-xl px-6 py-4 text-base focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none transition-all duration-200 bg-white text-gray-800 hover:border-gray-300 shadow-inner"
                placeholder="Search images by keyword, category, or style..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Image Grid Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2 flex items-center justify-center">
                <span className="mr-2">🖼️</span>
                Image Gallery
              </h3>
              <p className="text-gray-600">
                {filteredImages.length > 0 
                  ? `Showing ${filteredImages.length} of ${images.length} images`
                  : "No images to display"
                }
              </p>
            </div>

            <div className="relative">
              {uploading && (
                <div className="absolute inset-0 bg-white bg-opacity-95 flex flex-col items-center justify-center z-10 rounded-xl">
                  <div className="bg-white rounded-xl p-8 shadow-2xl border border-gray-200">
                    <svg
                      className="animate-spin h-12 w-12 text-pink-600 mb-4 mx-auto"
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
                    <span className="text-xl font-bold text-gray-700 block text-center">
                      Uploading images...
                    </span>
                    <span className="text-sm text-gray-500 mt-2 block text-center">
                      Please wait while we process your beautiful designs
                    </span>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredImages.map(({ url, category }) => (
                  <div 
                    key={url} 
                    className="group relative bg-white rounded-xl overflow-hidden shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    {/* Image */}
                    <div className="aspect-[3/4] relative">
                      <img
                        src={url}
                        alt="lehenga design"
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Category Badge */}
                      <div className="absolute top-3 left-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg">
                        {category}
                      </div>
                      
                      {/* Delete Button */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <Button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this image?')) {
                              handleImageDelete(url);
                            }
                          }}
                          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs px-3 py-2 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-110"
                        >
                          🗑️
                        </Button>
                      </div>
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                    </div>
                  </div>
                ))}
              </div>

              {/* No Results */}
              {filteredImages.length === 0 && !uploading && (
                <div className="text-center py-16">
                  <div className="text-6xl mb-6">📷</div>
                  <h3 className="text-2xl font-bold text-gray-600 mb-4">
                    No images found
                  </h3>
                  <p className="text-gray-500 text-lg max-w-md mx-auto">
                    {images.length === 0 
                      ? "Upload some beautiful lehenga images to get started with your collection" 
                      : "Try adjusting your search terms or category filter to find what you're looking for"
                    }
                  </p>
                  {images.length === 0 && (
                    <div className="mt-8">
                      <Button
                        onClick={() => document.querySelector('input[type="file"]')?.click()}
                        className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-8 py-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
                      >
                        <span className="mr-2">✨</span>
                        Upload Your First Image
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}