import axios from "axios";

export const predictPet = (formData) =>
  axios.post("http://localhost:5000/api/ai/predict", formData);

export const registerPet = (data) =>
  axios.post("http://localhost:5000/api/pets/register", data);

export const login = (data) =>
  axios.post("http://localhost:5000/api/auth/login", data);

export const getPetsByPhone = (phone) =>
  axios.get(`http://localhost:5000/api/pets/owner/${phone}`);

export const setPetLostStatus = (id, isLost, location) =>
  axios.post(`http://localhost:5000/api/pets/${id}/lost`, { isLost, location });

export const findVets = (lat, lng) =>
  axios.post('http://localhost:5000/api/find-vets', { lat, lng });

export const findCreches = (lat, lng) =>
  axios.post('http://localhost:5000/api/find-creches', { lat, lng });

export const grokAnalysis = (pet) =>
  axios.post('http://localhost:5000/api/grok/analysis', { pet });

export const grokChat = (message, pet) =>
  axios.post('http://localhost:5000/api/grok/chat', { message, pet });

