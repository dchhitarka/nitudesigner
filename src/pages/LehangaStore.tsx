/* Full updated component with category deletion and renaming */
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  listAll,
  ref,
  uploadBytes,
} from "firebase/storage";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import Modal from "react-modal";
import { v4 } from "uuid";
import { Button } from "../components/ui/button";
import { auth, db, storage } from "../utils/firebase";

export default function LehangaStore() {
  const [images, setImages] = useState<{ url: string; category: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem("favorites") || "[]")
  );
  const [uploading, setUploading] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [currentCategory, setCurrentCategory] = useState<string>("All");
  const [newCategory, setNewCategory] = useState<string>("");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([
    { id: "all", name: "All" },
  ]);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loginInfo, setLoginInfo] = useState<{
    email: string;
    password: string;
  }>({ email: "", password: "" });

  const fetchImages = async () => {
    const imageListRef = ref(storage, "lehangaImages/");
    const res = await listAll(imageListRef);
    const urls = await Promise.all(
      res.items.map((item) => getDownloadURL(item))
    );
    const imageData = urls.map((url) => {
      const name = decodeURIComponent(url.split("%2F")[1].split("?")[0]);
      const match = name.split("--");
      const category = match.length > 1 ? match[0] : "Other";
      return { url, category };
    });
    setImages(imageData);
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

  useEffect(() => {
    fetchImages();
    const unsubscribe = subscribeToCategories();
    onAuthStateChanged(auth, (user) => {
      setIsAdmin(!!user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(
        auth,
        loginInfo.email,
        loginInfo.password
      );
    } catch (err: unknown) {
      alert("Login failed: " + (err as Error).message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsAdmin(false);
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
      const imageRef = ref(
        storage,
        `lehangaImages/${currentCategory}--${file.name + v4()}`
      );
      await uploadBytes(imageRef, file);
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

  const toggleSelect = (url: string) => {
    setSelectedImages((prev) =>
      prev.includes(url) ? prev.filter((i) => i !== url) : [...prev, url]
    );
  };

  const toggleFavorite = (url: string) => {
    setFavorites((prev) => {
      const updated = prev.includes(url)
        ? prev.filter((i) => i !== url)
        : [...prev, url];
      localStorage.setItem("favorites", JSON.stringify(updated));
      return updated;
    });
  };

  const shareOnWhatsApp = async () => {
    const message = encodeURIComponent(
      `Hello! I'm interested in these designs: ${selectedImages.join("")}`
    );
    try {
      const statsRef = collection(db, "shares");
      await addDoc(statsRef, {
        urls: selectedImages,
        sharedAt: new Date(),
        type: "multi",
      });
    } catch (err) {
      console.error("Share tracking failed", err);
    }
    window.open(`https://wa.me/YOUR_NUMBER?text=${message}`, "_blank");
  };

  const shareSingleImage = async (url: string) => {
    const message = encodeURIComponent(
      `Hi, I'm interested in this design: ${url}`
    );
    try {
      const statsRef = collection(db, "shares");
      await addDoc(statsRef, {
        url,
        sharedAt: new Date(),
        type: "single",
      });
    } catch (err) {
      console.error("Share tracking failed", err);
    }
    window.open(`https://wa.me/YOUR_NUMBER?text=${message}`, "_blank");
  };

  const openModal = (url: string) => {
    const index = filteredImages.findIndex((img) => img.url === url);
    setCurrentIndex(index);
    setCurrentImage(url);
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setCurrentImage(null);
    setCurrentIndex(null);
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
      <div className="mb-4">
        <h2 className="text-lg font-semibold">My Favorites</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {favorites.map((url) => (
            <img
              key={url}
              src={url}
              alt="favorite"
              className="rounded shadow cursor-pointer"
              onClick={() => openModal(url)}
            />
          ))}
        </div>
      </div>
      <h1 className="text-2xl font-bold mb-4">Lehanga Collection</h1>

      {!isAdmin ? (
        <div className="space-y-2">
          <input
            type="email"
            placeholder="Email"
            className="border p-2 w-full"
            value={loginInfo.email}
            onChange={(e) =>
              setLoginInfo({ ...loginInfo, email: e.target.value })
            }
          />
          <input
            type="password"
            placeholder="Password"
            className="border p-2 w-full"
            value={loginInfo.password}
            onChange={(e) =>
              setLoginInfo({ ...loginInfo, password: e.target.value })
            }
          />
          <Button onClick={handleLogin}>Admin Login</Button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
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
          <div className="flex-grow">
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
                        {
                          images.filter((img) => img.category === cat.name)
                            .length
                        }
                        )
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
        </>
      )}

      <div className="my-4">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <div>
            <label className="mr-2 font-semibold">Browse by Category:</label>
            <select
              className="border rounded p-1"
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
              <div
                key={url}
                className={`relative border-4 ${
                  selectedImages.includes(url)
                    ? "border-green-500"
                    : "border-transparent"
                }`}
              >
                <button
                  onClick={() => toggleFavorite(url)}
                  className={`absolute top-1 left-1 text-xl ${
                    favorites.includes(url) ? "text-red-600" : "text-white"
                  }`}
                >
                  {favorites.includes(url) ? "❤️" : "🤍"}
                </button>
                {isAdmin && (
                  <div className="absolute top-1 right-1 flex gap-1">
                    <Button
                      variant="destructive"
                      onClick={() => handleImageDelete(url)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
                <div className="absolute bottom-1 right-1">
                  <Button
                    onClick={() => shareSingleImage(url)}
                    className="bg-blue-500"
                  >
                    Share
                  </Button>
                  <Button
                    onClick={() => openModal(url)}
                    className="ml-2 bg-gray-500"
                  >
                    Zoom
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {selectedImages.length > 0 && (
            <Button onClick={shareOnWhatsApp} className="mt-4 bg-green-600">
              Share Selected on WhatsApp
            </Button>
          )}
        </div>
      </div>
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel="Image Zoom"
        className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75"
      >
        <div className="bg-white p-4 rounded shadow-lg max-w-3xl">
          <div className="flex justify-between items-center mb-2">
            <Button
              disabled={currentIndex <= 0}
              onClick={() => {
                const newIndex = currentIndex - 1;
                setCurrentIndex(newIndex);
                setCurrentImage(filteredImages[newIndex].url);
              }}
            >
              Prev
            </Button>
            <Button
              disabled={currentIndex >= filteredImages.length - 1}
              onClick={() => {
                const newIndex = currentIndex + 1;
                setCurrentIndex(newIndex);
                setCurrentImage(filteredImages[newIndex].url);
              }}
            >
              Next
            </Button>
          </div>
          <img
            src={currentImage ?? ""}
            alt="Zoomed Image"
            className="max-h-[70vh] mx-auto"
          />
          <Button onClick={closeModal}>Close</Button>
        </div>
      </Modal>
    </div>
  );
}
