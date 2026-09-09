import axios from "axios";

export async function createSteadfastOrder(payload: any) {
  try {
    const response = await axios.post(
      "https://portal.steadfast.com.bd/api/v1/create_order",
      {
        invoice: payload.invoice,
        recipient_name: payload.recipientName,
        recipient_phone: payload.recipientPhone,
        recipient_address: payload.recipientAddress,
        cod_amount: payload.codAmount,
        note: "Auto Dispatched via Free Gemini SaaS"
      },
      {
        headers: {
          "Api-Key": payload.apiKey,
          "Secret-Key": payload.secretKey,
          "Content-Type": "application/json"
        }
      }
    );

    if (response.data && response.data.status === 200) {
      return { success: true, tracking_code: response.data.consignment.tracking_code };
    }
    return { success: false, error: response.data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
