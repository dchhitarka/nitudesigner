import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { db } from "../utils/firebase";

interface ImageData {
  url: string;
  category: string;
  name: string;
  description?: string;
  price?: string;
}

export default function SharedImage() {
  const { imageName } = useParams<{ imageName: string }>();
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<{ id: string; number: string; role: string } | null>(null);

  useEffect(() => {
    const fetchImageData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch admin user for WhatsApp sharing
        const userRef = collection(db, "users");
        const adminQuery = query(userRef, where("role", "==", "ADMIN"));
        const adminSnapshot = await getDocs(adminQuery);
        const adminUserData = adminSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as { id: string; number: string; role: string }[];
        setAdminUser(adminUserData[0]);

        // Fetch image data from Firestore
        const productsRef = collection(db, "products");
        const q = query(productsRef, where("name", "==", imageName));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const data = doc.data();
          setImageData({
            url: data.imageUrl,
            category: data.category,
            name: data.name,
            description: data.description,
            price: data.price
          });
        } else {
          setError("Image not found");
        }
      } catch (err) {
        console.error("Error fetching image:", err);
        setError("Failed to load image");
      } finally {
        setLoading(false);
      }
    };

    if (imageName) {
      fetchImageData();
    }
  }, [imageName]);

  const shareOnWhatsApp = async () => {
    if (!imageData || !adminUser) return;

    const message = encodeURIComponent(
      `Hi, I'm interested in this design: \n\n${imageData.name}\n${imageData.url}`
    );

    try {
      const statsRef = collection(db, "shares");
      await addDoc(statsRef, {
        url: imageData.url,
        name: imageData.name,
        sharedAt: new Date(),
        type: "shared_page",
      });
    } catch (err) {
      console.log(err);
    }

    window.open(`https://wa.me/${adminUser?.number}?text=${message}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading image...</p>
        </div>
      </div>
    );
  }

  if (error || !imageData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Image Not Found</h1>
          <p className="text-gray-600 mb-6">{error || "The requested image could not be found."}</p>
          <Link to="/">
            <Button className="bg-pink-600 hover:bg-pink-700 text-white">
              ← Back to Store
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-pink-600 hover:text-pink-700">
              <span className="text-xl">←</span>
              <span className="font-semibold">Back to Store</span>
            </Link>
            <h1 className="text-xl font-bold text-gray-800">Nitu Designer</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <img
                src={imageData.url}
                alt={imageData.name}
                className="w-full h-auto object-cover"
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={shareOnWhatsApp}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 flex items-center justify-center gap-2"
              >
                <span className="text-lg">📱</span>
                Share on WhatsApp
              </Button>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copied to clipboard");
                }}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 flex items-center justify-center gap-2"
              >
                <span className="text-lg">🔗</span>
                Copy Link
              </Button>
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{imageData.name}</h2>
              
              {imageData.category && (
                <div className="mb-4">
                  <span className="inline-block bg-pink-100 text-pink-800 text-sm font-medium px-3 py-1 rounded-full">
                    {imageData.category}
                  </span>
                </div>
              )}

              {imageData.description && (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-600 leading-relaxed">{imageData.description}</p>
                </div>
              )}

              {imageData.price && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Price</h3>
                  <p className="text-2xl font-bold text-pink-600">{imageData.price}</p>
                </div>
              )}

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Interested in this design?</h3>
                <p className="text-gray-600 mb-4">
                  Click the "Share on WhatsApp" button to get in touch with us and discuss your requirements.
                </p>
                <Button
                  onClick={shareOnWhatsApp}
                  className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-3"
                >
                  Get Quote on WhatsApp
                </Button>
              </div>
            </div>

            {/* Related Info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Why Choose Nitu Designer?</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Custom designs tailored to your preferences
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  High-quality materials and craftsmanship
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Professional fitting and alterations
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Timely delivery and excellent customer service
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 