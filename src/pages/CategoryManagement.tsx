// CategoryManagement.jsx - Separate component for managing categories
import { onAuthStateChanged } from "firebase/auth";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    updateDoc,
} from "firebase/firestore";
import { deleteObject, listAll, ref, uploadBytes } from "firebase/storage";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { auth, db, storage } from "../utils/firebase";

export default function CategoryManagement() {
  const navigate = useNavigate();
  const [images, setImages] = useState<{ url: string; category: string }[]>([]);
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

  const addNewCategory = async () => {
    if (newCategory && !categories.find((cat) => cat.name === newCategory)) {
      try {
        await addDoc(collection(db, "categories"), { name: newCategory });
        setNewCategory("");
        toast.success("Category added successfully!");
      } catch (error) {
        toast.error("Failed to add category. Please try again.");
      }
    } else {
      toast.error("Category name already exists or is empty!");
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
                try {
                  await deleteDoc(doc(db, "categories", id));
                  toast.success("Category deleted.");
                } catch (error) {
                  toast.error("Failed to delete category.");
                }
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
      try {
        await updateDoc(doc(db, "categories", id), { name: newCatName });
        toast.success("Category renamed successfully!");
      } catch (error) {
        toast.error("Failed to rename category. Please try again.");
      }
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
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Category Management
                </h1>
                <p className="text-gray-600 text-base mt-2">
                  Organize your collection with custom categories
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

          {/* Stats Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 text-center transform hover:scale-105 transition-all duration-200">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                {categories.length - 1}
              </div>
              <div className="text-sm text-gray-600 mt-1 font-medium">Total Categories</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 text-center transform hover:scale-105 transition-all duration-200">
              <div className="text-3xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
                {images.length}
              </div>
              <div className="text-sm text-gray-600 mt-1 font-medium">Total Images</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 text-center transform hover:scale-105 transition-all duration-200">
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent">
                {categories.filter(cat => 
                  cat.name !== "All" && 
                  images.some(img => img.category === cat.name)
                ).length}
              </div>
              <div className="text-sm text-gray-600 mt-1 font-medium">Categories in Use</div>
            </div>
          </div>

          {/* Add New Category Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                ➕ Add New Category
              </h2>
              <p className="text-gray-600">Create a new category to organize your collection</p>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
              <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
                <input
                  className="flex-1 border-2 border-green-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-300 focus:border-green-400 outline-none transition-all duration-200 bg-white text-gray-800"
                  placeholder="Enter new category name (e.g., Wedding, Party, Traditional)"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addNewCategory()}
                />
                <Button 
                  onClick={addNewCategory}
                  disabled={!newCategory.trim()}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-3 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                >
                  <span className="mr-2">✨</span>
                  Add Category
                </Button>
              </div>
            </div>
          </div>

          {/* Category List Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                📋 Existing Categories
              </h2>
              <p className="text-gray-600">Manage your existing product categories</p>
            </div>

            {categories.filter((cat) => cat.name !== "All").length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-6">🏷️</div>
                <h3 className="text-2xl font-bold text-gray-600 mb-4">
                  No categories yet
                </h3>
                <p className="text-gray-500 text-lg max-w-md mx-auto">
                  Create your first category to start organizing your lehenga collection
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {categories
                  .filter((cat) => cat.name !== "All")
                  .map((cat) => {
                    const imageCount = images.filter((img) => img.category === cat.name).length;
                    return (
                      <div key={cat.id} className="flex flex-col lg:flex-row lg:items-center gap-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200">
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <span className="text-xl font-bold text-gray-800">
                              {cat.name}
                            </span>
                            <div className="flex gap-2">
                              <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full font-medium shadow-sm">
                                {imageCount} images
                              </span>
                              {imageCount === 0 && (
                                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full font-medium">
                                  Unused
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                            onClick={() => renameCategory(cat.id, cat.name)}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm px-5 py-2 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105"
                          >
                            ✏️ Rename
                          </Button>
                          
                          {imageCount > 0 ? (
                            <select
                              className="text-sm border-2 border-gray-200 rounded-lg px-4 py-2 bg-white text-gray-800 hover:border-gray-300 transition-all duration-200 min-w-[140px]"
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
                          ) : (
                            <Button
                              onClick={() => deleteCategory(cat.id)}
                              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm px-5 py-2 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105"
                            >
                              🗑️ Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}