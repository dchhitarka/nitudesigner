export const uploadToImageBB = async (
  base64: string,
  name: string
): Promise<string> => {
  const apiKey = "d022b41450faa8818ce7037492010f42"; // Replace with your actual ImageBB API key

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
    return data.data.url;
  } else {
    throw new Error("Image upload failed");
  }
};
