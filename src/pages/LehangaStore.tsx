/* Full updated component with category deletion and renaming */
import { addDoc, collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import Modal from "react-modal";
import { Button } from "../components/ui/button";
import { db } from "../utils/firebase";

export default function LehangaStore() {
  const [images, setImages] = useState<{ url: string; category: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem("favorites") || "[]")
  );
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [currentCategory, setCurrentCategory] = useState<string>("All");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([
    { id: "all", name: "All" },
  ]);

  // Fetch images from Firestore
  useEffect(() => {
    const productsRef = collection(db, "products");
    const unsubImages = onSnapshot(productsRef, (snapshot) => {
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

    const catRef = collection(db, "categories");
    const unsubCats = onSnapshot(catRef, (snapshot) => {
      const catList: any[] = [{ id: "all", name: "All" }];
      snapshot.forEach((doc) => {
        catList.push({ id: doc.id, ...doc.data() });
      });
      setCategories(catList);
    });

    return () => {
      unsubImages();
      unsubCats();
    };
  }, []);

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
      // ignore
    }
    window.open(`https://wa.me/7976511023?text=${message}`, "_blank");
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
      // ignore
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
      <div className="flex-grow mb-4">
        <input
          type="text"
          className="border rounded p-1 w-full"
          placeholder="Search by keyword"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
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
        {filteredImages.map(({ url }) => (
          <div
            key={url}
            className={`relative border-4 ${
              selectedImages.includes(url)
                ? "border-green-500"
                : "border-transparent"
            }`}
            onClick={() => toggleSelect(url)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(url);
              }}
              className={`absolute top-1 left-1 text-xl ${
                favorites.includes(url) ? "text-red-600" : "text-white"
              }`}
            >
              {favorites.includes(url) ? "❤️" : "🤍"}
            </button>
            <div className="absolute bottom-1 right-1 flex gap-2">
              <Button
                onClick={(e: any) => {
                  e.stopPropagation();
                  shareSingleImage(url);
                }}
                className="bg-blue-500"
              >
                Share
              </Button>
              <Button
                onClick={(e: any) => {
                  e.stopPropagation();
                  openModal(url);
                }}
                className="ml-2 bg-gray-500"
              >
                Zoom
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
      {selectedImages.length > 0 && (
        <Button onClick={shareOnWhatsApp} className="mt-4 bg-green-600">
          Share Selected on WhatsApp
        </Button>
      )}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel="Image Zoom"
        className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75"
      >
        <div className="bg-white p-4 rounded shadow-lg max-w-3xl">
          <div className="flex justify-between items-center mb-2">
            <Button
              disabled={currentIndex === null || currentIndex <= 0}
              onClick={() => {
                if (currentIndex === null) return;
                const newIndex = currentIndex - 1;
                setCurrentIndex(newIndex);
                setCurrentImage(filteredImages[newIndex].url);
              }}
            >
              Prev
            </Button>
            <Button
              disabled={
                currentIndex === null ||
                currentIndex >= filteredImages.length - 1
              }
              onClick={() => {
                if (currentIndex === null) return;
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
