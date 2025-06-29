export const uploadToImageBB = async (
  base64: string,
  name: string
): Promise<any> => {
  const apiKey = import.meta.env.VITE_IMAGE_BB_API_KEY;

  const formData = new FormData();
  formData.append("image", base64.replace(/^data:image\/\w+;base64,/, ""));

  const response = await fetch(
    `https://api.imgbb.com/1/upload?key=${apiKey}&name=${name}`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json();
  if (data.success) {
    return data.data;
  } else {
    throw new Error("Image upload failed");
  }
};
