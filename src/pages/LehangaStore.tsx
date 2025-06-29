/* Enhanced LehangaStore with improved mobile-first styling */
import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import Modal from "react-modal";
import { Button } from "../components/ui/button";
import { db } from "../utils/firebase";

export default function LehangaStore() {
  const [images, setImages] = useState<
    { url: string; category: string; name: string }[]
  >([]);
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

  const [adminUser, setAdminUser] = useState<{
    id: string;
    number: string;
    role: string;
  } | null>(null);

  // Fetch images from Firestore
  useEffect(() => {
    const getAdminUser = async () => {
      const userRef = collection(db, "users");
      const q = query(userRef, where("role", "==", "ADMIN"));
      const querySnapshot = await getDocs(q);
      const adminUserData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as { id: string; number: string; role: string }[];
      console.log(adminUserData);

      setAdminUser(adminUserData[0]);
    };

    getAdminUser();
    const productsRef = collection(db, "products");
    const unsubImages = onSnapshot(productsRef, (snapshot) => {
      const imageData: { url: string; category: string; name: string }[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.imageUrl && data.category) {
          imageData.push({
            url: data.imageUrl,
            category: data.category,
            name: data.name,
          });
        }
      });
      setImages(imageData);
    });

    const catRef = collection(db, "categories");
    const unsubCats = onSnapshot(catRef, (snapshot) => {
      const catList: { id: string; name: string }[] = [
        { id: "all", name: "All" },
      ];
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
    // Create sharing URLs for selected images
    const shareUrls = selectedImages.map((url) => {
      const imageData = images.find((img) => img.url === url);
      if (imageData) {
        return `${window.location.origin}/shared/${encodeURIComponent(
          imageData.name
        )}`;
      }
      return url;
    });

    const message = encodeURIComponent(
      `Hello! I'm interested in these designs: \n\n${shareUrls.join("\n\n")}`
    );
    try {
      const statsRef = collection(db, "shares");
      await addDoc(statsRef, {
        urls: selectedImages,
        shareUrls,
        sharedAt: new Date(),
        type: "multi",
      });
    } catch (err) {
      console.log(err);
    }
    window.open(`https://wa.me/${adminUser?.number}?text=${message}`, "_blank");
  };

  const shareSingleImage = async (url: string) => {
    // Find the image data to get the name
    const imageData = images.find((img) => img.url === url);
    if (!imageData || !adminUser) return;

    // Create the sharing URL
    const shareUrl = `${window.location.origin}/shared/${encodeURIComponent(
      imageData.name
    )}`;

    const message = encodeURIComponent(
      `Hi, I'm interested in this design: \n\n${shareUrl}`
    );

    try {
      const statsRef = collection(db, "shares");
      await addDoc(statsRef, {
        url,
        name: imageData.name,
        shareUrl,
        sharedAt: new Date(),
        type: "single",
      });
    } catch (err) {
      console.log(err);
    }
    window.open(`https://wa.me/${adminUser.number}?text=${message}`, "_blank");
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
    console.log(img);
    const inCategory =
      currentCategory === "All" || img.category === currentCategory;
    const matchesSearch = img.url
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return inCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 min-w-screen">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-pink-700 mb-3 tracking-tight">
              Nitu Designer
            </h1>
            <p className="text-gray-600 text-sm sm:text-base max-w-2xl mx-auto">
              Explore our exclusive collection. Select your favorites and share
              with us on WhatsApp!
            </p>
          </div>

          {/* Favorites Section */}
          {favorites.length > 0 && (
            <div className="mb-8 sm:mb-10">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 text-pink-600 flex items-center gap-2">
                <span className="text-xl sm:text-2xl">❤️</span> My Favorites (
                {favorites.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {favorites.map((url) => (
                  <div
                    key={url}
                    className="aspect-square rounded-lg overflow-hidden shadow-md bg-white border border-pink-100 hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer"
                    onClick={() => openModal(url)}
                  >
                    <img
                      src={url}
                      alt="favorite"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search & Category Filters */}
          <div className="mb-6 sm:mb-8 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <input
                type="text"
                className="flex-1 text-gray-700 border border-gray-300 rounded-lg px-4 py-3 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-pink-200 focus:border-pink-300 outline-none"
                placeholder="Search designs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <label className="text-sm sm:text-base font-medium text-gray-700 whitespace-nowrap">
                  Category:
                </label>
                <select
                  className="border border-gray-300 text-gray-700 rounded-lg px-3 py-3 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-pink-200 focus:border-pink-300 outline-none min-w-0 flex-1"
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
            </div>
          </div>

          {/* Image Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
            {filteredImages.map(({ url }) => (
              <div
                key={url}
                className={`relative group cursor-pointer rounded-lg overflow-hidden shadow-md bg-white transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                  selectedImages.includes(url)
                    ? "ring-2 ring-green-400 ring-offset-2"
                    : ""
                }`}
                onClick={() => toggleSelect(url)}
              >
                {/* Image */}
                <div className="aspect-[3/4] relative">
                  <img
                    src={url}
                    alt="lehanga design"
                    className="w-full h-full object-cover"
                  />

                  {/* Selection Indicator */}
                  {selectedImages.includes(url) && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      ✓
                    </div>
                  )}

                  {/* Favorite Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(url);
                    }}
                    className="absolute top-2 left-2 text-xl sm:text-2xl transition-transform hover:scale-110 z-10"
                    aria-label="Toggle favorite"
                  >
                    {favorites.includes(url) ? "❤️" : "🤍"}
                  </button>

                  {/* Hover Overlay */}
                  <div className="absolute focus-within:opacity-100 inset-0 bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-end justify-center pb-3">
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal(url);
                        }}
                        className="bg-white text-gray-800 hover:bg-gray-100 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-auto font-medium shadow-md"
                      >
                        <span className="mr-1">🔍</span>
                        View
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          shareSingleImage(url);
                        }}
                        className="bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-auto font-medium shadow-md"
                      >
                        <span className="mr-1">📤</span>
                        Share
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* No Results Message */}
          {filteredImages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl sm:text-5xl mb-4">🔍</div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">
                No designs found
              </h3>
              <p className="text-gray-500 text-sm sm:text-base">
                Try adjusting your search or category filter
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fixed WhatsApp Share Button */}
      {selectedImages.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg z-40">
          <div className="max-w-7xl mx-auto">
            <Button
              onClick={shareOnWhatsApp}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 sm:py-4 text-sm sm:text-base rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all duration-200"
            >
              <span className="text-lg sm:text-xl">📱</span>
              Share {selectedImages.length} Selected on WhatsApp
            </Button>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel="Image Zoom"
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        overlayClassName="fixed inset-0 bg-black bg-opacity-75 z-40"
      >
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex gap-2">
              <Button
                disabled={currentIndex === null || currentIndex <= 0}
                onClick={() => {
                  if (currentIndex === null) return;
                  const newIndex = currentIndex - 1;
                  setCurrentIndex(newIndex);
                  setCurrentImage(filteredImages[newIndex].url);
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-3 py-2"
              >
                ← Previous
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
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-3 py-2"
              >
                Next →
              </Button>
            </div>
            <button
              onClick={closeModal}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-2"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-4 flex justify-center items-center bg-gray-50 max-h-[calc(90vh-100px)] overflow-auto">
            <img
              src={currentImage ?? ""}
              alt="Zoomed Design"
              className="max-w-full max-h-full object-contain rounded-lg shadow-md"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
