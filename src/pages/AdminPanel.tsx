// Copy your admin-only UI and logic from App.tsx here.
// Use onAuthStateChanged to redirect to /admin-login if not logged in.
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
import { arrayBufferToBase64 } from "../utils/arrayBufferToBase64"; // You need to create this util
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
    // eslint-disable-next-line
  }, []);

  // Fetch images from Firestore instead of Storage
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
    <div className="p-4 max-w-screen-md mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <Button onClick={handleLogout} className="bg-red-600">
          Logout
        </Button>
      </div>
      <div className="space-y-2">
        <input type="file" multiple onChange={handleImageUpload} />
        <div>
          <label className="mr-2 font-semibold">Select Category:</label>
          <select
            className="border rounded p-1"
            value={currentCategory}
            onChange={(e) => setCurrentCategory(e.target.value)}
          >
            {categories
              .filter((cat) => cat.name !== "All")
              .map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
          </select>
        </div>
      </div>
      <div className="flex-grow my-2">
        <input
          type="text"
          className="border rounded p-1 w-full"
          placeholder="Search by keyword"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div>
        <div className="flex gap-2 items-center">
          <input
            className="border p-1"
            placeholder="Add new category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
          <Button onClick={addNewCategory}>Add</Button>
        </div>
        <div>
          <h2 className="font-semibold mt-4 mb-2">Manage Categories:</h2>
          <ul className="space-y-1">
            {categories
              .filter((cat) => cat.name !== "All")
              .map((cat) => (
                <li key={cat.id} className="flex gap-2 items-center">
                  <span>
                    {cat.name} (
                    {images.filter((img) => img.category === cat.name).length})
                  </span>
                  <Button
                    onClick={() => renameCategory(cat.id, cat.name)}
                    className="text-sm"
                  >
                    Rename
                  </Button>
                  <select
                    className="text-sm border p-1"
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
                          {c.name}
                        </option>
                      ))}
                  </select>
                </li>
              ))}
          </ul>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 relative">
        {uploading && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10">
            <svg
              className="animate-spin h-8 w-8 text-blue-600 mb-2"
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
            <span className="text-md font-semibold text-gray-700">
              Uploading...
            </span>
          </div>
        )}
        {filteredImages.map(({ url }) => (
          <div key={url} className="relative border-4 border-transparent">
            <div className="absolute top-1 right-1 flex gap-1">
              <Button
                variant="destructive"
                onClick={() => handleImageDelete(url)}
              >
                Delete
              </Button>
            </div>
            <img
              src={url}
              alt="lehanga"
              className="rounded shadow cursor-pointer w-full h-48 object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
