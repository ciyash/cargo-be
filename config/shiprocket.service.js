import axios from "axios";

 const getShiprocketToken = async () => {
  try {
    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/auth/login",
      {
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
      },
      { timeout: 15000 }
    );

    return response.data.token;
  } catch (error) {
    console.error("Shiprocket Login Error:", error.response?.data);
    throw new Error("Unable to login to Shiprocket");
  }
};

export default getShiprocketToken
