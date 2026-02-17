import apiClient from './axiosConfig';

const getBaseUrl = (businessId) => `/${businessId}/appointments`;

export const bookAppointment = async (businessId, patientName, phoneNumber, serviceId, email, signal) => {
  const response = await apiClient.post(`${getBaseUrl(businessId)}/book`, {
    patientName,
    phoneNumber,
    serviceId,
    email,
  }, { signal });
  return response.data;
};

export const getQueue = async (businessId, signal) => {
  const response = await apiClient.get(`${getBaseUrl(businessId)}/queue?t=${Date.now()}`, { signal });
  return response.data;
};

export const moveToNext = async (businessId, signal) => {
  const response = await apiClient.post(`${getBaseUrl(businessId)}/next`, {}, { signal });
  return response.data;
};

export const getStatus = async (businessId, queueNumber, signal) => {
  const response = await apiClient.get(`${getBaseUrl(businessId)}/status/${queueNumber}`, { signal });
  return response.data;
};
