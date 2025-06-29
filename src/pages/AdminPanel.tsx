// Refactored AdminPanel with navigation links
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  onSnapshot,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { auth, db } from "../utils/firebase";

export default function AdminPanel() {
  const navigate = useNavigate();
  const [images, setImages] = useState<{ url: string; category: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentCategory, setCurrentCategory] = useState<string>("All");
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
        if (data.imageUrl && data.category) {
          imageData.push({
            url: data.imageUrl,
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

          {/* Quick Actions Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Link to="/admin/upload" className="block">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-white">
                <div className="text-center">
                  <div className="text-5xl mb-4">📤</div>
                  <h3 className="text-2xl font-bold mb-2">Upload Images</h3>
                  <p className="text-green-100">Add new lehenga designs to your collection</p>
                </div>
              </div>
            </Link>
            
            <Link to="/admin/categories" className="block">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-white">
                <div className="text-center">
                  <div className="text-5xl mb-4">🏷️</div>
                  <h3 className="text-2xl font-bold mb-2">Manage Categories</h3>
                  <p className="text-blue-100">Organize and manage your product categories</p>
                </div>
              </div>
            </Link>
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
                {categories.filter(cat => cat.name !== "All").length}
              </div>
              <div className="text-sm text-gray-600 mt-1 font-medium">Active Categories</div>
            </div>
          </div>

          {/* Filter Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center justify-center">
                <span className="mr-2">🔍</span>
                Filter Images
              </h3>
              <p className="text-gray-600">Filter by category and search for specific designs</p>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category Filter
                </label>
                <select
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none transition-all duration-200 bg-white text-gray-800 hover:border-gray-300"
                  value={currentCategory}
                  onChange={(e) => setCurrentCategory(e.target.value)}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Search Images
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none transition-all duration-200 bg-white text-gray-800 hover:border-gray-300"
                    placeholder="Search by keyword..."
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
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                  </div>
                </div>
              ))}
            </div>

            {/* No Results */}
            {filteredImages.length === 0 && (
              <div className="text-center py-16">
                <div className="text-6xl mb-6">📷</div>
                <h3 className="text-2xl font-bold text-gray-600 mb-4">
                  No images found
                </h3>
                <p className="text-gray-500 text-lg max-w-md mx-auto mb-8">
                  {images.length === 0 
                    ? "Upload some beautiful lehenga images to get started with your collection" 
                    : "Try adjusting your search terms or category filter to find what you're looking for"
                  }
                </p>
                {images.length === 0 && (
                  <Link to="/admin/upload">
                    <Button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-8 py-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105">
                      <span className="mr-2">✨</span>
                      Upload Your First Image
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}