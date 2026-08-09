export const WEB3FORMS_ACCESS_KEY = "e1da9865-e94c-4392-a2a1-a1dfc16e0cd1";

export async function sendWeb3Form(payload: {
  subject: string;
  name: string;
  email: string;
  message: string;
  [key: string]: string;
}): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append("access_key", WEB3FORMS_ACCESS_KEY);

    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    });

    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error("Web3Forms submission failed:", error);
    return false;
  }
}
